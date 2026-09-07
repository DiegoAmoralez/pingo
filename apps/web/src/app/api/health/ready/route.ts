import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { redisPing } from '@pingo/shared/redis';

export async function GET() {
  const [db, redis, heartbeat] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redisPing(),
    prisma.workerHeartbeat.findUnique({ where: { id: 'primary' } }),
  ]);
  const workerFresh = heartbeat ? Date.now() - heartbeat.updatedAt.getTime() < 60_000 : false;
  const ready = db && redis && workerFresh;
  return NextResponse.json(
    { ready, database: db, redis, worker: workerFresh },
    { status: ready ? 200 : 503 },
  );
}
