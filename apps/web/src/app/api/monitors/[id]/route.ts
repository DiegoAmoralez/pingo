import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { updateMonitorSchema } from '@pingo/shared';
import { calculateUptimePercent } from '@pingo/monitoring';
import { getApiUser, jsonError } from '@/lib/api';
import { deleteMonitor, getMonitorForUser, updateMonitor } from '@/server/monitors';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const monitor = await getMonitorForUser(user.id, id);
    const url = new URL(request.url);
    const range = url.searchParams.get('range') ?? '24h';
    const hours = range === '30d' ? 720 : range === '7d' ? 168 : 24;
    const from = new Date(Date.now() - hours * 3600 * 1000);

    const [counts24, counts7, counts30, lastIncident, checks] = await Promise.all([
      prisma.monitorCheck.groupBy({
        by: ['status'],
        where: { monitorId: id, checkedAt: { gte: new Date(Date.now() - 86400000) } },
        _count: true,
      }),
      prisma.monitorCheck.groupBy({
        by: ['status'],
        where: { monitorId: id, checkedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        _count: true,
      }),
      prisma.monitorCheck.groupBy({
        by: ['status'],
        where: { monitorId: id, checkedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
        _count: true,
      }),
      prisma.incident.findFirst({
        where: { monitorId: id },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.monitorCheck.findMany({
        where: { monitorId: id, checkedAt: { gte: from } },
        orderBy: { checkedAt: 'asc' },
        select: { checkedAt: true, latencyMs: true, status: true },
        take: 2000,
      }),
    ]);

    const uptimeFor = (
      rows: Array<{ status: string; _count: number }>,
    ) =>
      calculateUptimePercent({
        upCount: rows.find((r) => r.status === 'UP')?._count ?? 0,
        downCount: rows.find((r) => r.status === 'DOWN')?._count ?? 0,
      });

    return NextResponse.json({
      monitor,
      uptime: {
        h24: uptimeFor(counts24),
        d7: uptimeFor(counts7),
        d30: uptimeFor(counts30),
      },
      lastOutage: lastIncident?.startedAt ?? null,
      series: checks.map((check) => ({
        t: check.checkedAt.toISOString(),
        latency: check.latencyMs,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const body = updateMonitorSchema.parse(await request.json());
    const monitor = await updateMonitor(user.id, id, body);
    return NextResponse.json({ monitor });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    await deleteMonitor(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
