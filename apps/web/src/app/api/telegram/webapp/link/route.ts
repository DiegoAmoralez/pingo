import { NextResponse } from 'next/server';
import { z } from 'zod';
import { APIError } from 'better-auth/api';
import { prisma } from '@pingo/database';
import { getUserPlan } from '@pingo/core';
import { AppError, emailSchema, trackEvent } from '@pingo/shared';
import { auth } from '@/lib/auth';
import { jsonError, rateLimit } from '@/lib/api';
import { signWebAppToken, verifyTelegramInitData } from '@/lib/telegram-webapp';
import { isLocale, type Locale } from '@/lib/i18n';

export const runtime = 'nodejs';

const bodySchema = z.object({
  initData: z.string().min(1).max(8192),
  email: emailSchema,
  password: z.string().min(1).max(128),
  locale: z.string().optional(),
});

/**
 * Signs a PingoGo user in from inside the Mini App (email + password) and links
 * the verified Telegram account to it. Equivalent to "Connect Telegram" on the web.
 */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const verified = verifyTelegramInitData(body.initData);
    const telegramUserId = String(verified.user.id);
    await rateLimit(`tg-webapp-link:${telegramUserId}`, 8, 300);

    let userId: string;
    try {
      const result = await auth.api.signInEmail({
        body: { email: body.email, password: body.password },
        headers: request.headers,
      });
      userId = result.user.id;
    } catch (error) {
      if (error instanceof APIError) {
        throw new AppError(error.message || 'Invalid email or password', 'UNAUTHORIZED', error.statusCode || 401);
      }
      throw error;
    }

    const locale: Locale = isLocale(body.locale)
      ? body.locale
      : verified.user.language_code?.toLowerCase().startsWith('ru')
        ? 'ru'
        : 'en';

    // Private chat id equals the user id, which is what alerts are sent to.
    const connection = await prisma.telegramConnection.upsert({
      where: { userId },
      create: {
        userId,
        telegramUserId,
        telegramChatId: telegramUserId,
        username: verified.user.username ?? null,
        locale,
      },
      update: {
        telegramUserId,
        telegramChatId: telegramUserId,
        username: verified.user.username ?? null,
        locale,
        connectedAt: new Date(),
      },
      include: { user: true },
    });
    await trackEvent('telegram_connected', { source: 'mini_app' }, userId);

    return NextResponse.json({
      status: 'linked',
      token: signWebAppToken({ userId, telegramUserId }),
      locale,
      startParam: verified.startParam ?? null,
      user: {
        name: connection.user.name,
        email: connection.user.email,
        timezone: connection.user.timezone,
      },
      plan: await getUserPlan(userId),
    });
  } catch (error) {
    return jsonError(error);
  }
}
