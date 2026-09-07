import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { getApiUser, jsonError } from '@/lib/api';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    const incidents = await prisma.incident.findMany({
      where: { monitor: { userId: user.id } },
      include: { monitor: true },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ incidents });
  } catch (error) {
    return jsonError(error);
  }
}
