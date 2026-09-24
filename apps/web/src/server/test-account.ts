import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@pingo/database';
import { createMonitor } from '@pingo/core';
import { TELEGRAM_TOKEN_TTL_MINUTES, logger } from '@pingo/shared';
import { telegramDeepLink } from '@pingo/notifications';

/**
 * Internal QA account for the admin incident simulator. Lives in the real
 * database like any customer, so alerts go through the normal pipeline, but
 * it is created on demand from /admin and never through public sign-up.
 */
export const TEST_ACCOUNT_EMAIL = 'qa@pingogo.internal';
const TEST_ACCOUNT_ID = 'qa-user-pingogo';
const TEST_ACCOUNT_NAME = 'PingoGo QA';
const TEST_MONITOR_URLS = ['https://www.pingogo.eu', 'https://example.com', 'https://github.com'];

export function isTestAccount(email: string): boolean {
  return email.toLowerCase() === TEST_ACCOUNT_EMAIL;
}

export type EnsureTestAccountResult = {
  created: boolean;
  userId: string;
  email: string;
  /** Only returned when the account (or its credential) was just created. */
  password: string | null;
  monitorsAdded: string[];
};

function generatePassword(): string {
  // 18 url-safe chars: long enough for better-auth, easy to paste into the login form.
  return randomBytes(18).toString('base64url').slice(0, 18);
}

/** Creates the QA account if missing and tops up its sample monitors. Safe to call repeatedly. */
export async function ensureTestAccount(): Promise<EnsureTestAccountResult> {
  let password: string | null = null;
  let created = false;

  let user = await prisma.user.findUnique({ where: { email: TEST_ACCOUNT_EMAIL }, select: { id: true } });
  if (!user) {
    password = generatePassword();
    const hash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: {
        id: TEST_ACCOUNT_ID,
        name: TEST_ACCOUNT_NAME,
        email: TEST_ACCOUNT_EMAIL,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        role: 'USER',
        timezone: 'UTC',
        accounts: {
          create: { id: `${TEST_ACCOUNT_ID}-credential`, accountId: TEST_ACCOUNT_ID, providerId: 'credential', password: hash },
        },
        subscription: { create: { plan: 'PRO', status: 'ACTIVE', provider: 'manual' } },
        preferences: { create: {} },
      },
      select: { id: true },
    });
    created = true;
  } else {
    // Heal partial state: missing credential, subscription or preferences.
    const credential = await prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' } });
    if (!credential) {
      password = generatePassword();
      await prisma.account.create({
        data: { id: `${user.id}-credential`, accountId: user.id, providerId: 'credential', userId: user.id, password: await bcrypt.hash(password, 12) },
      });
    }
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, plan: 'PRO', status: 'ACTIVE', provider: 'manual' },
      update: { plan: 'PRO', status: 'ACTIVE' },
    });
    await prisma.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  }

  const existing = await prisma.monitor.findMany({ where: { userId: user.id }, select: { hostname: true } });
  const existingHostnames = new Set(existing.map((m) => m.hostname));
  const monitorsAdded: string[] = [];
  for (const url of TEST_MONITOR_URLS) {
    const hostname = new URL(url).hostname;
    if (existingHostnames.has(hostname)) continue;
    try {
      const monitor = await createMonitor(user.id, { url, timeoutSeconds: 10, expectedStatusCodes: '200-399' });
      monitorsAdded.push(monitor.displayHostname);
    } catch (error) {
      logger.warn({ err: error, url }, 'test account: failed to add sample monitor');
    }
  }

  return { created, userId: user.id, email: TEST_ACCOUNT_EMAIL, password, monitorsAdded };
}

/** Mints a one-time bot deep link that links the Telegram that opens it to this account. */
export async function createTelegramLinkToken(userId: string): Promise<{ url: string; expiresAt: Date }> {
  const token = randomBytes(24).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + TELEGRAM_TOKEN_TTL_MINUTES * 60 * 1000);
  await prisma.telegramConnectToken.create({ data: { userId, tokenHash, expiresAt } });
  return { url: telegramDeepLink(token), expiresAt };
}
