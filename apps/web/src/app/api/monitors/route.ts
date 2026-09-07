import { NextResponse } from 'next/server';
import { addMonitorSchema } from '@pingo/shared';
import { getApiUser, jsonError, rateLimit } from '@/lib/api';
import { createMonitor } from '@/server/monitors';
import { prisma } from '@pingo/database';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    const monitors = await prisma.monitor.findMany({
      where: { userId: user.id },
      include: { sslRecords: true, domain: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ monitors });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    await rateLimit(`add-monitor:${user.id}`, 10, 60);
    const body = addMonitorSchema.parse(await request.json());
    const monitor = await createMonitor(user.id, body);
    return NextResponse.json({ monitor }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
