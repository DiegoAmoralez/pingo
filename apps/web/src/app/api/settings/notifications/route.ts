import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { notificationPreferencesSchema } from '@pingo/shared';
import { getApiUser, jsonError } from '@/lib/api';

export async function PATCH(request: Request) {
  try {
    const user = await getApiUser(request);
    const body = notificationPreferencesSchema.parse(await request.json());
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...body },
      update: body,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
