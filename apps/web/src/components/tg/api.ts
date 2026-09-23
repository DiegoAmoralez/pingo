import type { Locale } from '@/lib/i18n';

export type MonitorStatus = 'UP' | 'DOWN' | 'UNKNOWN';

export type MonitorSummary = {
  id: string;
  name: string;
  url: string;
  displayHostname: string;
  status: MonitorStatus;
  currentHttpStatus: number | null;
  currentLatencyMs: number | null;
  lastCheckedAt: string | null;
  checkIntervalSeconds: number;
  pausedAt: string | null;
  lastErrorType: string | null;
  sslRecords: Array<{ daysRemaining: number | null; issuer: string | null; validUntil: string | null }>;
  domain: { expiresAt: string | null; registrar: string | null; displayDomain: string } | null;
};

export type IncidentSummary = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  reason: string | null;
  status: 'OPEN' | 'RESOLVED';
  monitor?: { id: string; displayHostname: string };
};

export type MonitorDetail = {
  monitor: MonitorSummary & {
    incidents: IncidentSummary[];
    dnsSnapshots: Array<{ records: Record<string, string[]> }>;
  };
  uptime: { h24: number | null; d7: number | null; d30: number | null };
  lastOutage: string | null;
  series: Array<{ t: string; latency: number | null }>;
};

export type Preferences = {
  websiteDowntime: boolean;
  websiteRecovery: boolean;
  sslExpiration: boolean;
  domainExpiration: boolean;
  dnsChanges: boolean;
};

export type AccountInfo = {
  user: { name: string; email: string; timezone: string };
  telegram: { connected: boolean; username: string | null };
  preferences: Preferences;
  subscription: { plan: PlanCode; status: string };
};

export type PlanCode = 'FREE' | 'PERSONAL' | 'PRO' | 'AGENCY';

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPriceCents: number;
  maxMonitors: number;
  minCheckIntervalSeconds: number;
  historyDays: number;
  popular?: boolean;
};

export type Bootstrap =
  | { status: 'unlinked'; locale: Locale; startParam: string | null }
  | {
      status: 'linked';
      token: string;
      locale: Locale;
      startParam: string | null;
      user: { name: string; email: string; timezone: string };
      plan: PlanCode;
    };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

async function parse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) {
    throw new ApiError(data.error ?? `Request failed (${response.status})`, response.status, data.code);
  }
  return data;
}

export async function bootstrap(initData: string): Promise<Bootstrap> {
  const response = await fetch('/api/telegram/webapp/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  return parse<Bootstrap>(response);
}

export async function linkAccount(input: {
  initData: string;
  email: string;
  password: string;
  locale: Locale;
}): Promise<Bootstrap> {
  const response = await fetch('/api/telegram/webapp/link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parse<Bootstrap>(response);
}

/** Authenticated API surface used by the Mini App. Mirrors the dashboard's REST routes. */
export function createApi(token: string) {
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    return parse<T>(response);
  };

  return {
    listMonitors: () => request<{ monitors: MonitorSummary[] }>('/api/monitors'),
    getMonitor: (id: string) => request<MonitorDetail>(`/api/monitors/${id}?range=24h`),
    addMonitor: (url: string) =>
      request<{ monitor: MonitorSummary }>('/api/monitors', { method: 'POST', body: JSON.stringify({ url }) }),
    setPaused: (id: string, paused: boolean) =>
      request<{ monitor: MonitorSummary }>(`/api/monitors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ paused }),
      }),
    deleteMonitor: (id: string) => request<{ ok: true }>(`/api/monitors/${id}`, { method: 'DELETE' }),
    checkNow: (id: string) => request<{ ok: true }>(`/api/monitors/${id}/check`, { method: 'POST' }),
    listIncidents: () => request<{ incidents: IncidentSummary[] }>('/api/incidents'),
    getAccount: () => request<AccountInfo>('/api/settings'),
    savePreferences: (prefs: Preferences) =>
      request<{ ok: true }>('/api/settings/notifications', { method: 'PATCH', body: JSON.stringify(prefs) }),
    setLocale: (locale: Locale) =>
      request<{ ok: true }>('/api/telegram/connection', { method: 'PATCH', body: JSON.stringify({ locale }) }),
    sendTest: () => request<{ ok: true }>('/api/telegram/test', { method: 'POST' }),
    listPlans: () => request<{ plans: PlanDefinition[] }>('/api/plans'),
    checkout: (plan: Exclude<PlanCode, 'FREE'>) =>
      request<{ url: string }>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
    portal: () => request<{ url: string }>('/api/billing/portal', { method: 'POST' }),
  };
}

export type Api = ReturnType<typeof createApi>;
