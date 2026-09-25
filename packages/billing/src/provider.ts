import Stripe from 'stripe';
import { getPlan, logger, type PlanCode } from '@pingo/shared';
import {
  PAID_PLANS,
  PRICE_LOOKUP_KEYS,
  isPaidPlan,
  maskSecret,
  type PaidPlan,
  type StripeMode,
  type StripeModeConfig,
} from './config.js';

export type CheckoutInput = {
  userId: string;
  email: string;
  plan: PaidPlan;
  /** Stripe customer created earlier in the same mode; never pass one from the other mode. */
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  /** Where the checkout was started from (analytics in Stripe). */
  source?: 'web' | 'bot' | 'miniapp';
};

export type PortalInput = {
  customerId: string;
  returnUrl: string;
};

export type BillingStatus = 'NONE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE';

export type PriceCatalog = Record<PaidPlan, string>;

export type CatalogSetupResult = {
  products: Array<{ plan: PaidPlan; productId: string; created: boolean }>;
  prices: Array<{ plan: PaidPlan; priceId: string; amountCents: number; created: boolean }>;
  portalConfigured: boolean;
  portalCreated: boolean;
};

export type WebhookSetupResult = {
  created: boolean;
  endpointId: string;
  url: string;
  /** Returned by Stripe only at creation time; store it as the webhook secret. */
  secret: string | null;
};

export type StripeHealth = {
  mode: StripeMode;
  keyHint: string;
  /** Account label when the key may read it (restricted keys often cannot). */
  account: { id: string; name: string | null } | null;
  prices: Record<PaidPlan, { priceId: string | null; amountCents: number | null }>;
  pricesReady: boolean;
  webhookSecretConfigured: boolean;
  /** Endpoint registered in Stripe for our URL, if the key may list endpoints. */
  webhookEndpoint: { id: string; status: string; enabledEvents: number } | null | 'unknown';
  portalConfigured: boolean | 'unknown';
  error: string | null;
};

/** Events the webhook route handles; anything else is noise. */
export const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
];

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;
const CURRENCY = 'usd';

function planDisplayName(plan: PaidPlan): string {
  return `PingoGo ${getPlan(plan).name}`;
}

function randomSuffix(length = 8): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < length; i += 1) out += letters[Math.floor(Math.random() * letters.length)];
  return out;
}

export class StripeBillingProvider {
  readonly mode: StripeMode;
  readonly stripe: Stripe;
  private readonly config: StripeModeConfig;
  private priceCache: { catalog: Partial<PriceCatalog>; loadedAt: number } | null = null;

  constructor(config: StripeModeConfig) {
    this.config = config;
    this.mode = config.mode;
    this.stripe = new Stripe(config.secretKey, {
      appInfo: { name: 'PingoGo', url: 'https://www.pingogo.eu' },
    });
  }

  get isSandbox(): boolean {
    return this.mode === 'test';
  }

  get keyHint(): string {
    return maskSecret(this.config.secretKey);
  }

  get hasWebhookSecret(): boolean {
    return Boolean(this.config.webhookSecret);
  }

  // ---------------------------------------------------------------------------
  // Prices
  // ---------------------------------------------------------------------------

  /**
   * Price IDs per plan: env overrides first, then Stripe lookup keys.
   * Cached briefly so checkout does not hit the Prices API every time.
   */
  async loadPrices(force = false): Promise<Partial<PriceCatalog>> {
    if (!force && this.priceCache && Date.now() - this.priceCache.loadedAt < PRICE_CACHE_TTL_MS) {
      return this.priceCache.catalog;
    }
    const catalog: Partial<PriceCatalog> = { ...this.config.priceOverrides };
    const missing = PAID_PLANS.filter((plan) => !catalog[plan]);
    if (missing.length > 0) {
      const prices = await this.stripe.prices.list({
        lookup_keys: missing.map((plan) => PRICE_LOOKUP_KEYS[plan]),
        active: true,
        limit: 20,
      });
      for (const price of prices.data) {
        const plan = this.planFromLookupKey(price.lookup_key);
        if (plan && !catalog[plan]) catalog[plan] = price.id;
      }
    }
    this.priceCache = { catalog, loadedAt: Date.now() };
    return catalog;
  }

  async priceIdFor(plan: PaidPlan): Promise<string> {
    const catalog = await this.loadPrices();
    const id = catalog[plan];
    if (id) return id;
    // Maybe the catalog was created a moment ago; retry once without cache.
    const fresh = await this.loadPrices(true);
    const retried = fresh[plan];
    if (retried) return retried;
    throw new Error(
      `Stripe (${this.mode}) has no active price for ${plan}. Create the catalog from the admin panel or set STRIPE_${this.mode.toUpperCase()}_PRICE_${plan}.`,
    );
  }

  private planFromLookupKey(lookupKey: string | null | undefined): PaidPlan | null {
    if (!lookupKey) return null;
    for (const plan of PAID_PLANS) {
      if (PRICE_LOOKUP_KEYS[plan] === lookupKey) return plan;
    }
    return null;
  }

  /** Plan behind a Stripe price: lookup key → product metadata → known price IDs. */
  async planFromPrice(price: Stripe.Price | string): Promise<PlanCode | null> {
    if (typeof price !== 'string') {
      const byLookup = this.planFromLookupKey(price.lookup_key);
      if (byLookup) return byLookup;
      const byMetadata = price.metadata?.pingo_plan;
      if (byMetadata && isPaidPlan(byMetadata)) return byMetadata;
    }
    const id = typeof price === 'string' ? price : price.id;
    const catalog = await this.loadPrices();
    for (const plan of PAID_PLANS) {
      if (catalog[plan] === id) return plan;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Checkout & portal
  // ---------------------------------------------------------------------------

  async createCheckoutSession(input: CheckoutInput): Promise<{ url: string }> {
    const price = await this.priceIdFor(input.plan);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: input.customerId ?? undefined,
      customer_email: input.customerId ? undefined : input.email,
      client_reference_id: input.userId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      integration_identifier: `pingogo_${input.source ?? 'web'}_${randomSuffix()}`,
      metadata: { userId: input.userId, plan: input.plan, source: input.source ?? 'web' },
      subscription_data: {
        metadata: { userId: input.userId, plan: input.plan },
      },
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url };
  }

  async createPortalSession(input: PortalInput): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  parseWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.config.webhookSecret) {
      throw new Error(`STRIPE_${this.mode.toUpperCase()}_WEBHOOK_SECRET is not set`);
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.config.webhookSecret);
  }

  mapStripeStatus(status: Stripe.Subscription.Status): BillingStatus {
    switch (status) {
      case 'trialing':
        return 'TRIALING';
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
        return 'CANCELED';
      case 'unpaid':
        return 'UNPAID';
      default:
        return 'INCOMPLETE';
    }
  }

  // ---------------------------------------------------------------------------
  // One-click setup (admin panel / CLI)
  // ---------------------------------------------------------------------------

  /**
   * Makes sure Stripe has one product per paid plan and an active monthly
   * price per product tagged with our lookup key. Re-running is safe: when a
   * plan's price in env changed, a new price is created and the lookup key
   * moves to it; the old price is archived so it disappears from Checkout.
   */
  async ensureCatalog(): Promise<CatalogSetupResult> {
    const result: CatalogSetupResult = { products: [], prices: [], portalConfigured: false, portalCreated: false };
    const existingProducts = await this.stripe.products.list({ active: true, limit: 100 });

    for (const plan of PAID_PLANS) {
      const amountCents = getPlan(plan).monthlyPriceCents;
      let product = existingProducts.data.find((item) => item.metadata.pingo_plan === plan);
      let productCreated = false;
      if (!product) {
        product = await this.stripe.products.create({
          name: planDisplayName(plan),
          description: getPlan(plan).description,
          metadata: { pingo_plan: plan },
        });
        productCreated = true;
      }
      result.products.push({ plan, productId: product.id, created: productCreated });

      const lookupKey = PRICE_LOOKUP_KEYS[plan];
      const current = await this.stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      const existing = current.data[0];
      const matches =
        existing &&
        existing.product === product.id &&
        existing.unit_amount === amountCents &&
        existing.currency === CURRENCY &&
        existing.recurring?.interval === 'month';

      if (existing && matches) {
        result.prices.push({ plan, priceId: existing.id, amountCents, created: false });
        continue;
      }

      const price = await this.stripe.prices.create({
        product: product.id,
        currency: CURRENCY,
        unit_amount: amountCents,
        recurring: { interval: 'month' },
        lookup_key: lookupKey,
        transfer_lookup_key: true,
        metadata: { pingo_plan: plan },
      });
      if (existing) {
        await this.stripe.prices.update(existing.id, { active: false });
      }
      result.prices.push({ plan, priceId: price.id, amountCents, created: true });
    }

    // Customer Portal: invoices, card updates, cancel at period end and
    // switching between our plans (so paid users never need a second Checkout).
    const portalParams: Stripe.BillingPortal.ConfigurationCreateParams = {
      business_profile: { headline: 'PingoGo — manage your plan' },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'create_prorations',
          products: result.products.map((product) => ({
            product: product.productId,
            prices: [result.prices.find((price) => price.plan === product.plan)!.priceId],
          })),
        },
      },
    };
    const portals = await this.stripe.billingPortal.configurations.list({ limit: 1 });
    const portal = portals.data[0];
    if (portal) {
      await this.stripe.billingPortal.configurations.update(portal.id, {
        business_profile: portalParams.business_profile,
        features: portalParams.features,
      });
    } else {
      await this.stripe.billingPortal.configurations.create(portalParams);
      result.portalCreated = true;
    }
    result.portalConfigured = true;
    this.priceCache = null;
    logger.info({ mode: this.mode, prices: result.prices }, 'stripe catalog ensured');
    return result;
  }

  /** Registers our webhook URL in this mode (idempotent by URL). */
  async ensureWebhookEndpoint(url: string): Promise<WebhookSetupResult> {
    const endpoints = await this.stripe.webhookEndpoints.list({ limit: 100 });
    const existing = endpoints.data.find((endpoint) => endpoint.url === url);
    if (existing) {
      const missing = WEBHOOK_EVENTS.filter((event) => !existing.enabled_events.includes(event));
      if (missing.length > 0 && !existing.enabled_events.includes('*')) {
        await this.stripe.webhookEndpoints.update(existing.id, { enabled_events: WEBHOOK_EVENTS });
      }
      return { created: false, endpointId: existing.id, url, secret: null };
    }
    const endpoint = await this.stripe.webhookEndpoints.create({
      url,
      enabled_events: WEBHOOK_EVENTS,
      description: `PingoGo (${this.mode})`,
    });
    logger.info({ mode: this.mode, endpointId: endpoint.id }, 'stripe webhook endpoint created');
    return { created: true, endpointId: endpoint.id, url, secret: endpoint.secret ?? null };
  }

  /** Read-only snapshot for the admin panel; tolerates restricted keys. */
  async health(webhookUrl: string): Promise<StripeHealth> {
    const health: StripeHealth = {
      mode: this.mode,
      keyHint: this.keyHint,
      account: null,
      prices: {
        PERSONAL: { priceId: null, amountCents: null },
        PRO: { priceId: null, amountCents: null },
        AGENCY: { priceId: null, amountCents: null },
      },
      pricesReady: false,
      webhookSecretConfigured: this.hasWebhookSecret,
      webhookEndpoint: 'unknown',
      portalConfigured: 'unknown',
      error: null,
    };

    try {
      const catalog = await this.loadPrices(true);
      const ids = PAID_PLANS.map((plan) => catalog[plan]).filter((id): id is string => Boolean(id));
      const amounts = new Map<string, number | null>();
      await Promise.all(
        ids.map(async (id) => {
          const price = await this.stripe.prices.retrieve(id);
          amounts.set(id, price.unit_amount);
        }),
      );
      for (const plan of PAID_PLANS) {
        const id = catalog[plan] ?? null;
        health.prices[plan] = { priceId: id, amountCents: id ? (amounts.get(id) ?? null) : null };
      }
      health.pricesReady = PAID_PLANS.every((plan) => health.prices[plan].priceId);
    } catch (error) {
      health.error = error instanceof Error ? error.message : 'Could not reach Stripe';
      return health;
    }

    try {
      const account = await this.stripe.accounts.retrieve(null);
      health.account = {
        id: account.id,
        name: account.settings?.dashboard?.display_name ?? account.business_profile?.name ?? null,
      };
    } catch {
      health.account = null;
    }

    try {
      const endpoints = await this.stripe.webhookEndpoints.list({ limit: 100 });
      const ours = endpoints.data.find((endpoint) => endpoint.url === webhookUrl);
      health.webhookEndpoint = ours
        ? { id: ours.id, status: ours.status, enabledEvents: ours.enabled_events.length }
        : null;
    } catch {
      health.webhookEndpoint = 'unknown';
    }

    try {
      const portals = await this.stripe.billingPortal.configurations.list({ limit: 1 });
      health.portalConfigured = portals.data.length > 0;
    } catch {
      health.portalConfigured = 'unknown';
    }

    return health;
  }
}

/** Plan of a Stripe subscription: price lookup key / metadata, then our own metadata. */
export async function extractSubscriptionPlan(
  provider: StripeBillingProvider,
  subscription: Stripe.Subscription,
): Promise<PlanCode> {
  const price = subscription.items.data[0]?.price;
  if (price) {
    const plan = await provider.planFromPrice(price);
    if (plan) return plan;
  }
  const fromMetadata = subscription.metadata.plan;
  return fromMetadata && isPaidPlan(fromMetadata) ? fromMetadata : 'FREE';
}

/** Period end moved from the subscription to its items in recent API versions. */
export function periodEnd(subscription: Stripe.Subscription): Date | null {
  const record = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const end = record.current_period_end ?? record.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000) : null;
}

export type { Stripe };
