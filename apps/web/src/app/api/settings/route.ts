import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { profileSchema } from '@pingo/shared';
import { getStripeMode, subscriptionAppliesToMode } from '@pingo/billing';
import { effectivePlan } from '@pingo/core';
import { getApiUser, jsonError } from '@/lib/api';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    const [dbUser, stripeMode] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        include: { telegram: true, preferences: true, subscription: true },
      }),
      getStripeMode(),
    ]);
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const sub = dbUser.subscription;
    const applies = subscriptionAppliesToMode(sub, stripeMode);
    return NextResponse.json({
      user: { name: dbUser.name, email: dbUser.email, timezone: dbUser.timezone },
      telegram: {
        connected: Boolean(dbUser.telegram),
        username: dbUser.telegram?.username ?? null,
      },
      preferences: dbUser.preferences ?? {
        websiteDowntime: true,
        websiteRecovery: true,
        sslExpiration: true,
        domainExpiration: true,
        dnsChanges: true,
      },
      subscription: {
        plan: applies ? effectivePlan(sub, stripeMode) : 'FREE',
        status: applies && sub ? sub.status : 'NONE',
        currentPeriodEnd: applies ? (sub?.currentPeriodEnd?.toISOString() ?? null) : null,
        cancelAtPeriodEnd: applies ? (sub?.cancelAtPeriodEnd ?? false) : false,
        /** Billing profile exists in the active Stripe world (portal available). */
        hasBillingProfile: applies && Boolean(sub?.providerCustomerId) && sub?.providerMode === stripeMode,
      },
      billing: {
        /** null → payments are off; 'test' → sandbox (test cards). */
        mode: stripeMode,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getApiUser(request);
    const body = profileSchema.parse(await request.json());
    await prisma.user.update({
      where: { id: user.id },
      data: { name: body.name, timezone: body.timezone },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
