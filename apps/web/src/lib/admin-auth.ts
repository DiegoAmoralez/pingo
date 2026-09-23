import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Admin panel access (/admin) is separate from user accounts: a single
 * login/password pair from the environment and a signed, http-only cookie.
 */
export const ADMIN_COOKIE = 'pingo_admin';
const SESSION_TTL_SECONDS = 12 * 60 * 60;

type AdminSession = { login: string; exp: number };

export function isAdminPanelConfigured(): boolean {
  return Boolean(process.env.ADMIN_PANEL_LOGIN && process.env.ADMIN_PANEL_PASSWORD);
}

export function verifyAdminCredentials(login: string, password: string): boolean {
  const expectedLogin = process.env.ADMIN_PANEL_LOGIN;
  const expectedPassword = process.env.ADMIN_PANEL_PASSWORD;
  if (!expectedLogin || !expectedPassword) return false;
  // Compare both fields every time so timing does not leak which one failed.
  const loginOk = safeEqual(login, expectedLogin);
  const passwordOk = safeEqual(password, expectedPassword);
  return loginOk && passwordOk;
}

export async function createAdminSession(login: string): Promise<void> {
  const session: AdminSession = { login, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(session)).toString('base64url');
  const token = `${encoded}.${sign(encoded)}`;
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature || !safeEqual(sign(encoded), signature)) return null;
  try {
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as AdminSession;
    if (typeof session.login !== 'string' || typeof session.exp !== 'number') return null;
    if (session.exp * 1000 < Date.now()) return null;
    // Rotating the login in env invalidates existing sessions.
    if (session.login !== process.env.ADMIN_PANEL_LOGIN) return null;
    return session;
  } catch {
    return null;
  }
}

function secret(): string {
  const value = process.env.APP_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error('APP_SECRET is not set');
  return `${value}:admin-panel`;
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
