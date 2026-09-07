import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { getBillingProvider } from '@pingo/billing';
import { getApiUser, jsonError } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    const billing = getBillingProvider();
    if (!billing) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub?.providerCustomerId) {
      return NextResponse.json({ error: 'No billing customer yet' }, { status: 400 });
    }
    const session = await billing.createPortalSession({
      customerId: sub.providerCustomerId,
      returnUrl: `${process.env.APP_URL}/settings?tab=billing`,
    });
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
