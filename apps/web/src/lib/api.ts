import { NextResponse } from 'next/server';
import { AppError } from '@pingo/shared';
import { getRedis } from '@pingo/shared/redis';
import { auth } from './auth';
import { ZodError } from 'zod';

export async function getApiUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
  }
  return session.user;
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
