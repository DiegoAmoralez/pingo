import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { profileSchema } from '@pingo/shared';
import { getApiUser, jsonError } from '@/lib/api';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { telegram: true, preferences: true, subscription: true },
    });
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
        plan: dbUser.subscription?.plan ?? 'FREE',
        status: dbUser.subscription?.status ?? 'NONE',
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
