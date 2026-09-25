'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { ApiError, type AccountInfo, type Api, type IncidentSummary, type PlanCode, type PlanDefinition, type Preferences } from './api';
import { haptic, openExternal } from './telegram-sdk';
import type { TgStrings } from './strings';
import { Banner, Empty, PrimaryButton, Row, Section, Spinner, Toggle } from './ui';

type ScreenProps = { api: Api; t: TgStrings; locale: Locale; timeZone: string };

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(iso: string, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

function formatDuration(ms: number, locale: Locale): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = locale === 'ru' ? 'ч' : 'h';
  const m = locale === 'ru' ? 'мин' : 'min';
  if (hours === 0) return `${minutes} ${m}`;
  return rest ? `${hours} ${h} ${rest} ${m}` : `${hours} ${h}`;
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export function IncidentsScreen({
  api,
  t,
  locale,
  timeZone,
  monitorId,
  onOpenSite,
}: ScreenProps & { monitorId?: string; onOpenSite: (id: string) => void }) {
  const [incidents, setIncidents] = useState<IncidentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { incidents } = await api.listIncidents();
      setIncidents(monitorId ? incidents.filter((i) => i.monitor?.id === monitorId) : incidents);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, t.error));
    }
  }, [api, monitorId, t.error]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Banner tone="error">{error}</Banner>;
  if (!incidents) return <Spinner label={t.loading} />;

  return (
    <div className="tg-screen pt-2">
      <div className="mb-3 px-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.incidentsTitle}</h1>
      </div>
      <Section>
        {incidents.length === 0 ? (
          <Empty>{t.incidentsEmpty}</Empty>
        ) : (
          incidents.slice(0, 50).map((incident) => {
            const open = incident.status === 'OPEN';
            const duration = open
              ? t.ongoing
              : formatDuration(
                  incident.durationMs ??
                    (incident.endedAt ? new Date(incident.endedAt).getTime() - new Date(incident.startedAt).getTime() : 0),
                  locale,
                );
            return (
              <Row
                key={incident.id}
                onClick={incident.monitor ? () => onOpenSite(incident.monitor!.id) : undefined}
                leading={
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: open ? '#e04444' : '#18ad62' }}
                  />
                }
                label={incident.monitor?.displayHostname ?? '—'}
                hint={`${formatDateTime(incident.startedAt, locale, timeZone)}${incident.reason ? ` · ${incident.reason}` : ''}`}
                value={duration}
              />
            );
          })
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const PREF_KEYS: Array<keyof Preferences> = [
  'websiteDowntime',
  'websiteRecovery',
  'sslExpiration',
  'domainExpiration',
  'dnsChanges',
];

export function SettingsScreen({
  api,
  t,
  locale,
  onLocale,
  onPlan,
}: ScreenProps & { onLocale: (locale: Locale) => void; onPlan: () => void }) {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAccount(await api.getAccount());
      setError(null);
    } catch (e) {
      setError(errorMessage(e, t.error));
    }
  }, [api, t.error]);

  useEffect(() => {
    load();
  }, [load]);

  const prefLabel: Record<keyof Preferences, string> = {
    websiteDowntime: t.prefWebsiteDowntime,
    websiteRecovery: t.prefWebsiteRecovery,
    sslExpiration: t.prefSslExpiration,
    domainExpiration: t.prefDomainExpiration,
    dnsChanges: t.prefDnsChanges,
  };

  const handleToggle = async (key: keyof Preferences, next: boolean) => {
    if (!account) return;
    const prefs = { ...account.preferences, [key]: next };
    setAccount({ ...account, preferences: prefs });
    haptic('tap');
    try {
      await api.savePreferences(prefs);
    } catch (e) {
      haptic('error');
      setNotice(errorMessage(e, t.error));
      load();
    }
  };

  const handleTest = async () => {
    try {
      await api.sendTest();
      haptic('success');
      setNotice(t.testSent);
    } catch (e) {
      haptic('error');
      setNotice(errorMessage(e, t.error));
    }
  };

  const handleLocale = async (next: Locale) => {
    if (next === locale) return;
    haptic('tap');
    onLocale(next);
    try {
      await api.setLocale(next);
    } catch {
      // Language still applies to this session; the bot keeps its previous value.
    }
  };

  if (error) return <Banner tone="error">{error}</Banner>;
  if (!account) return <Spinner label={t.loading} />;

  return (
    <div className="tg-screen pt-2">
      <div className="mb-3 px-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.settingsTitle}</h1>
      </div>
      {notice ? <Banner tone="success">{notice}</Banner> : null}

      <Section title={t.notifications}>
        {PREF_KEYS.map((key) => (
          <Row
            key={key}
            label={prefLabel[key]}
            trailing={<Toggle checked={account.preferences[key]} onChange={(v) => handleToggle(key, v)} label={prefLabel[key]} />}
          />
        ))}
        <Row label={t.sendTest} onClick={handleTest} trailing={null} />
      </Section>

      <Section title={t.language}>
        <div className="flex gap-2 p-2">
          {(['en', 'ru'] as Locale[]).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={locale === code}
              onClick={() => handleLocale(code)}
              className={`h-10 flex-1 rounded-xl text-[14px] font-semibold transition-colors duration-150 ${
                locale === code ? 'tg-button' : 'tg-hint bg-[rgba(127,127,127,0.10)]'
              }`}
            >
              {code === 'en' ? 'English' : 'Русский'}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.plan}>
        <Row label={t.currentPlan} value={account.subscription.plan} onClick={onPlan} />
      </Section>

      <Section title={t.account}>
        <Row label={account.user.name} hint={account.user.email} />
        <Row label="Telegram" value={account.telegram.username ? `@${account.telegram.username}` : t.connected} />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export function PlanScreen({ api, t }: ScreenProps) {
  const [plans, setPlans] = useState<PlanDefinition[] | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listPlans(), api.getAccount(), api.listMonitors()])
      .then(([p, a, m]) => {
        setPlans(p.plans);
        setAccount(a);
        setActiveCount(m.monitors.filter((x) => !x.pausedAt).length);
      })
      .catch((e) => setError(errorMessage(e, t.error)));
  }, [api, t.error]);

  const handleUpgrade = async (code: PlanCode) => {
    if (code === 'FREE') return;
    setBusy(code);
    setNotice(t.openingCheckout);
    try {
      const { url } = await api.checkout(code);
      haptic('success');
      openExternal(url);
      setNotice(null);
    } catch (e) {
      haptic('error');
      setNotice(e instanceof ApiError && e.status === 503 ? t.billingUnavailable : errorMessage(e, t.error));
    } finally {
      setBusy(null);
    }
  };

  const handlePortal = async () => {
    setBusy('portal');
    try {
      const { url } = await api.portal();
      openExternal(url);
    } catch (e) {
      setNotice(e instanceof ApiError && e.status === 503 ? t.billingUnavailable : errorMessage(e, t.error));
    } finally {
      setBusy(null);
    }
  };

  if (error) return <Banner tone="error">{error}</Banner>;
  if (!plans || !account || activeCount == null) return <Spinner label={t.loading} />;

  const currentCode = account.subscription.plan;
  const current = plans.find((p) => p.code === currentCode) ?? plans[0]!;
  const price = (cents: number) => (cents === 0 ? '$0' : `$${(cents / 100).toFixed(2)}`);
  const order: PlanCode[] = ['FREE', 'PERSONAL', 'PRO', 'AGENCY'];
  const paid = order.indexOf(currentCode) > 0;
  const billingMode = account.billing?.mode ?? null;
  // An existing subscription is changed in the Customer Portal, not by a second Checkout.
  const changeViaPortal = paid && account.subscription.hasBillingProfile;

  return (
    <div className="tg-screen pt-2">
      <div className="mb-3 px-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.planTitle}</h1>
      </div>
      {billingMode === 'test' ? <Banner>{t.sandboxNotice}</Banner> : null}
      {notice ? <Banner>{notice}</Banner> : null}

      <Section title={t.currentPlan}>
        <Row label={current.name} value={`${price(current.monthlyPriceCents)}${t.perMonth}`} />
        <Row label={t.sitesUsed} value={`${activeCount}/${current.maxMonitors}`} />
        <Row label={t.minInterval} value={t.minutes(Math.round(current.minCheckIntervalSeconds / 60))} />
        <Row label={t.history} value={t.historyDays(current.historyDays)} />
        {account.subscription.hasBillingProfile ? (
          <Row label={t.manageBilling} onClick={busy ? undefined : handlePortal} />
        ) : null}
      </Section>

      <Section title={t.upgrade}>
        {plans
          .filter((p) => order.indexOf(p.code) > order.indexOf(currentCode))
          .map((plan) => (
            <div key={plan.code} className="tg-row px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[15px] font-semibold">{plan.name}</div>
                <div className="text-[15px] font-bold tabular-nums">
                  {price(plan.monthlyPriceCents)}
                  <span className="tg-hint text-[12px] font-medium">{t.perMonth}</span>
                </div>
              </div>
              <p className="tg-hint mt-0.5 text-[13px]">{plan.description}</p>
              <p className="tg-hint mt-1 text-[12px]">
                {t.sitesCount(plan.maxMonitors)} · {t.minutes(Math.round(plan.minCheckIntervalSeconds / 60))} ·{' '}
                {t.historyDays(plan.historyDays)}
              </p>
              <PrimaryButton
                className="mt-3 h-10"
                disabled={busy !== null || billingMode === null}
                onClick={() => (changeViaPortal ? handlePortal() : handleUpgrade(plan.code))}
              >
                {t.upgrade} → {plan.name}
              </PrimaryButton>
            </div>
          ))}
      </Section>
    </div>
  );
}
