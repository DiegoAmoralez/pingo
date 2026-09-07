import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { getApiUser, jsonError } from '@/lib/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const monitor = await prisma.monitor.findUnique({ where: { id } });
    if (!monitor || monitor.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const checks = await prisma.monitorCheck.findMany({
      where: {
        monitorId: id,
        ...(from ? { checkedAt: { gte: new Date(from) } } : {}),
      },
      orderBy: { checkedAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ checks });
  } catch (error) {
    return jsonError(error);
  }
}
