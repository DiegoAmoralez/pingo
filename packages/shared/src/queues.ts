export const QUEUE_NAMES = {
  websiteCheck: 'website-check',
  sslCheck: 'ssl-check',
  dnsCheck: 'dns-check',
  domainCheck: 'domain-check',
  sendNotification: 'send-notification',
  cleanupHistory: 'cleanup-history',
  firstCheck: 'first-check',
  dispatch: 'dispatch',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type WebsiteCheckJob = {
  monitorId: string;
  manual?: boolean;
};

export type SslCheckJob = {
  monitorId: string;
};

export type DnsCheckJob = {
  monitorId: string;
};

export type DomainCheckJob = {
  domainId: string;
};

export type FirstCheckJob = {
  monitorId: string;
};

export type SendNotificationJob = {
  notificationEventId: string;
};

export type CleanupHistoryJob = Record<string, never>;
