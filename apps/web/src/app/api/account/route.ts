import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { getBillingProviderForMode, isStripeMode } from '@pingo/billing';
import { logger } from '@pingo/shared';
import { getApiUser, jsonError } from '@/lib/api';
import { auth } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const user = await getApiUser(request);
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

    // Cancel in the Stripe world the subscription lives in, whichever mode is active now.
    if (sub?.providerSubscriptionId && sub.status === 'ACTIVE' && isStripeMode(sub.providerMode)) {
      const billing = getBillingProviderForMode(sub.providerMode);
      if (billing) {
        try {
          await billing.cancelSubscription(sub.providerSubscriptionId);
        } catch (error) {
          // The account still goes; the subscription can be cleaned up in the Dashboard.
          logger.error({ err: error, userId: user.id, mode: sub.providerMode }, 'stripe cancel on account delete failed');
        }
      }
    }

    await prisma.user.delete({ where: { id: user.id } });
    await auth.api.signOut({ headers: request.headers });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
