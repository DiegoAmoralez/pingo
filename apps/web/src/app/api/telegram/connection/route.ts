import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@pingo/database';
import { getApiUser, jsonError } from '@/lib/api';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    const connection = await prisma.telegramConnection.findUnique({ where: { userId: user.id } });
    return NextResponse.json({
      connected: Boolean(connection),
      username: connection?.username ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({ locale: z.enum(['en', 'ru']) });

/** Updates the language used by the bot and by alert messages. */
export async function PATCH(request: Request) {
  try {
    const user = await getApiUser(request);
    const { locale } = patchSchema.parse(await request.json());
    const updated = await prisma.telegramConnection.updateMany({
      where: { userId: user.id },
      data: { locale },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Telegram is not connected' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, locale });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getApiUser(request);
    await prisma.telegramConnection.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
