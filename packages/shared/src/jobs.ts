import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_BACKOFF_MS, QUEUE_JOB_ATTEMPTS } from './constants.js';
import {
  QUEUE_NAMES,
  type DnsCheckJob,
  type DomainCheckJob,
  type FirstCheckJob,
  type SendNotificationJob,
  type SslCheckJob,
  type WebsiteCheckJob,
} from './queues.js';
import { getRedis } from './redis.js';

const defaultJobOptions: JobsOptions = {
  attempts: QUEUE_JOB_ATTEMPTS,
  backoff: { type: 'exponential', delay: QUEUE_BACKOFF_MS },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

const queues = new Map<string, Queue>();

function queue(name: string): Queue {
  const existing = queues.get(name);
  if (existing) return existing;
  const created = new Queue(name, {
    connection: getRedis(),
    defaultJobOptions,
  });
  queues.set(name, created);
  return created;
}

export function websiteCheckQueue() {
  return queue(QUEUE_NAMES.websiteCheck);
}
export function sslCheckQueue() {
  return queue(QUEUE_NAMES.sslCheck);
}
export function dnsCheckQueue() {
  return queue(QUEUE_NAMES.dnsCheck);
}
export function domainCheckQueue() {
  return queue(QUEUE_NAMES.domainCheck);
}
export function notificationQueue() {
  return queue(QUEUE_NAMES.sendNotification);
}
export function cleanupQueue() {
  return queue(QUEUE_NAMES.cleanupHistory);
}
export function firstCheckQueue() {
  return queue(QUEUE_NAMES.firstCheck);
}
export function dispatchQueue() {
  return queue(QUEUE_NAMES.dispatch);
}

export async function enqueueWebsiteCheck(data: WebsiteCheckJob, opts?: JobsOptions) {
  await websiteCheckQueue().add('check', data, {
    jobId: data.manual ? `website-manual-${data.monitorId}-${Date.now()}` : `website-${data.monitorId}`,
    ...opts,
  });
}

export async function enqueueSslCheck(data: SslCheckJob) {
  await sslCheckQueue().add('check', data, { jobId: `ssl-${data.monitorId}` });
}

export async function enqueueDnsCheck(data: DnsCheckJob) {
  await dnsCheckQueue().add('check', data, { jobId: `dns-${data.monitorId}` });
}

export async function enqueueDomainCheck(data: DomainCheckJob) {
  await domainCheckQueue().add('check', data, { jobId: `domain-${data.domainId}` });
}

export async function enqueueFirstCheck(data: FirstCheckJob) {
  await firstCheckQueue().add('check', data, {
    jobId: `first-${data.monitorId}`,
    priority: 1,
  });
}

export async function enqueueNotification(data: SendNotificationJob) {
  await notificationQueue().add('send', data, { jobId: `notify-${data.notificationEventId}` });
}

export async function enqueueCleanup() {
  await cleanupQueue().add('cleanup', {}, { jobId: 'cleanup-history' });
}

export async function closeQueues() {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
