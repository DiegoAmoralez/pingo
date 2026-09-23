'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PageHeader, ConfirmDialog } from '@/components/app-primitives';
import { useLocale } from '@/components/locale-provider';

type SettingsPayload = {
  user: { name: string; email: string; timezone: string };
  telegram: { connected: boolean; username: string | null };
  preferences: {
    websiteDowntime: boolean;
    websiteRecovery: boolean;
    sslExpiration: boolean;
    domainExpiration: boolean;
    dnsChanges: boolean;
  };
  subscription: { plan: string; status: string };
};

const TABS = ['profile', 'notifications', 'telegram', 'billing', 'security'] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function SettingsPage() {
  const { tr } = useLocale();
  return (
    <Suspense fallback={<p>{tr('Loading…', 'Загрузка…')}</p>}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const { tr } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SettingsPayload | null>(null);
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'profile');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState<string | null>(null);

  async function load() {
    const response = await fetch('/api/settings');
    setData(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const next = searchParams.get('tab');
    if (isTab(next) && next !== tab) setTab(next);
  }, [searchParams, tab]);

  function selectTab(next: Tab) {
    setTab(next);
    router.replace(`/settings?tab=${next}`, { scroll: false });
  }

  if (!data) return <p>{tr('Loading…', 'Загрузка…')}</p>;

  const tabLabels: Record<Tab, string> = {
    profile: tr('Profile', 'Профиль'),
    notifications: tr('Notifications', 'Уведомления'),
    telegram: 'Telegram',
    billing: tr('Billing', 'Оплата'),
    security: tr('Security', 'Безопасность'),
  };
  const planLabel: Record<string, string> = {
    FREE: tr('Free', 'Бесплатный'),
    PERSONAL: tr('Personal', 'Личный'),
    PRO: tr('Pro', 'Профессиональный'),
    AGENCY: tr('Agency', 'Агентство'),
  };
  const statusLabel: Record<string, string> = {
    ACTIVE: tr('Active', 'Активен'),
    TRIALING: tr('Trial', 'Пробный период'),
    PAST_DUE: tr('Past due', 'Просрочен'),
    CANCELED: tr('Canceled', 'Отменён'),
    INCOMPLETE: tr('Incomplete', 'Не завершён'),
  };

  return (
    <div className="space-y-8">
      <PageHeader title={tr('Settings', 'Настройки')} />
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white p-2">
        {TABS.map((item) => (
          <Button key={item} size="sm" variant={tab === item ? 'default' : 'secondary'} onClick={() => selectTab(item)}>
            {tabLabels[item]}
          </Button>
        ))}
      </div>

      <div key={tab} className="tab-panel">
        {tab === 'profile' ? (
          <form
            className="brand-card max-w-2xl space-y-5 rounded-3xl p-6 sm:p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  name: form.get('name'),
                  timezone: form.get('timezone'),
                }),
              });
              load();
            }}
          >
            <div>
              <Label htmlFor="name">{tr('Name', 'Имя')}</Label>
              <Input id="name" name="name" defaultValue={data.user.name} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={data.user.email} disabled />
            </div>
            <div>
              <Label htmlFor="timezone">{tr('Timezone', 'Часовой пояс')}</Label>
              <Input id="timezone" name="timezone" defaultValue={data.user.timezone} />
            </div>
            <Button type="submit">{tr('Save', 'Сохранить')}</Button>
          </form>
        ) : null}

        {tab === 'notifications' ? (
          <form
            className="brand-card max-w-2xl space-y-3 rounded-3xl p-6 sm:p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const value = (name: string) =>
                Boolean((form.elements.namedItem(name) as HTMLInputElement | null)?.checked);
              await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  websiteDowntime: value('websiteDowntime'),
                  websiteRecovery: value('websiteRecovery'),
                  sslExpiration: value('sslExpiration'),
                  domainExpiration: value('domainExpiration'),
                  dnsChanges: value('dnsChanges'),
                }),
              });
            }}
          >
            {([
              ['websiteDowntime', tr('Website downtime', 'Недоступность сайта')],
              ['websiteRecovery', tr('Website recovery', 'Восстановление сайта')],
              ['sslExpiration', tr('SSL expiration', 'Окончание SSL')],
              ['domainExpiration', tr('Domain expiration', 'Окончание домена')],
              ['dnsChanges', tr('DNS changes', 'Изменения DNS')],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-sm font-medium">
                {label}
                <input className="h-4 w-4 accent-[var(--accent)]" type="checkbox" name={key} defaultChecked={data.preferences[key]} />
              </label>
            ))}
            <Button type="submit">{tr('Save preferences', 'Сохранить настройки')}</Button>
          </form>
        ) : null}

        {tab === 'telegram' ? (
          <div className="brand-card max-w-2xl space-y-4 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-bold">Telegram</h2>
            {data.telegram.connected ? (
              <>
                <p>{tr('Connected', 'Подключён')}</p>
                <p className="text-muted">{data.telegram.username ? `@${data.telegram.username}` : tr('Linked chat', 'Привязанный чат')}</p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => fetch('/api/telegram/test', { method: 'POST' })}>
                    {tr('Send test notification', 'Отправить тест')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      await fetch('/api/telegram/connection', { method: 'DELETE' });
                      load();
                    }}
                  >
                    {tr('Disconnect', 'Отключить')}
                  </Button>
                </div>
              </>
            ) : (
              <Button
                type="button"
                onClick={async () => {
                  const response = await fetch('/api/telegram/connect-token', { method: 'POST' });
                  const json = await response.json();
                  if (json.url) window.open(json.url, '_blank');
                }}
              >
                {tr('Connect Telegram', 'Подключить Telegram')}
              </Button>
            )}
          </div>
        ) : null}

        {tab === 'billing' ? (
          <div className="brand-card max-w-2xl space-y-4 rounded-3xl p-6 sm:p-8">
            <p>
              {tr('Current plan:', 'Текущий тариф:')} <strong>{planLabel[data.subscription.plan] ?? data.subscription.plan}</strong>
            </p>
            <p className="text-sm text-muted">{tr('Status:', 'Статус:')} {statusLabel[data.subscription.status] ?? data.subscription.status}</p>
            <p className="text-sm text-muted">
              {tr('Stripe test mode. Card', 'Тестовый режим Stripe. Карта')} <code>4242 4242 4242 4242</code>, {tr('any future date, any CVC.', 'любая будущая дата и любой CVC.')}
            </p>
            {billingError ? <p className="text-sm text-crit">{billingError}</p> : null}
            <div className="flex flex-wrap gap-2">
              {(['PERSONAL', 'PRO', 'AGENCY'] as const).map((plan) => (
                <Button
                  key={plan}
                  type="button"
                  variant="secondary"
                  disabled={Boolean(billingLoading)}
                  onClick={async () => {
                    setBillingError(null);
                    setBillingLoading(plan);
                    try {
                      const response = await fetch('/api/billing/checkout', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ plan }),
                      });
                      const json = await response.json();
                      if (json.url) {
                        window.location.href = json.url;
                        return;
                      }
                      setBillingError(json.error ?? tr('Checkout is not available yet.', 'Оплата пока недоступна.'));
                    } finally {
                      setBillingLoading(null);
                    }
                  }}
                >
                  {billingLoading === plan ? tr('Opening Stripe…', 'Открываем Stripe…') : `${tr('Upgrade to', 'Перейти на')} ${plan}`}
                </Button>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(billingLoading)}
                onClick={async () => {
                  setBillingError(null);
                  setBillingLoading('portal');
                  try {
                    const response = await fetch('/api/billing/portal', { method: 'POST' });
                    const json = await response.json();
                    if (json.url) {
                      window.location.href = json.url;
                      return;
                    }
                    setBillingError(json.error ?? tr('Billing portal is not available yet.', 'Платёжный портал пока недоступен.'));
                  } finally {
                    setBillingLoading(null);
                  }
                }}
              >
                {billingLoading === 'portal' ? tr('Opening…', 'Открываем…') : tr('Manage billing', 'Управлять оплатой')}
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'security' ? (
          <div className="brand-card max-w-2xl space-y-4 rounded-3xl p-6 sm:p-8">
            <p className="text-sm text-muted">
              {tr('Password reset is available from the login screen. Deleting your account removes monitors, checks, Telegram links and billing customer mapping.', 'Сбросить пароль можно на экране входа. Удаление аккаунта удалит мониторы, проверки, привязку Telegram и платёжный профиль.')}
            </p>
            <Button variant="danger" type="button" onClick={() => setConfirmDelete(true)}>
              {tr('Delete account', 'Удалить аккаунт')}
            </Button>
          </div>
        ) : null}
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title={tr('Delete account?', 'Удалить аккаунт?')}
          description={tr('This permanently removes your PingoGo data.', 'Все ваши данные PingoGo будут удалены безвозвратно.')}
          confirmLabel={tr('Delete account', 'Удалить аккаунт')}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await fetch('/api/account', { method: 'DELETE' });
            window.location.href = '/';
          }}
        />
      ) : null}
    </div>
  );
}
