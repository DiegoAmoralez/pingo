'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Locale } from '@/lib/i18n';
import { formatRelative } from '@/lib/utils';
import { ApiError, type Api, type MonitorDetail, type MonitorSummary } from './api';
import { haptic, confirmDialog } from './telegram-sdk';
import type { TgStrings } from './strings';
import { Banner, Empty, PrimaryButton, Row, Section, Sparkline, Spinner, Stat, StatusDot } from './ui';

type ScreenProps = { api: Api; t: TgStrings; locale: Locale; timeZone: string };

export function statusText(t: TgStrings, monitor: Pick<MonitorSummary, 'status' | 'pausedAt'>): string {
  if (monitor.pausedAt) return t.statusPaused;
  if (monitor.status === 'UP') return t.statusUp;
  if (monitor.status === 'DOWN') return t.statusDown;
  return t.statusUnknown;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// Sites list
// ---------------------------------------------------------------------------

export function SitesScreen({
  api,
  t,
  locale,
  onOpen,
  onAdd,
  refreshKey,
}: ScreenProps & { onOpen: (id: string) => void; onAdd: () => void; refreshKey: number }) {
  const [monitors, setMonitors] = useState<MonitorSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { monitors } = await api.listMonitors();
      setMonitors(monitors);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, t.error));
    }
  }, [api, t.error]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load, refreshKey]);

  if (error) {
    return (
      <div className="tg-screen">
        <Banner tone="error">{error}</Banner>
        <div className="px-4">
          <PrimaryButton onClick={load}>{t.retry}</PrimaryButton>
        </div>
      </div>
    );
  }
  if (!monitors) return <Spinner label={t.loading} />;

  const up = monitors.filter((m) => !m.pausedAt && m.status === 'UP').length;
  const down = monitors.filter((m) => !m.pausedAt && m.status === 'DOWN').length;
  const paused = monitors.filter((m) => m.pausedAt).length;

  return (
    <div className="tg-screen pt-2">
      <div className="mb-3 px-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.sitesTitle}</h1>
        {monitors.length > 0 ? <p className="tg-hint text-[14px]">{t.summary(up, down, paused)}</p> : null}
      </div>

      {monitors.length === 0 ? (
        <Section>
          <Empty>{t.sitesEmpty}</Empty>
        </Section>
      ) : (
        <Section>
          {monitors.map((monitor) => (
            <Row
              key={monitor.id}
              onClick={() => {
                haptic('tap');
                onOpen(monitor.id);
              }}
              leading={<StatusDot status={monitor.status} paused={Boolean(monitor.pausedAt)} />}
              label={monitor.name}
              hint={`${statusText(t, monitor)} · ${formatRelative(monitor.lastCheckedAt, 'UTC', locale)}`}
              value={
                !monitor.pausedAt && monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : undefined
              }
            />
          ))}
        </Section>
      )}

      <div className="px-4">
        <PrimaryButton onClick={onAdd}>＋ {t.addSite}</PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Site detail
// ---------------------------------------------------------------------------

export function SiteScreen({
  api,
  t,
  locale,
  timeZone,
  id,
  onDeleted,
  onIncidents,
}: ScreenProps & { id: string; onDeleted: () => void; onIncidents: (id: string) => void }) {
  const [detail, setDetail] = useState<MonitorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'check' | 'pause' | 'delete' | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await api.getMonitor(id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, t.error));
    }
  }, [api, id, t.error]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const handleCheck = async () => {
    setBusy('check');
    try {
      await api.checkNow(id);
      haptic('success');
      setNotice(t.checkQueued);
      setTimeout(load, 4000);
    } catch (e) {
      haptic('error');
      setNotice(errorMessage(e, t.error));
    } finally {
      setBusy(null);
    }
  };

  const handlePause = async () => {
    if (!detail) return;
    setBusy('pause');
    try {
      await api.setPaused(id, !detail.monitor.pausedAt);
      haptic('success');
      await load();
    } catch (e) {
      haptic('error');
      setNotice(errorMessage(e, t.error));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirmDialog(t.confirmDelete(detail.monitor.displayHostname));
    if (!ok) return;
    setBusy('delete');
    try {
      await api.deleteMonitor(id);
      haptic('success');
      onDeleted();
    } catch (e) {
      haptic('error');
      setNotice(errorMessage(e, t.error));
      setBusy(null);
    }
  };

  if (error) {
    return (
      <div className="tg-screen">
        <Banner tone="error">{error}</Banner>
        <div className="px-4">
          <PrimaryButton onClick={load}>{t.retry}</PrimaryButton>
        </div>
      </div>
    );
  }
  if (!detail) return <Spinner label={t.loading} />;

  const { monitor, uptime, lastOutage, series } = detail;
  const ssl = monitor.sslRecords[0];
  const domainDays = daysUntil(monitor.domain?.expiresAt);
  const dns = monitor.dnsSnapshots[0]?.records ?? {};
  const uptimeTone = (value: number | null) =>
    value == null ? undefined : value >= 99.9 ? 'ok' : value >= 99 ? 'warn' : 'crit';
  const pct = (value: number | null) => (value == null ? '—' : `${value.toFixed(2)}%`);

  return (
    <div className="tg-screen pt-2">
      <div className="mb-3 flex items-start gap-3 px-4">
        <div className="pt-2">
          <StatusDot status={monitor.status} paused={Boolean(monitor.pausedAt)} size={14} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[24px] font-extrabold tracking-tight">{monitor.name}</h1>
          <p className="tg-hint truncate text-[13px]">{monitor.url}</p>
          <p className="mt-1 text-[14px] font-semibold">{statusText(t, monitor)}</p>
        </div>
      </div>

      {notice ? <Banner>{notice}</Banner> : null}

      <Section>
        <div className="flex divide-x divide-[var(--tg-separator)]">
          <Stat label={t.uptime24} value={pct(uptime.h24)} tone={uptimeTone(uptime.h24)} />
          <Stat label={t.uptime7} value={pct(uptime.d7)} tone={uptimeTone(uptime.d7)} />
          <Stat label={t.uptime30} value={pct(uptime.d30)} tone={uptimeTone(uptime.d30)} />
        </div>
      </Section>

      <Section title={t.latencyChart}>
        <div className="px-3 pt-3">
          {series.length > 1 ? (
            <Sparkline points={series.map((p) => p.latency)} />
          ) : (
            <Empty>{t.noData}</Empty>
          )}
        </div>
        <Row label={t.response} value={monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : '—'} />
        <Row label={t.http} value={monitor.currentHttpStatus ?? '—'} />
        <Row label={t.lastCheck} value={monitor.lastCheckedAt ? formatRelative(monitor.lastCheckedAt, timeZone, locale) : t.notYet} />
        <Row label={t.lastOutage} value={lastOutage ? formatRelative(lastOutage, timeZone, locale) : t.never} />
        <Row label={t.interval} value={t.everyMin(Math.round(monitor.checkIntervalSeconds / 60))} />
      </Section>

      <Section>
        <Row
          label={t.ssl}
          hint={ssl?.issuer ? `${t.issuer}: ${ssl.issuer}` : undefined}
          value={
            ssl?.daysRemaining == null ? '—' : ssl.daysRemaining <= 0 ? t.expired : t.daysLeft(ssl.daysRemaining)
          }
        />
        <Row
          label={t.domain}
          hint={monitor.domain?.registrar ? `${t.registrar}: ${monitor.domain.registrar}` : monitor.domain?.displayDomain}
          value={domainDays == null ? '—' : domainDays <= 0 ? t.expired : t.daysLeft(domainDays)}
        />
        {Object.entries(dns)
          .filter(([, values]) => Array.isArray(values) && values.length > 0)
          .slice(0, 4)
          .map(([type, values]) => (
            <Row key={type} label={`${t.dns} · ${type}`} hint={values.join(', ')} />
          ))}
      </Section>

      <Section>
        <Row label={busy === 'check' ? t.checking : t.checkNow} onClick={busy ? undefined : handleCheck} trailing={null} />
        <Row label={monitor.pausedAt ? t.resume : t.pause} onClick={busy ? undefined : handlePause} trailing={null} />
        <Row label={t.siteIncidents} onClick={() => onIncidents(id)} />
        <Row label={t.delete} destructive onClick={busy ? undefined : handleDelete} trailing={null} />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add site
// ---------------------------------------------------------------------------

export function AddSiteScreen({ api, t, onAdded }: ScreenProps & { onAdded: (id: string) => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { monitor } = await api.addMonitor(url.trim());
      haptic('success');
      onAdded(monitor.id);
    } catch (e) {
      haptic('error');
      setError(errorMessage(e, t.error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tg-screen pt-2">
      <div className="mb-3 px-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.addTitle}</h1>
        <p className="tg-hint text-[14px]">{t.addBody}</p>
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Section>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.urlPlaceholder}
          aria-label={t.urlPlaceholder}
          className="h-13 w-full bg-transparent px-4 py-3.5 text-[16px] outline-none placeholder:opacity-50"
        />
      </Section>
      <div className="px-4">
        <PrimaryButton type="submit" disabled={busy || !url.trim()}>
          {busy ? t.adding : t.addSite}
        </PrimaryButton>
      </div>
    </form>
  );
}
