import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import {
  configuredStripeModes,
  extractSubscriptionPlan,
  isPaidPlan,
  periodEnd,
  verifyStripeWebhook,
  type Stripe,
  type StripeMode,
} from '@pingo/billing';
import { getEmailProvider, paymentProblemEmail } from '@pingo/email';
import { logger, trackEvent } from '@pingo/shared';
import { pauseExcessMonitors } from '@/server/monitors';
import type { PlanCode } from '@pingo/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Both Stripe worlds (live and sandbox) post here. The signature tells us
 * which one sent the event; the subscription row is tagged with that mode so
 * sandbox purchases never grant a plan while live mode is active.
 */
export async function POST(request: Request) {
  if (configuredStripeModes().length === 0) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  const raw = Buffer.from(await request.arrayBuffer());
  const verified = verifyStripeWebhook(raw, signature);
  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  const { event, mode, provider } = verified;

  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });
  await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      if (!userId || !session.customer) break;
      const plan = planFromMetadata(session.metadata?.plan);
      const customerId = String(session.customer);
      const subscriptionId = session.subscription ? String(session.subscription) : null;
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          provider: 'stripe',
          providerMode: mode,
          providerCustomerId: customerId,
          providerSubscriptionId: subscriptionId,
          plan,
          status: 'ACTIVE',
        },
        update: {
          provider: 'stripe',
          providerMode: mode,
          providerCustomerId: customerId,
          providerSubscriptionId: subscriptionId,
          plan,
          status: 'ACTIVE',
        },
      });
      await trackEvent('subscription_created', { plan, mode, source: session.metadata?.source }, userId);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(subscription, mode);
      if (!userId) {
        logger.warn({ mode, subscriptionId: subscription.id }, 'stripe subscription without a PingoGo user');
        break;
      }
      const plan = await extractSubscriptionPlan(provider, subscription);
      const status =
        event.type === 'customer.subscription.deleted' ? 'CANCELED' : provider.mapStripeStatus(subscription.status);
      const effective: PlanCode = status === 'CANCELED' || status === 'UNPAID' ? 'FREE' : plan;
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          provider: 'stripe',
          providerMode: mode,
          providerCustomerId: String(subscription.customer),
          providerSubscriptionId: subscription.id,
          plan: effective,
          status,
          currentPeriodEnd: periodEnd(subscription),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        update: {
          provider: 'stripe',
          providerMode: mode,
          providerCustomerId: String(subscription.customer),
          providerSubscriptionId: subscription.id,
          plan: effective,
          status,
          currentPeriodEnd: periodEnd(subscription),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      await pauseExcessMonitors(userId, effective);
      if (event.type === 'customer.subscription.deleted') {
        await trackEvent('subscription_cancelled', { plan, mode }, userId);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer ? String(typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id) : null;
      if (!customerId) break;
      const sub = await prisma.subscription.findFirst({
        where: { providerCustomerId: customerId, providerMode: mode },
        include: { user: true },
      });
      if (!sub) break;
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PAST_DUE' } });
      const email = paymentProblemEmail();
      await getEmailProvider().send({ to: sub.user.email, ...email });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

function planFromMetadata(value: string | undefined): PlanCode {
  return value && isPaidPlan(value) ? value : 'PERSONAL';
}

/**
 * Our user id travels in subscription metadata (set at checkout). Subscriptions
 * created from the Stripe Dashboard lack it, so fall back to the customer we
 * already know in this mode.
 */
async function resolveUserId(subscription: Stripe.Subscription, mode: StripeMode): Promise<string | null> {
  const fromMetadata = subscription.metadata.userId;
  if (fromMetadata) return fromMetadata;
  const customerId = String(subscription.customer);
  const known = await prisma.subscription.findFirst({
    where: { providerCustomerId: customerId, providerMode: mode },
    select: { userId: true },
  });
  return known?.userId ?? null;
}
