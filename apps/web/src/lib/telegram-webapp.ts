import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '@pingo/shared';

/**
 * Telegram Mini App auth.
 *
 * 1. The page inside Telegram sends `window.Telegram.WebApp.initData` to us.
 * 2. We verify its HMAC signature with the bot token (Telegram spec).
 * 3. We answer with a short-lived signed token the Mini App then sends as
 *    `Authorization: Bearer <token>` to the regular REST API.
 */

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type VerifiedInitData = {
  user: TelegramWebAppUser;
  authDate: Date;
  startParam?: string;
};

const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

export function verifyTelegramInitData(
  initData: string,
  botToken = process.env.TELEGRAM_BOT_TOKEN,
  now = Date.now(),
): VerifiedInitData {
  if (!botToken) throw new AppError('Telegram is not configured', 'TELEGRAM_DISABLED', 503);
  if (!initData || initData.length > 8192) throw unauthorized();

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw unauthorized();
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!safeEqualHex(expected, hash)) throw unauthorized();

  const authDateRaw = Number(params.get('auth_date'));
  if (!Number.isFinite(authDateRaw)) throw unauthorized();
  if (now / 1000 - authDateRaw > INIT_DATA_MAX_AGE_SECONDS) {
    throw new AppError('Telegram session expired. Reopen the app.', 'UNAUTHORIZED', 401);
  }

  const userRaw = params.get('user');
  if (!userRaw) throw unauthorized();
  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    throw unauthorized();
  }
  if (typeof user.id !== 'number') throw unauthorized();

  return {
    user,
    authDate: new Date(authDateRaw * 1000),
    startParam: params.get('start_param') ?? undefined,
  };
}

export type WebAppTokenPayload = { userId: string; telegramUserId: string; exp: number };

export function signWebAppToken(
  payload: Omit<WebAppTokenPayload, 'exp'>,
  secret = tokenSecret(),
  now = Date.now(),
): string {
  const body: WebAppTokenPayload = {
    ...payload,
    exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyWebAppToken(
  token: string | null | undefined,
  secret = tokenSecret(),
  now = Date.now(),
): WebAppTokenPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  if (!safeEqualHex(sign(encoded, secret), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as WebAppTokenPayload;
    if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

function tokenSecret(): string {
  const secret = process.env.APP_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('APP_SECRET is not set');
  return `${secret}:telegram-webapp`;
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function unauthorized() {
  return new AppError('Invalid Telegram data', 'UNAUTHORIZED', 401);
}
