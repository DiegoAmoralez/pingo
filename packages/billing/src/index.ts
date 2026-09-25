import type Stripe from 'stripe';
import { logger } from '@pingo/shared';
import { configuredStripeModes, readStripeModeConfig, type StripeMode } from './config.js';
import { getStripeMode } from './mode.js';
import { StripeBillingProvider } from './provider.js';

export {
  PAID_PLANS,
  PRICE_LOOKUP_KEYS,
  STRIPE_MODES,
  configuredStripeModes,
  defaultStripeMode,
  isPaidPlan,
  isStripeMode,
  maskSecret,
  modeOfKey,
  readStripeModeConfig,
  type PaidPlan,
  type StripeMode,
  type StripeModeConfig,
} from './config.js';
export {
  getStripeMode,
  getStripeModeState,
  setStripeMode,
  subscriptionAppliesToMode,
  type StripeModeState,
} from './mode.js';
export {
  StripeBillingProvider,
  WEBHOOK_EVENTS,
  extractSubscriptionPlan,
  periodEnd,
  type BillingStatus,
  type CatalogSetupResult,
  type CheckoutInput,
  type PortalInput,
  type PriceCatalog,
  type Stripe,
  type StripeHealth,
  type WebhookSetupResult,
} from './provider.js';

/** One provider per mode per process: keeps the price cache warm. */
const providers = new Map<StripeMode, StripeBillingProvider>();

/** Provider for an explicit mode, or null when that mode has no key. */
export function getBillingProviderForMode(mode: StripeMode): StripeBillingProvider | null {
  const cached = providers.get(mode);
  if (cached) return cached;
  const config = readStripeModeConfig(mode);
  if (!config) return null;
  const provider = new StripeBillingProvider(config);
  providers.set(mode, provider);
  return provider;
}

/** Provider for the mode the admin currently has active, or null when Stripe is off. */
export async function getBillingProvider(): Promise<StripeBillingProvider | null> {
  const mode = await getStripeMode();
  if (!mode) return null;
  return getBillingProviderForMode(mode);
}

export type VerifiedWebhook = { event: Stripe.Event; mode: StripeMode; provider: StripeBillingProvider };

/**
 * Both Stripe worlds may post to the same URL. Try each configured mode's
 * signing secret; the one that verifies tells us which world sent the event.
 * `event.livemode` must agree with it, otherwise a secret was pasted into the
 * wrong variable and we refuse the event rather than mis-file a subscription.
 */
export function verifyStripeWebhook(rawBody: Buffer, signature: string): VerifiedWebhook | null {
  for (const mode of configuredStripeModes()) {
    const provider = getBillingProviderForMode(mode);
    if (!provider?.hasWebhookSecret) continue;
    try {
      const event = provider.parseWebhook(rawBody, signature);
      const eventMode: StripeMode = event.livemode ? 'live' : 'test';
      if (eventMode !== mode) {
        logger.error({ mode, eventMode, eventId: event.id }, 'stripe webhook secret belongs to the other mode');
        return null;
      }
      return { event, mode, provider };
    } catch {
      // Not this mode's secret; try the next one.
    }
  }
  return null;
}
