import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import bcrypt from 'bcryptjs';
import { prisma } from '@pingo/database';
import { getEmailProvider, resetPasswordEmail, verificationEmail } from '@pingo/email';
import { trackEvent } from '@pingo/shared';

export const auth = betterAuth({
  appName: 'PINGO',
  secret: process.env.BETTER_AUTH_SECRET || process.env.APP_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'facebook'],
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
    minPasswordLength: 8,
    password: {
      hash: async (password) => bcrypt.hash(password, 12),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      const email = resetPasswordEmail(url);
      await getEmailProvider().send({ to: user.email, ...email });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const email = verificationEmail(url);
      await getEmailProvider().send({ to: user.email, ...email });
    },
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? {
          facebook: {
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            ...(process.env.FACEBOOK_CONFIG_ID ? { configId: process.env.FACEBOOK_CONFIG_ID } : {}),
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'USER', input: false },
      timezone: { type: 'string', defaultValue: 'UTC' },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: { userId: user.id, plan: 'FREE', status: 'NONE', provider: 'stripe' },
            update: {},
          });
          await prisma.notificationPreference.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          });
          if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
            await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
          }
          await trackEvent('user_registered', { email: user.email }, user.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
  trustedOrigins: [process.env.APP_URL ?? 'http://localhost:3000'],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
});

export type Session = typeof auth.$Infer.Session;

export function enabledSso() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
  };
}
