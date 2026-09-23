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
import { useLocale } from '@/components/locale-provider';

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
  const { locale, tr } = useLocale();
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextRange = range) {
    const response = await fetch(`/api/monitors/${id}?range=${nextRange}`);
    if (!response.ok) {
      setError(tr('Could not load monitor', 'Не удалось загрузить монитор'));
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
  if (!data) return <p>{tr('Loading…', 'Загрузка…')}</p>;

  const { monitor, uptime, lastOutage, series } = data;
  const monitorStatus = monitor.status === 'UP'
    ? tr('Online', 'Доступен')
    : monitor.status === 'DOWN'
      ? tr('Down', 'Недоступен')
      : tr('Unknown', 'Неизвестно');
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
            label={monitorStatus}
          />
        }
        actions={
          <div className="flex gap-2">
            <Button onClick={checkNow} disabled={checking}>
              {checking ? tr('Checking...', 'Проверяем...') : tr('Check now', 'Проверить сейчас')}
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/monitors/${id}/settings`}>{tr('Settings', 'Настройки')}</Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label={tr('Status', 'Статус')} value={monitorStatus} />
        <MetricCard label={tr('HTTP response', 'HTTP-ответ')} value={monitor.currentHttpStatus ? String(monitor.currentHttpStatus) : '—'} />
        <MetricCard
          label={tr('Response time', 'Время ответа')}
          value={monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : '—'}
        />
        <MetricCard label={tr('Last check', 'Последняя проверка')} value={formatRelative(monitor.lastCheckedAt, 'UTC', locale)} />
        <MetricCard label={tr('Last outage', 'Последний сбой')} value={lastOutage ? formatRelative(lastOutage, 'UTC', locale) : tr('None', 'Не было')} />
        <MetricCard
          label={tr('Uptime', 'Доступность')}
          value={`${uptime.h24 ?? '—'}% / ${uptime.d7 ?? '—'}% / ${uptime.d30 ?? '—'}%`}
          hint="24h / 7d / 30d"
        />
      </section>

      <section className="brand-card rounded-3xl p-6">
        <h2 className="text-lg font-bold">{tr('SSL certificate', 'SSL-сертификат')}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">{tr('Issuer', 'Издатель')}</dt>
            <dd>{ssl?.issuer ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">{tr('Valid until', 'Действителен до')}</dt>
            <dd>{ssl?.validUntil ? new Date(ssl.validUntil).toUTCString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">{tr('Days remaining', 'Осталось дней')}</dt>
            <dd>{daysLabel(ssl?.daysRemaining, locale)}</dd>
          </div>
        </dl>
      </section>

      <section className="brand-card rounded-3xl p-6">
        <h2 className="text-lg font-bold">{tr('Domain registration', 'Регистрация домена')}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{tr('Registrar', 'Регистратор')}</dt>
            <dd>{monitor.domain?.registrar ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">{tr('Created', 'Создан')}</dt>
            <dd>{monitor.domain?.registeredAt ? new Date(monitor.domain.registeredAt).toUTCString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">{tr('Expires', 'Истекает')}</dt>
            <dd>
              {monitor.domain?.expiresAt
                ? new Date(monitor.domain.expiresAt).toUTCString()
                : monitor.domain?.lastError ?? tr('Unavailable', 'Недоступно')}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{tr('Days remaining', 'Осталось дней')}</dt>
            <dd>{daysLabel(domainDays, locale)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">{tr('Nameservers', 'Серверы имён')}</p>
        <p className="text-sm">{monitor.domain?.nameservers.join(', ') || '—'}</p>
      </section>

      <section className="brand-card rounded-3xl p-6">
        <h2 className="text-lg font-bold">{tr('DNS records', 'DNS-записи')}</h2>
        <div className="mt-4 space-y-2 text-sm">
          {['A', 'AAAA', 'CNAME', 'MX', 'NS'].map((type) => (
            <p key={type}>
              <span className="text-muted">{type}:</span> {(records[type] ?? []).join(', ') || '—'}
            </p>
          ))}
        </div>
      </section>

      <section className="brand-card rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{tr('Response time', 'Время ответа')}</h2>
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((item) => (
              <Button key={item} size="sm" variant={range === item ? 'default' : 'secondary'} onClick={() => setRange(item)}>
                {tr('Last', 'За')} {item}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe9df" />
              <XAxis dataKey="t" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#008a70" strokeWidth={3} dot={false} name="ms" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="brand-card rounded-3xl px-6">
        <h2 className="pt-6 text-lg font-bold">{tr('Incidents', 'События')}</h2>
        {monitor.incidents.length === 0 ? (
          <p className="py-6 text-sm text-muted">{tr('No incidents yet.', 'Событий пока нет.')}</p>
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
