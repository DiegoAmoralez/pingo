import { NextResponse } from 'next/server';
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

export async function DELETE(request: Request) {
  try {
    const user = await getApiUser(request);
    await prisma.telegramConnection.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
