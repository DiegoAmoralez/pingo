import type { Context } from 'grammy';
import { prisma, type Subscription, type TelegramConnection, type User } from '@pingo/database';
import { getUserPlan } from '@pingo/core';
import type { PlanCode } from '@pingo/shared';
import { dictionary, toBotLocale, type BotLocale, type Dictionary } from './i18n.js';
import { getGuestLocale } from './state.js';

export type LinkedSession = {
  linked: true;
  locale: BotLocale;
  t: Dictionary;
  timeZone: string;
  telegramUserId: string;
  user: User & { subscription: Subscription | null };
  connection: TelegramConnection;
  plan: PlanCode;
};

export type GuestSession = {
  linked: false;
  locale: BotLocale;
  t: Dictionary;
  timeZone: string;
  telegramUserId: string | null;
};

export type BotSession = LinkedSession | GuestSession;

export type BotContext = Context & { session: BotSession };

export async function loadSession(ctx: Context): Promise<BotSession> {
  const telegramUserId = ctx.from ? String(ctx.from.id) : null;
  if (!telegramUserId) {
    const locale = toBotLocale(ctx.from?.language_code);
    return { linked: false, locale, t: dictionary(locale), timeZone: 'UTC', telegramUserId };
  }

  const connection = await prisma.telegramConnection.findFirst({
    where: { telegramUserId },
    include: { user: { include: { subscription: true } } },
  });

  if (!connection) {
    const guest = await getGuestLocale(telegramUserId);
    const locale = toBotLocale(guest ?? ctx.from?.language_code);
    return { linked: false, locale, t: dictionary(locale), timeZone: 'UTC', telegramUserId };
  }

  const locale = toBotLocale(connection.locale);
  const { user, ...rest } = connection;
  return {
    linked: true,
    locale,
    t: dictionary(locale),
    timeZone: user.timezone || 'UTC',
    telegramUserId,
    user,
    connection: rest,
    plan: await getUserPlan(user.id),
  };
}
