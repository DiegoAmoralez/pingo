import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { checkoutSchema } from '@pingo/shared';
import { getBillingProvider } from '@pingo/billing';
import { getApiUser, jsonError } from '@/lib/api';
import { trackEvent } from '@pingo/shared';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    const { plan } = checkoutSchema.parse(await request.json());
    const billing = getBillingProvider();
    if (!billing) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY and price IDs.' },
        { status: 503 },
      );
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: true },
    });
    if (!dbUser) throw new Error('User not found');
    const session = await billing.createCheckoutSession({
      userId: user.id,
      email: dbUser.email,
      plan,
      customerId: dbUser.subscription?.providerCustomerId,
      successUrl: `${process.env.APP_URL}/settings?tab=billing`,
      cancelUrl: `${process.env.APP_URL}/settings?tab=billing`,
    });
    await trackEvent('checkout_started', { plan }, user.id);
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
