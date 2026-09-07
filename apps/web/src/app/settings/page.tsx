'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PageHeader, ConfirmDialog } from '@/components/app-primitives';

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
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
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

  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button key={item} size="sm" variant={tab === item ? 'default' : 'secondary'} onClick={() => selectTab(item)}>
            {item[0]!.toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>

      <div key={tab} className="tab-panel">
        {tab === 'profile' ? (
          <form
            className="max-w-lg space-y-4"
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
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={data.user.name} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={data.user.email} disabled />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue={data.user.timezone} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        ) : null}

        {tab === 'notifications' ? (
          <form
            className="max-w-lg space-y-3"
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
              ['websiteDowntime', 'Website downtime'],
              ['websiteRecovery', 'Website recovery'],
              ['sslExpiration', 'SSL expiration'],
              ['domainExpiration', 'Domain expiration'],
              ['dnsChanges', 'DNS changes'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={key} defaultChecked={data.preferences[key]} />
                {label}
              </label>
            ))}
            <Button type="submit">Save preferences</Button>
          </form>
        ) : null}

        {tab === 'telegram' ? (
          <div className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Telegram</h2>
            {data.telegram.connected ? (
              <>
                <p>Connected</p>
                <p className="text-muted">{data.telegram.username ? `@${data.telegram.username}` : 'Linked chat'}</p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => fetch('/api/telegram/test', { method: 'POST' })}>
                    Send test notification
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      await fetch('/api/telegram/connection', { method: 'DELETE' });
                      load();
                    }}
                  >
                    Disconnect
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
                Connect Telegram
              </Button>
            )}
          </div>
        ) : null}

        {tab === 'billing' ? (
          <div className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5">
            <p>
              Current plan: <strong>{data.subscription.plan}</strong>
            </p>
            <p className="text-sm text-muted">Status: {data.subscription.status}</p>
            <p className="text-sm text-muted">
              Stripe test mode. Card <code>4242 4242 4242 4242</code>, any future date, any CVC.
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
                      setBillingError(json.error ?? 'Checkout is not available yet.');
                    } finally {
                      setBillingLoading(null);
                    }
                  }}
                >
                  {billingLoading === plan ? 'Opening Stripe…' : `Upgrade to ${plan}`}
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
                    setBillingError(json.error ?? 'Billing portal is not available yet.');
                  } finally {
                    setBillingLoading(null);
                  }
                }}
              >
                {billingLoading === 'portal' ? 'Opening…' : 'Manage billing'}
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'security' ? (
          <div className="max-w-lg space-y-4">
            <p className="text-sm text-muted">
              Password reset is available from the login screen. Deleting your account removes monitors,
              checks, Telegram links and billing customer mapping.
            </p>
            <Button variant="danger" type="button" onClick={() => setConfirmDelete(true)}>
              Delete account
            </Button>
          </div>
        ) : null}
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title="Delete account?"
          description="This permanently removes your PINGO data."
          confirmLabel="Delete account"
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
