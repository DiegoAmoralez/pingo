import { prisma } from '@pingo/database';
import {
  STRIPE_MODES,
  getBillingProviderForMode,
  getStripeModeState,
  type StripeHealth,
  type StripeMode,
  type StripeModeState,
} from '@pingo/billing';
import { stripeWebhookUrl } from '@/lib/billing-urls';

export type StripeModeOverview = {
  mode: StripeMode;
  configured: boolean;
  health: StripeHealth | null;
  /** Subscription rows that belong to this Stripe world. */
  subscriptions: { total: number; paying: number };
};

export type StripeOverview = {
  state: StripeModeState;
  webhookUrl: string;
  modes: StripeModeOverview[];
  /** Rows without a mode (manual grants) — they apply in both worlds. */
  manualSubscriptions: number;
};

const PAYING = ['ACTIVE', 'TRIALING', 'PAST_DUE'] as const;

/** Everything the admin panel shows about Stripe; Stripe API calls are best-effort. */
export async function getStripeOverview(): Promise<StripeOverview> {
  const webhookUrl = stripeWebhookUrl();
  const [state, counts, manualSubscriptions] = await Promise.all([
    getStripeModeState(),
    prisma.subscription.groupBy({
      by: ['providerMode', 'status'],
      _count: { _all: true },
      where: { providerMode: { in: [...STRIPE_MODES] } },
    }),
    prisma.subscription.count({ where: { providerMode: null, status: { in: [...PAYING] } } }),
  ]);

  const modes = await Promise.all(
    STRIPE_MODES.map(async (mode): Promise<StripeModeOverview> => {
      const provider = getBillingProviderForMode(mode);
      const rows = counts.filter((row) => row.providerMode === mode);
      const total = rows.reduce((sum, row) => sum + row._count._all, 0);
      const paying = rows
        .filter((row) => (PAYING as readonly string[]).includes(row.status))
        .reduce((sum, row) => sum + row._count._all, 0);
      return {
        mode,
        configured: Boolean(provider),
        health: provider ? await provider.health(webhookUrl) : null,
        subscriptions: { total, paying },
      };
    }),
  );

  return { state, webhookUrl, modes, manualSubscriptions };
}
