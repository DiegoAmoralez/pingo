import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@pingo/database';
import { extractSubscriptionPlan, getBillingProvider, periodEnd } from '@pingo/billing';
import { getEmailProvider, paymentProblemEmail } from '@pingo/email';
import { trackEvent } from '@pingo/shared';
import { pauseExcessMonitors } from '@/server/monitors';
import type { PlanCode } from '@pingo/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const billing = getBillingProvider();
  if (!billing) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  const raw = Buffer.from(await request.arrayBuffer());
  let event: Stripe.Event;
  try {
    event = await billing.parseWebhook(raw, signature);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });
  await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      if (userId && session.customer) {
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            provider: 'stripe',
            providerCustomerId: String(session.customer),
            providerSubscriptionId: session.subscription ? String(session.subscription) : null,
            plan: (session.metadata?.plan as PlanCode | undefined) ?? 'PERSONAL',
            status: 'ACTIVE',
          },
          update: {
            providerCustomerId: String(session.customer),
            providerSubscriptionId: session.subscription ? String(session.subscription) : null,
            plan: (session.metadata?.plan as PlanCode | undefined) ?? 'PERSONAL',
            status: 'ACTIVE',
          },
        });
        await trackEvent('subscription_created', { plan: session.metadata?.plan }, userId);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.userId;
      if (!userId) break;
      const plan = extractSubscriptionPlan(subscription);
      const status =
        event.type === 'customer.subscription.deleted'
          ? 'CANCELED'
          : billing.mapStripeStatus(subscription.status);
      const effectivePlan = status === 'CANCELED' || status === 'UNPAID' ? 'FREE' : plan;
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          provider: 'stripe',
          providerCustomerId: String(subscription.customer),
          providerSubscriptionId: subscription.id,
          plan: effectivePlan,
          status,
          currentPeriodEnd: periodEnd(subscription),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        update: {
          providerCustomerId: String(subscription.customer),
          providerSubscriptionId: subscription.id,
          plan: effectivePlan,
          status,
          currentPeriodEnd: periodEnd(subscription),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      await pauseExcessMonitors(userId, effectivePlan);
      if (event.type === 'customer.subscription.deleted') {
        await trackEvent('subscription_cancelled', { plan }, userId);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = String(invoice.customer);
      const sub = await prisma.subscription.findFirst({
        where: { providerCustomerId: customerId },
        include: { user: true },
      });
      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE' },
        });
        const email = paymentProblemEmail();
        await getEmailProvider().send({ to: sub.user.email, ...email });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
