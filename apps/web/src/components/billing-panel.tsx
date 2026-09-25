'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, CreditCard, FlaskConical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';

type PlanCode = 'FREE' | 'PERSONAL' | 'PRO' | 'AGENCY';
type PaidPlan = Exclude<PlanCode, 'FREE'>;
type BillingMode = 'live' | 'test' | null;

type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPriceCents: number;
  maxMonitors: number;
  minCheckIntervalSeconds: number;
  historyDays: number;
  multipleNotificationDestinations: boolean;
  popular?: boolean;
};

export type BillingSubscription = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingProfile: boolean;
};

type Props = {
  subscription: BillingSubscription;
  mode: BillingMode;
  /** Called after returning from Stripe so the parent re-reads the plan. */
  onRefresh: () => Promise<void>;
};

const PLAN_ORDER: PlanCode[] = ['FREE', 'PERSONAL', 'PRO', 'AGENCY'];

function price(cents: number): string {
  return cents === 0 ? '$0' : `$${(cents / 100).toFixed(2)}`;
}

export function BillingPanel({ subscription, mode, onRefresh }: Props) {
  const { tr, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanDefinition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'success' | 'cancel' | null>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then((response) => response.json())
      .then((json: { plans: PlanDefinition[] }) => setPlans(json.plans))
      .catch(() => setPlans([]));
  }, []);

  // Stripe redirects back with ?checkout=success|cancel. Show it once, then clean the URL.
  useEffect(() => {
    const result = searchParams.get('checkout');
    if (result !== 'success' && result !== 'cancel') return;
    setOutcome(result);
    router.replace('/settings?tab=billing', { scroll: false });
    if (result === 'success') {
      // The webhook usually lands within a second or two; re-read the plan a couple of times.
      const timers = [1500, 4000].map((delay) => setTimeout(() => void onRefresh(), delay));
      return () => timers.forEach(clearTimeout);
    }
  }, [searchParams, router, onRefresh]);

  const planLabel: Record<string, string> = {
    FREE: tr('Free', 'Бесплатный'),
    PERSONAL: tr('Personal', 'Личный'),
    PRO: tr('Pro', 'Про'),
    AGENCY: tr('Agency', 'Агентство'),
  };
  const statusLabel: Record<string, string> = {
    NONE: tr('No subscription', 'Без подписки'),
    ACTIVE: tr('Active', 'Активна'),
    TRIALING: tr('Trial', 'Пробный период'),
    PAST_DUE: tr('Payment overdue', 'Платёж просрочен'),
    CANCELED: tr('Canceled', 'Отменена'),
    UNPAID: tr('Unpaid', 'Не оплачена'),
    INCOMPLETE: tr('Incomplete', 'Не завершена'),
  };

  const currentIndex = PLAN_ORDER.indexOf(subscription.plan as PlanCode);
  const isPaid = currentIndex > 0;
  // An existing subscription is changed in the Customer Portal (prorated), not by a second Checkout.
  const changeViaPortal = isPaid && subscription.hasBillingProfile;
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleCheckout = async (plan: PaidPlan) => {
    setError(null);
    setBusy(plan);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan, source: 'web' }),
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error ?? tr('Checkout is not available right now.', 'Оплата сейчас недоступна.'));
    } catch {
      setError(tr('Could not reach the server.', 'Не удалось связаться с сервером.'));
    } finally {
      setBusy(null);
    }
  };

  const handlePortal = async () => {
    setError(null);
    setBusy('portal');
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const json = (await response.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error ?? tr('Billing portal is not available right now.', 'Платёжный портал сейчас недоступен.'));
    } catch {
      setError(tr('Could not reach the server.', 'Не удалось связаться с сервером.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      {outcome === 'success' ? (
        <div className="step-in flex items-start gap-3 rounded-2xl border border-ok/30 bg-[#eefbf1] p-4" role="status">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ok text-white">
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-bold">{tr('Payment received.', 'Оплата прошла.')}</p>
            <p className="text-sm text-muted">
              {tr(
                'Your plan updates within a few seconds. The receipt is on its way to your inbox.',
                'Тариф обновится в течение нескольких секунд. Чек уже летит на почту.',
              )}
            </p>
          </div>
        </div>
      ) : null}
      {outcome === 'cancel' ? (
        <div className="step-in rounded-2xl border border-border bg-white p-4 text-sm" role="status">
          {tr('Checkout canceled — nothing was charged.', 'Оплата отменена — деньги не списаны.')}
        </div>
      ) : null}

      <div className="brand-card rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{tr('Current plan', 'Текущий тариф')}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">
              {planLabel[subscription.plan] ?? subscription.plan}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {statusLabel[subscription.status] ?? subscription.status}
              {periodEnd && isPaid
                ? ` · ${subscription.cancelAtPeriodEnd ? tr('ends', 'заканчивается') : tr('renews', 'продлится')} ${periodEnd}`
                : ''}
            </p>
          </div>
          {subscription.hasBillingProfile ? (
            <Button type="button" variant="secondary" disabled={busy !== null} onClick={handlePortal}>
              <CreditCard className="h-4 w-4" aria-hidden />
              {busy === 'portal' ? tr('Opening…', 'Открываем…') : tr('Manage billing', 'Управлять оплатой')}
            </Button>
          ) : null}
        </div>

        {mode === 'test' ? (
          <p className="mt-5 flex items-start gap-2 rounded-2xl bg-soft-lime/70 p-3 text-sm">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span>
              <strong>{tr('Sandbox mode.', 'Тестовый режим.')}</strong>{' '}
              {tr('No real charges. Use card', 'Реальных списаний нет. Карта')} <code>4242 4242 4242 4242</code>,{' '}
              {tr('any future date, any CVC.', 'любая будущая дата и любой CVC.')}
            </span>
          </p>
        ) : null}
        {mode === null ? (
          <p className="mt-5 rounded-2xl bg-[#fff7e8] p-3 text-sm text-foreground/80">
            {tr('Payments are not enabled yet. Plans will become available shortly.', 'Оплата пока не подключена. Тарифы скоро станут доступны.')}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-crit" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {plans === null ? (
        <p className="text-sm text-muted">{tr('Loading plans…', 'Загружаем тарифы…')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans
            .filter((plan) => plan.code !== 'FREE')
            .map((plan) => {
              const index = PLAN_ORDER.indexOf(plan.code);
              const isCurrent = plan.code === subscription.plan;
              const isDowngrade = index < currentIndex;
              const disabled = busy !== null || mode === null || isCurrent;
              return (
                <article
                  key={plan.code}
                  className={`brand-card relative flex flex-col rounded-3xl p-6 transition-transform duration-200 ease-out ${
                    isCurrent ? 'ring-2 ring-accent' : 'hover:-translate-y-1'
                  }`}
                >
                  {plan.popular && !isCurrent ? (
                    <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-navy">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {tr('Popular', 'Популярный')}
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="absolute right-5 top-5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                      {tr('Your plan', 'Ваш тариф')}
                    </span>
                  ) : null}
                  <h3 className="text-xl font-extrabold tracking-[-0.02em]">{planLabel[plan.code] ?? plan.name}</h3>
                  <p className="mt-1 text-sm text-muted">{plan.description}</p>
                  <p className="mt-4 text-3xl font-extrabold tracking-[-0.03em]">
                    {price(plan.monthlyPriceCents)}
                    <span className="text-sm font-semibold text-muted">{tr('/month', '/мес')}</span>
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" aria-hidden />
                      {plan.maxMonitors} {tr('websites', 'сайтов')}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" aria-hidden />
                      {tr('Checks every', 'Проверка каждые')} {Math.round(plan.minCheckIntervalSeconds / 60)} {tr('min', 'мин')}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" aria-hidden />
                      {plan.historyDays} {tr('days of history', 'дней истории')}
                    </li>
                  </ul>
                  <Button
                    type="button"
                    variant={plan.popular && !isCurrent ? 'default' : 'secondary'}
                    className="mt-6"
                    disabled={disabled}
                    onClick={() => (changeViaPortal ? handlePortal() : handleCheckout(plan.code as PaidPlan))}
                  >
                    {busy === plan.code || (changeViaPortal && busy === 'portal')
                      ? tr('Opening Stripe…', 'Открываем Stripe…')
                      : isCurrent
                        ? tr('Current plan', 'Текущий тариф')
                        : isDowngrade
                          ? `${tr('Switch to', 'Перейти на')} ${planLabel[plan.code] ?? plan.name}`
                          : `${tr('Upgrade to', 'Перейти на')} ${planLabel[plan.code] ?? plan.name}`}
                  </Button>
                </article>
              );
            })}
        </div>
      )}
    </div>
  );
}
