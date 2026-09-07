import IORedis from 'ioredis';

let connection: IORedis | null = null;

export function getRedis(): IORedis {
  if (connection) return connection;
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  return connection;
}

export async function redisPing(): Promise<boolean> {
  try {
    const result = await getRedis().ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
