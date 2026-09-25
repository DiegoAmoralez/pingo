import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { checkoutSchema, trackEvent } from '@pingo/shared';
import { getBillingProvider } from '@pingo/billing';
import { getApiUser, jsonError } from '@/lib/api';
import { billingReturnUrl } from '@/lib/billing-urls';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    const body = checkoutSchema.parse(await request.json());
    const billing = await getBillingProvider();
    if (!billing) {
      return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: true },
    });
    if (!dbUser) throw new Error('User not found');

    // A customer id from the other Stripe world does not exist in this one.
    const sub = dbUser.subscription;
    const customerId = sub?.providerMode === billing.mode ? sub.providerCustomerId : null;

    const session = await billing.createCheckoutSession({
      userId: user.id,
      email: dbUser.email,
      plan: body.plan,
      customerId,
      successUrl: billingReturnUrl('success'),
      cancelUrl: billingReturnUrl('cancel'),
      source: body.source ?? 'web',
    });
    await trackEvent('checkout_started', { plan: body.plan, mode: billing.mode, source: body.source ?? 'web' }, user.id);
    return NextResponse.json({ ...session, mode: billing.mode });
  } catch (error) {
    return jsonError(error);
  }
}
