import { NextResponse } from 'next/server';
import { AppError } from '@pingo/shared';
import { getRedis } from '@pingo/shared/redis';
import { prisma } from '@pingo/database';
import { auth } from './auth';
import { bearerToken, verifyWebAppToken } from './telegram-webapp';
import { ZodError } from 'zod';

export type ApiUser = { id: string; email: string; name: string };

/**
 * Resolves the caller: a normal browser session (better-auth cookie) or a
 * Telegram Mini App token passed as `Authorization: Bearer`.
 */
export async function getApiUser(request: Request): Promise<ApiUser> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user) {
    return { id: session.user.id, email: session.user.email, name: session.user.name };
  }

  const token = bearerToken(request);
  const payload = token ? verifyWebAppToken(token) : null;
  if (payload) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, telegram: { select: { telegramUserId: true } } },
    });
    // The token stays valid only while this Telegram account is still linked.
    if (user && user.telegram?.telegramUserId === payload.telegramUserId) {
      return { id: user.id, email: user.email, name: user.name };
    }
  }

  throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Invalid input', code: 'VALIDATION', details: error.flatten() },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return NextResponse.json({ error: message, code: 'INTERNAL' }, { status: 500 });
}

export async function rateLimit(key: string, limit: number, windowSec: number) {
  const redis = getRedis();
  const now = Date.now();
  const bucket = `rl:${key}`;
  const count = await redis.incr(bucket);
  if (count === 1) {
    await redis.expire(bucket, windowSec);
  }
  if (count > limit) {
    throw new AppError('Too many requests', 'RATE_LIMIT', 429);
  }
  return { remaining: Math.max(0, limit - count), resetAt: now + windowSec * 1000 };
}
