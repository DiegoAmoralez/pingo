'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Copy, CreditCard, FlaskConical, HelpCircle, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';
import type { StripeOverview, StripeModeOverview } from '@/server/stripe-admin';
import { setStripeModeAction, setupStripeCatalogAction, setupStripeWebhookAction, type StripeActionResult } from './actions';

type Mode = 'live' | 'test';

const PLAN_ORDER = ['PERSONAL', 'PRO', 'AGENCY'] as const;

export function StripePanel({ overview }: { overview: StripeOverview }) {
  const { tr, locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{ mode: Mode; value: string } | null>(null);
  const [confirmLive, setConfirmLive] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = overview.state.mode;
  const anyConfigured = overview.state.configured.length > 0;
  const isLive = active === 'live';

  const changedAt = overview.state.updatedAt
    ? new Date(overview.state.updatedAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-GB')
    : null;

  const applyResult = (result: StripeActionResult, mode: Mode) => {
    if (result.ok) {
      setNotice({ tone: 'ok', text: result.message });
      if (result.secret) setRevealedSecret({ mode, value: result.secret });
    } else {
      setNotice({ tone: 'error', text: result.error });
    }
  };

  const switchMode = (mode: Mode) => {
    if (mode === active || pending) return;
    if (mode === 'live' && !confirmLive) {
      setConfirmLive(true);
      return;
    }
    setConfirmLive(false);
    setNotice(null);
    startTransition(async () => {
      const result = await setStripeModeAction(mode);
      applyResult(result, mode);
      router.refresh();
    });
  };

  const runSetup = (kind: 'catalog' | 'webhook', mode: Mode) => {
    setBusy(`${kind}:${mode}`);
    setNotice(null);
    startTransition(async () => {
      const result = kind === 'catalog' ? await setupStripeCatalogAction(mode) : await setupStripeWebhookAction(mode);
      applyResult(result, mode);
      setBusy(null);
      router.refresh();
    });
  };

  const handleCopySecret = async () => {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSegmentKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, mode: Mode) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    switchMode(mode);
  };

  return (
    <section
      className={`rounded-3xl border p-6 transition-colors duration-300 ease-out sm:p-7 ${
        isLive ? 'border-accent/40 bg-[#eefbf1]' : 'border-border bg-card'
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.02em]">
            <CreditCard className="h-5 w-5 text-accent" aria-hidden />
            Stripe
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-foreground/75">
            {tr(
              'Which Stripe world checkout, the billing portal and plan limits use. Sandbox purchases do not count while live mode is on, and vice versa — nothing is deleted when you switch.',
              'В каком мире Stripe работают оплата, платёжный портал и лимиты тарифов. Тестовые подписки не действуют, пока включён боевой режим, и наоборот — при переключении ничего не удаляется.',
            )}
          </p>
          {changedAt ? (
            <p className="mt-2 text-xs text-muted">
              {tr('Last change', 'Последнее изменение')}: {changedAt}
              {overview.state.updatedBy ? ` · ${overview.state.updatedBy}` : ''}
            </p>
          ) : overview.state.mode ? (
            <p className="mt-2 text-xs text-muted">{tr('Default mode (not switched yet).', 'Режим по умолчанию (ещё не переключали).')}</p>
          ) : null}
        </div>

        {anyConfigured ? (
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="inline-flex rounded-full border border-border bg-white p-1" role="radiogroup" aria-label="Stripe mode">
              {(['test', 'live'] as Mode[]).map((mode) => {
                const configured = overview.state.configured.includes(mode);
                const selected = active === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    disabled={!configured || pending}
                    onClick={() => switchMode(mode)}
                    onKeyDown={(event) => handleSegmentKeyDown(event, mode)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-bold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? mode === 'live'
                          ? 'bg-accent text-white shadow-sm'
                          : 'bg-navy text-white shadow-sm'
                        : 'text-foreground hover:bg-soft-lime/60'
                    }`}
                  >
                    {mode === 'live' ? <CreditCard className="h-4 w-4" aria-hidden /> : <FlaskConical className="h-4 w-4" aria-hidden />}
                    {mode === 'live' ? tr('Live', 'Боевой') : tr('Sandbox', 'Тестовый')}
                  </button>
                );
              })}
            </div>
            <span className={`text-sm font-bold ${isLive ? 'text-accent' : 'text-navy'}`} aria-live="polite">
              {isLive ? tr('Real cards are charged', 'Списания с реальных карт') : tr('Test cards only', 'Только тестовые карты')}
            </span>
          </div>
        ) : (
          <p className="rounded-2xl bg-[#fff7e8] p-3 text-sm text-foreground/80">
            {tr(
              'No Stripe keys yet. Set STRIPE_TEST_SECRET_KEY and/or STRIPE_LIVE_SECRET_KEY to enable payments.',
              'Ключей Stripe нет. Задайте STRIPE_TEST_SECRET_KEY и/или STRIPE_LIVE_SECRET_KEY, чтобы включить оплату.',
            )}
          </p>
        )}
      </div>

      {confirmLive ? (
        <div className="step-in mt-5 flex flex-col gap-3 rounded-2xl border border-warn/40 bg-[#fff7e8] p-4 sm:flex-row sm:items-center sm:justify-between" role="alertdialog">
          <p className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
            <span>
              <strong>{tr('Switch to live mode?', 'Включить боевой режим?')}</strong>{' '}
              {tr(
                'Customers will be charged for real. Sandbox subscriptions stop granting plans immediately.',
                'Клиенты будут платить реальными деньгами. Тестовые подписки сразу перестанут давать тариф.',
              )}
            </span>
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmLive(false)}>
              {tr('Cancel', 'Отмена')}
            </Button>
            <Button type="button" size="sm" onClick={() => switchMode('live')} disabled={pending}>
              {tr('Yes, go live', 'Да, включить')}
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p className={`mt-5 text-sm ${notice.tone === 'ok' ? 'text-accent' : 'text-crit'}`} role="status">
          {notice.text}
        </p>
      ) : null}

      {revealedSecret ? (
        <div className="step-in mt-4 rounded-2xl border border-accent/30 bg-white p-4">
          <p className="text-sm font-bold">
            {tr('Webhook signing secret', 'Секрет подписи webhook')} · {revealedSecret.mode === 'live' ? tr('live', 'боевой') : tr('sandbox', 'тестовый')}
          </p>
          <p className="mt-1 text-xs text-muted">
            {tr(
              'Shown once. Put it into the environment variable below and redeploy; Stripe will not show it again.',
              'Показывается один раз. Положите в переменную окружения ниже и перезапустите деплой; Stripe его больше не покажет.',
            )}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl bg-soft-lime/60 px-3 py-2 text-xs">
              STRIPE_{revealedSecret.mode.toUpperCase()}_WEBHOOK_SECRET={revealedSecret.value}
            </code>
            <Button type="button" size="sm" variant="ghost" onClick={handleCopySecret} aria-label={tr('Copy secret', 'Скопировать секрет')}>
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? tr('Copied', 'Скопировано') : tr('Copy', 'Копировать')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {overview.modes.map((entry) => (
          <ModeCard
            key={entry.mode}
            entry={entry}
            active={active === entry.mode}
            busy={busy}
            pending={pending}
            onSetup={runSetup}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        {tr('Webhook URL for both modes', 'URL webhook для обоих режимов')}: <code>{overview.webhookUrl}</code>
        {overview.manualSubscriptions > 0
          ? ` · ${overview.manualSubscriptions} ${tr('manual subscription(s) apply in both modes', 'ручных подписок действуют в обоих режимах')}`
          : ''}
      </p>
    </section>
  );
}

function ModeCard({
  entry,
  active,
  busy,
  pending,
  onSetup,
}: {
  entry: StripeModeOverview;
  active: boolean;
  busy: string | null;
  pending: boolean;
  onSetup: (kind: 'catalog' | 'webhook', mode: Mode) => void;
}) {
  const { tr } = useLocale();
  const title = entry.mode === 'live' ? tr('Live', 'Боевой') : tr('Sandbox', 'Тестовый');
  const health = entry.health;
  const dollars = (cents: number | null) => (cents == null ? '—' : `$${(cents / 100).toFixed(2)}`);

  return (
    <article
      className={`rounded-2xl border bg-white p-5 transition-colors duration-200 ease-out ${
        active ? 'border-accent/50 shadow-sm' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-extrabold">
          {entry.mode === 'live' ? <CreditCard className="h-4 w-4 text-accent" aria-hidden /> : <FlaskConical className="h-4 w-4 text-navy" aria-hidden />}
          {title}
          {active ? (
            <span className="rounded-full bg-soft-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
              {tr('Active', 'Активен')}
            </span>
          ) : null}
        </h3>
        <span className="text-xs text-muted">
          {entry.subscriptions.paying} {tr('paying', 'платящих')} / {entry.subscriptions.total} {tr('rows', 'записей')}
        </span>
      </div>

      {!entry.configured ? (
        <p className="mt-3 text-sm text-muted">
          {tr('Not configured. Set', 'Не настроен. Задайте')} <code>STRIPE_{entry.mode.toUpperCase()}_SECRET_KEY</code>.
        </p>
      ) : health ? (
        <>
          <ul className="mt-3 space-y-1.5 text-sm">
            <StatusLine ok label={`${tr('Key', 'Ключ')} ${health.keyHint}${health.account ? ` · ${health.account.name ?? health.account.id}` : ''}`} />
            {health.error ? (
              <StatusLine ok={false} label={`${tr('Stripe API', 'Stripe API')}: ${health.error}`} />
            ) : (
              <>
                <StatusLine
                  ok={health.pricesReady}
                  label={
                    health.pricesReady
                      ? `${tr('Prices', 'Цены')}: ${PLAN_ORDER.map((plan) => `${plan} ${dollars(health.prices[plan].amountCents)}`).join(' · ')}`
                      : `${tr('Prices missing for', 'Нет цен для')}: ${PLAN_ORDER.filter((plan) => !health.prices[plan].priceId).join(', ')}`
                  }
                />
                <StatusLine
                  ok={health.portalConfigured === true}
                  unknown={health.portalConfigured === 'unknown'}
                  label={tr('Customer Portal configuration', 'Конфигурация Customer Portal')}
                />
                <StatusLine
                  ok={health.webhookEndpoint !== null && health.webhookEndpoint !== 'unknown'}
                  unknown={health.webhookEndpoint === 'unknown'}
                  label={
                    health.webhookEndpoint && health.webhookEndpoint !== 'unknown'
                      ? `${tr('Webhook endpoint', 'Webhook endpoint')} · ${health.webhookEndpoint.status} · ${health.webhookEndpoint.enabledEvents} ${tr('events', 'событий')}`
                      : tr('Webhook endpoint not registered in Stripe', 'Webhook endpoint не зарегистрирован в Stripe')
                  }
                />
                <StatusLine
                  ok={health.webhookSecretConfigured}
                  label={
                    health.webhookSecretConfigured
                      ? tr('Webhook secret configured', 'Секрет webhook задан')
                      : `${tr('Webhook secret missing', 'Нет секрета webhook')} (STRIPE_${entry.mode.toUpperCase()}_WEBHOOK_SECRET)`
                  }
                />
              </>
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => onSetup('catalog', entry.mode)}
            >
              <RefreshCw className={`h-4 w-4 ${busy === `catalog:${entry.mode}` ? 'animate-spin' : ''}`} aria-hidden />
              {health.pricesReady ? tr('Sync catalog', 'Синхронизировать каталог') : tr('Create products & prices', 'Создать продукты и цены')}
            </Button>
            {health.webhookEndpoint === null ? (
              <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => onSetup('webhook', entry.mode)}>
                <RefreshCw className={`h-4 w-4 ${busy === `webhook:${entry.mode}` ? 'animate-spin' : ''}`} aria-hidden />
                {tr('Register webhook', 'Зарегистрировать webhook')}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </article>
  );
}

function StatusLine({ ok, unknown = false, label }: { ok: boolean; unknown?: boolean; label: string }) {
  const Icon = unknown ? HelpCircle : ok ? CheckCircle2 : XCircle;
  const tone = unknown ? 'text-muted' : ok ? 'text-ok' : 'text-crit';
  return (
    <li className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden />
      <span className="break-words">{label}</span>
    </li>
  );
}
