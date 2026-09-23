import './env.js';
import { Worker } from 'bullmq';
import { QUEUE_NAMES, childLogger, logger } from '@pingo/shared';
import { cleanupQueue, dispatchQueue } from '@pingo/shared/jobs';
import { getRedis } from '@pingo/shared/redis';
import { prisma } from '@pingo/database';
import { processWebsiteCheck } from './jobs/website-check.js';
import { processSslCheck } from './jobs/ssl-check.js';
import { processDnsCheck } from './jobs/dns-check.js';
import { processDomainCheck } from './jobs/domain-check.js';
import { processFirstCheck } from './jobs/first-check.js';
import { processNotification } from './jobs/send-notification.js';
import { processCleanup } from './jobs/cleanup.js';
import { processDispatch } from './jobs/dispatch.js';
import { startTelegramRuntime, stopTelegramRuntime } from './telegram-runtime.js';

const log = childLogger({ service: 'worker' });

async function heartbeat() {
  await prisma.workerHeartbeat.upsert({
    where: { id: 'primary' },
    create: { id: 'primary', meta: { pid: process.pid } },
    update: { meta: { pid: process.pid, at: new Date().toISOString() } },
  });
}

async function main() {
  process.env.PINGO_SERVICE = 'worker';
  const connection = getRedis();

  const workers = [
    new Worker(QUEUE_NAMES.websiteCheck, (job) => processWebsiteCheck(job.data), { connection, concurrency: 20 }),
    new Worker(QUEUE_NAMES.sslCheck, (job) => processSslCheck(job.data), { connection, concurrency: 8 }),
    new Worker(QUEUE_NAMES.dnsCheck, (job) => processDnsCheck(job.data), { connection, concurrency: 8 }),
    new Worker(QUEUE_NAMES.domainCheck, (job) => processDomainCheck(job.data), { connection, concurrency: 4 }),
    new Worker(QUEUE_NAMES.firstCheck, (job) => processFirstCheck(job.data), { connection, concurrency: 8 }),
    new Worker(QUEUE_NAMES.sendNotification, (job) => processNotification(job.data), { connection, concurrency: 10 }),
    new Worker(QUEUE_NAMES.cleanupHistory, () => processCleanup(), { connection, concurrency: 1 }),
    new Worker(QUEUE_NAMES.dispatch, () => processDispatch(), { connection, concurrency: 1 }),
  ];

  for (const worker of workers) {
    worker.on('failed', (job, error) => {
      log.error(
        { err: error, queue: worker.name, jobId: job?.id, data: job?.data },
        'job failed',
      );
    });
    worker.on('completed', (job) => {
      log.debug({ queue: worker.name, jobId: job.id }, 'job completed');
    });
  }

  await dispatchQueue().add(
    'tick',
    {},
    { repeat: { every: 15_000 }, jobId: 'dispatch-tick' },
  );
  await cleanupQueue().add(
    'daily',
    {},
    { repeat: { pattern: '0 4 * * *' }, jobId: 'cleanup-daily' },
  );

  await heartbeat();
  setInterval(() => {
    heartbeat().catch((error) => log.error({ err: error }, 'heartbeat failed'));
  }, 10_000);

  await startTelegramRuntime();

  log.info('PINGO worker started');

  const shutdown = async () => {
    log.info('worker shutting down');
    await stopTelegramRuntime();
    await Promise.all(workers.map((w) => w.close()));
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error({ err: error }, 'worker crashed');
  process.exit(1);
});
