import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { getBillingProvider } from '@pingo/billing';
import { getApiUser, jsonError } from '@/lib/api';
import { billingReturnUrl } from '@/lib/billing-urls';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    const billing = await getBillingProvider();
    if (!billing) {
      return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    }
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub?.providerCustomerId || sub.providerMode !== billing.mode) {
      return NextResponse.json({ error: 'No billing profile yet. Pick a plan first.' }, { status: 400 });
    }
    const session = await billing.createPortalSession({
      customerId: sub.providerCustomerId,
      returnUrl: billingReturnUrl(),
    });
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
