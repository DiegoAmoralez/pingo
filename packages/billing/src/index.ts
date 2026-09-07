import Stripe from 'stripe';
import type { PlanCode } from '@pingo/shared';

export type CheckoutInput = {
  userId: string;
  email: string;
  plan: Exclude<PlanCode, 'FREE'>;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
};

export type PortalInput = {
  customerId: string;
  returnUrl: string;
};

export type BillingSubscription = {
  provider: 'stripe';
  customerId: string;
  subscriptionId: string;
  plan: PlanCode;
  status:
    | 'NONE'
    | 'TRIALING'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'CANCELED'
    | 'UNPAID'
    | 'INCOMPLETE';
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export interface BillingProvider {
  createCheckoutSession(input: CheckoutInput): Promise<{ url: string }>;
  createPortalSession(input: PortalInput): Promise<{ url: string }>;
  parseWebhook(rawBody: Buffer, signature: string): Promise<Stripe.Event>;
  mapStripeStatus(status: Stripe.Subscription.Status): BillingSubscription['status'];
  planFromPriceId(priceId: string): PlanCode;
}

function priceMap(): Record<string, PlanCode> {
  return {
    [process.env.STRIPE_PRICE_PERSONAL ?? '']: 'PERSONAL',
    [process.env.STRIPE_PRICE_PRO ?? '']: 'PRO',
    [process.env.STRIPE_PRICE_AGENCY ?? '']: 'AGENCY',
  };
}

function planToPrice(plan: Exclude<PlanCode, 'FREE'>): string {
  const map = {
    PERSONAL: process.env.STRIPE_PRICE_PERSONAL,
    PRO: process.env.STRIPE_PRICE_PRO,
    AGENCY: process.env.STRIPE_PRICE_AGENCY,
  };
  const id = map[plan];
  if (!id) {
    throw new Error(`Missing Stripe price id for plan ${plan}`);
  }
  return id;
}

export class StripeBillingProvider implements BillingProvider {
  private readonly stripe: Stripe;

  constructor(secret = process.env.STRIPE_SECRET_KEY) {
    if (!secret) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    this.stripe = new Stripe(secret);
  }

  async createCheckoutSession(input: CheckoutInput): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: input.customerId ?? undefined,
      customer_email: input.customerId ? undefined : input.email,
      client_reference_id: input.userId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [{ price: planToPrice(input.plan), quantity: 1 }],
      metadata: { userId: input.userId, plan: input.plan },
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

  async parseWebhook(rawBody: Buffer, signature: string): Promise<Stripe.Event> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  mapStripeStatus(status: Stripe.Subscription.Status): BillingSubscription['status'] {
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

  planFromPriceId(priceId: string): PlanCode {
    return priceMap()[priceId] ?? 'FREE';
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }
}

export function getBillingProvider(): StripeBillingProvider | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new StripeBillingProvider();
}

export function extractSubscriptionPlan(subscription: Stripe.Subscription): PlanCode {
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return (subscription.metadata.plan as PlanCode | undefined) ?? 'FREE';
  return priceMap()[priceId] ?? (subscription.metadata.plan as PlanCode | undefined) ?? 'FREE';
}

export function periodEnd(subscription: Stripe.Subscription): Date | null {
  const record = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const end = record.current_period_end ?? record.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000) : null;
}
