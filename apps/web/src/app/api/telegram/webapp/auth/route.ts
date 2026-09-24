import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@pingo/database';
import { getUserPlan } from '@pingo/core';
import { AppError } from '@pingo/shared';
import { jsonError, rateLimit } from '@/lib/api';
import { isMaintenanceEnabled } from '@/lib/maintenance';
import { signWebAppToken, verifyTelegramInitData } from '@/lib/telegram-webapp';
import { isLocale, type Locale } from '@/lib/i18n';

export const runtime = 'nodejs';

const bodySchema = z.object({ initData: z.string().min(1).max(8192) });

function localeFrom(value: string | undefined | null): Locale {
  if (isLocale(value)) return value;
  return value?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

/**
 * Bootstraps the Mini App: verifies Telegram's signed initData and, when the
 * Telegram account is linked to a PingoGo user, returns an API token.
 */
export async function POST(request: Request) {
  try {
    if (await isMaintenanceEnabled()) {
      throw new AppError('Site is under maintenance', 'MAINTENANCE', 503);
    }
    const { initData } = bodySchema.parse(await request.json());
    const verified = verifyTelegramInitData(initData);
    const telegramUserId = String(verified.user.id);
    await rateLimit(`tg-webapp-auth:${telegramUserId}`, 30, 60);

    const connection = await prisma.telegramConnection.findFirst({
      where: { telegramUserId },
      include: { user: true },
    });

    if (!connection) {
      return NextResponse.json({
        status: 'unlinked',
        locale: localeFrom(verified.user.language_code),
        startParam: verified.startParam ?? null,
      });
    }

    const plan = await getUserPlan(connection.userId);
    return NextResponse.json({
      status: 'linked',
      token: signWebAppToken({ userId: connection.userId, telegramUserId }),
      locale: localeFrom(connection.locale),
      startParam: verified.startParam ?? null,
      user: {
        name: connection.user.name,
        email: connection.user.email,
        timezone: connection.user.timezone,
      },
      plan,
    });
  } catch (error) {
    return jsonError(error);
  }
}
