export type MonitorStatus = 'UP' | 'DOWN' | 'UNKNOWN';
export type CheckResultStatus = 'UP' | 'DOWN' | 'UNKNOWN';
export type IncidentStatus = 'OPEN' | 'RESOLVED';
export type FirstCheckItemStatus = 'pending' | 'ok' | 'warn' | 'error';

export type FirstCheckProgress = {
  website: FirstCheckItemStatus;
  ssl: FirstCheckItemStatus;
  dns: FirstCheckItemStatus;
  domain: FirstCheckItemStatus;
};

export type DnsRecords = {
  A: string[];
  AAAA: string[];
  CNAME: string[];
  MX: string[];
  NS: string[];
  TXT: string[];
};

export type DnsChange = {
  type: keyof DnsRecords;
  oldValues: string[];
  newValues: string[];
};

export type AnalyticsEventName =
  | 'user_registered'
  | 'monitor_created'
  | 'telegram_connected'
  | 'first_check_completed'
  | 'incident_started'
  | 'incident_recovered'
  | 'checkout_started'
  | 'subscription_created'
  | 'subscription_cancelled';
