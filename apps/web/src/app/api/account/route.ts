import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { getBillingProvider } from '@pingo/billing';
import { getApiUser, jsonError } from '@/lib/api';
import { auth } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const user = await getApiUser(request);
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    const billing = getBillingProvider();
    if (billing && sub?.providerSubscriptionId && sub.status === 'ACTIVE') {
      await billing.cancelSubscription(sub.providerSubscriptionId);
    }
    await prisma.user.delete({ where: { id: user.id } });
    await auth.api.signOut({ headers: request.headers });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
