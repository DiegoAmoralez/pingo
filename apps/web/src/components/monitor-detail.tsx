'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { MetricCard, PageHeader } from '@/components/app-primitives';
import { StatusBadge, monitorTone } from '@/components/status-badge';
import { IncidentRow } from '@/components/incident-row';
import { daysLabel, formatRelative } from '@/lib/utils';

type MonitorPayload = {
  monitor: {
    id: string;
    displayHostname: string;
    status: string;
    currentHttpStatus: number | null;
    currentLatencyMs: number | null;
    lastCheckedAt: string | null;
    lastErrorMessage: string | null;
    sslRecords: Array<{ issuer: string | null; validUntil: string | null; daysRemaining: number | null }>;
    domain: {
      registrar: string | null;
      registeredAt: string | null;
      expiresAt: string | null;
      nameservers: string[];
      lastError: string | null;
      events: Array<{ id: string; type: string; createdAt: string }>;
    } | null;
    incidents: Array<{
      id: string;
      reason: string | null;
      startedAt: string;
      endedAt: string | null;
      status: string;
    }>;
    dnsSnapshots: Array<{ records: Record<string, string[]> }>;
  };
  uptime: { h24: number | null; d7: number | null; d30: number | null };
  lastOutage: string | null;
  series: Array<{ t: string; latency: number | null }>;
};

export function MonitorDetail({ id }: { id: string }) {
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextRange = range) {
    const response = await fetch(`/api/monitors/${id}?range=${nextRange}`);
    if (!response.ok) {
      setError('Could not load monitor');
      return;
    }
    setData(await response.json());
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [id, range]);

  async function checkNow() {
    setChecking(true);
    await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
    setTimeout(() => {
      load();
      setChecking(false);
    }, 2500);
  }

  if (error) return <p className="text-crit">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { monitor, uptime, lastOutage, series } = data;
  const ssl = monitor.sslRecords[0];
  const domainDays = monitor.domain?.expiresAt
    ? Math.floor((new Date(monitor.domain.expiresAt).getTime() - Date.now()) / 86400000)
    : null;
  const records = monitor.dnsSnapshots[0]?.records ?? {};

  return (
    <div className="space-y-8">
      <PageHeader
        title={monitor.displayHostname}
        description={
          <StatusBadge
            tone={monitorTone(monitor.status, ssl?.daysRemaining, domainDays)}
            label={monitor.status === 'UP' ? 'Online' : monitor.status === 'DOWN' ? 'Down' : 'Unknown'}
          />
        }
        actions={
          <div className="flex gap-2">
            <Button onClick={checkNow} disabled={checking}>
              {checking ? 'Checking...' : 'Check now'}
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/monitors/${id}/settings`}>Settings</Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Status" value={monitor.status === 'UP' ? 'Online' : monitor.status} />
        <MetricCard label="HTTP response" value={monitor.currentHttpStatus ? String(monitor.currentHttpStatus) : '—'} />
        <MetricCard
          label="Response time"
          value={monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : '—'}
        />
        <MetricCard label="Last check" value={formatRelative(monitor.lastCheckedAt)} />
        <MetricCard label="Last outage" value={lastOutage ? formatRelative(lastOutage) : 'None'} />
        <MetricCard
          label="Uptime"
          value={`${uptime.h24 ?? '—'}% / ${uptime.d7 ?? '—'}% / ${uptime.d30 ?? '—'}%`}
          hint="24h / 7d / 30d"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">SSL</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Issuer</dt>
            <dd>{ssl?.issuer ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Valid until</dt>
            <dd>{ssl?.validUntil ? new Date(ssl.validUntil).toUTCString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Days remaining</dt>
            <dd>{daysLabel(ssl?.daysRemaining)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Domain</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Registrar</dt>
            <dd>{monitor.domain?.registrar ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd>{monitor.domain?.registeredAt ? new Date(monitor.domain.registeredAt).toUTCString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Expires</dt>
            <dd>
              {monitor.domain?.expiresAt
                ? new Date(monitor.domain.expiresAt).toUTCString()
                : monitor.domain?.lastError ?? 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Days remaining</dt>
            <dd>{daysLabel(domainDays)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">Nameservers</p>
        <p className="text-sm">{monitor.domain?.nameservers.join(', ') || '—'}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">DNS</h2>
        <div className="mt-4 space-y-2 text-sm">
          {['A', 'AAAA', 'CNAME', 'MX', 'NS'].map((type) => (
            <p key={type}>
              <span className="text-muted">{type}:</span> {(records[type] ?? []).join(', ') || '—'}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Response time</h2>
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((item) => (
              <Button key={item} size="sm" variant={range === item ? 'default' : 'secondary'} onClick={() => setRange(item)}>
                Last {item}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e1d8" />
              <XAxis dataKey="t" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#0f766e" dot={false} name="ms" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5">
        <h2 className="pt-5 font-semibold">Incidents</h2>
        {monitor.incidents.length === 0 ? (
          <p className="py-6 text-sm text-muted">No incidents yet.</p>
        ) : (
          monitor.incidents.map((incident) => (
            <IncidentRow
              key={incident.id}
              hostname={monitor.displayHostname}
              reason={incident.reason}
              startedAt={incident.startedAt}
              endedAt={incident.endedAt}
              status={incident.status}
            />
          ))
        )}
      </section>
    </div>
  );
}
