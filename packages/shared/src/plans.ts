export const PLAN_CODES = ['FREE', 'PERSONAL', 'PRO', 'AGENCY'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPriceCents: number;
  maxMonitors: number;
  minCheckIntervalSeconds: number;
  historyDays: number;
  multipleNotificationDestinations: boolean;
  popular?: boolean;
};

function priceFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getPlanDefinitions(): Record<PlanCode, PlanDefinition> {
  return {
    FREE: {
      code: 'FREE',
      name: 'Free',
      description: 'Start watching two websites with Telegram alerts.',
      monthlyPriceCents: 0,
      maxMonitors: 2,
      minCheckIntervalSeconds: 300,
      historyDays: 7,
      multipleNotificationDestinations: false,
    },
    PERSONAL: {
      code: 'PERSONAL',
      name: 'Personal',
      description: 'Faster checks and a month of history for small sites.',
      monthlyPriceCents: priceFromEnv('PLAN_PRICE_PERSONAL', 399),
      maxMonitors: 10,
      minCheckIntervalSeconds: 60,
      historyDays: 30,
      multipleNotificationDestinations: false,
      popular: true,
    },
    PRO: {
      code: 'PRO',
      name: 'Pro',
      description: 'For teams that run many sites and need longer history.',
      monthlyPriceCents: priceFromEnv('PLAN_PRICE_PRO', 899),
      maxMonitors: 50,
      minCheckIntervalSeconds: 60,
      historyDays: 90,
      multipleNotificationDestinations: true,
    },
    AGENCY: {
      code: 'AGENCY',
      name: 'Agency',
      description: 'High limits for agencies and portfolios.',
      monthlyPriceCents: priceFromEnv('PLAN_PRICE_AGENCY', 1999),
      maxMonitors: 250,
      minCheckIntervalSeconds: 60,
      historyDays: 90,
      multipleNotificationDestinations: true,
    },
  };
}

export function getPlan(code: PlanCode): PlanDefinition {
  return getPlanDefinitions()[code];
}

export function formatPrice(cents: number): string {
  if (cents === 0) return '$0';
  return `$${(cents / 100).toFixed(2)}`;
}

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
] as const;

export type SubscriptionStatus =
  | 'NONE'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'INCOMPLETE';

export function isPaidStatus(status: SubscriptionStatus): boolean {
  return status === 'TRIALING' || status === 'ACTIVE' || status === 'PAST_DUE';
}
