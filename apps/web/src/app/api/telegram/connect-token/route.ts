import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { TELEGRAM_TOKEN_TTL_MINUTES } from '@pingo/shared';
import { telegramDeepLink } from '@pingo/notifications';
import { getApiUser, jsonError, rateLimit } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    await rateLimit(`tg-token:${user.id}`, 5, 60);
    const token = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await prisma.telegramConnectToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TELEGRAM_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });
    return NextResponse.json({ url: telegramDeepLink(token) });
  } catch (error) {
    return jsonError(error);
  }
}
