'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Progress = {
  website: string;
  ssl: string;
  dns: string;
  domain: string;
};

const labels: Record<string, string> = {
  website: 'Checking website...',
  ssl: 'Checking SSL...',
  dns: 'Checking DNS...',
  domain: 'Checking domain...',
};

function icon(status: string) {
  if (status === 'ok') return '✓';
  if (status === 'warn') return '⚠';
  if (status === 'error') return '✕';
  return '…';
}

function OnboardingInner() {
  const params = useSearchParams();
  const router = useRouter();
  const monitorId = params.get('monitor');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [monitor, setMonitor] = useState<{
    id: string;
    displayHostname: string;
    status: string;
    currentLatencyMs: number | null;
    firstCheckProgress: Progress | null;
    sslRecords: Array<{ daysRemaining: number | null }>;
    domain: { expiresAt: string | null } | null;
  } | null>(null);
  const [telegram, setTelegram] = useState<{ connected: boolean }>({ connected: false });

  useEffect(() => {
    if (!monitorId) return;
    let cancelled = false;
    async function poll() {
      const response = await fetch(`/api/monitors/${monitorId}`);
      if (!response.ok || cancelled) return;
      const json = await response.json();
      setMonitor(json.monitor);
    }
    poll();
    const timer = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [monitorId]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch('/api/telegram/connection');
      if (response.ok) {
        const json = await response.json();
        if (json.connected) setTelegram({ connected: true });
      }
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  async function startMonitoring(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setLimit(false);
    const response = await fetch('/api/monitors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await response.json();
    setLoading(false);
    if (response.status === 402) {
      setLimit(true);
      return;
    }
    if (!response.ok) {
      setError(json.error ?? 'Could not add website');
      return;
    }
    router.push(`/onboarding?monitor=${json.monitor.id}`);
  }

  async function connectTelegram() {
    const response = await fetch('/api/telegram/connect-token', { method: 'POST' });
    const json = await response.json();
    if (json.url) window.open(json.url, '_blank');
  }

  if (!monitorId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold">What should we monitor?</h1>
        <form className="mt-8 space-y-4" onSubmit={startMonitoring}>
          <Label htmlFor="url" className="sr-only">
            Website URL
          </Label>
          <Input
            id="url"
            placeholder="https://mywebsite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-crit">{error}</p> : null}
          {limit ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
              You&apos;ve reached your plan limit. <Link href="/settings?tab=billing">Upgrade</Link>
            </div>
          ) : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Starting…' : 'Start monitoring'}
          </Button>
        </form>
      </main>
    );
  }

  const progress = monitor?.firstCheckProgress;
  const domainDays = monitor?.domain?.expiresAt
    ? Math.floor((new Date(monitor.domain.expiresAt).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      {!monitor ? <p>Checking website...</p> : null}
      {progress && Object.values(progress).some((v) => v === 'pending') ? (
        <ul className="space-y-3 text-lg">
          {(['website', 'ssl', 'dns', 'domain'] as const).map((key) => (
            <li key={key}>
              {icon(progress[key])}{' '}
              {progress[key] === 'pending'
                ? labels[key]
                : key === 'domain' && progress[key] === 'warn'
                  ? '⚠ Domain expiration unavailable'
                  : `${icon(progress[key])} ${
                      key === 'website'
                        ? 'Website online'
                        : key === 'ssl'
                          ? 'SSL valid'
                          : key === 'dns'
                            ? 'DNS resolved'
                            : 'Domain expiration'
                    }`}
            </li>
          ))}
        </ul>
      ) : null}

      {monitor && progress && Object.values(progress).every((v) => v !== 'pending') ? (
        <div className="space-y-8">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h1 className="text-2xl font-semibold">{monitor.displayHostname}</h1>
            <p className="mt-2">
              ● {monitor.status === 'UP' ? 'Online' : monitor.status === 'DOWN' ? 'Down' : 'Checking'}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">Response</dt>
                <dd>{monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">SSL</dt>
                <dd>
                  {monitor.sslRecords[0]?.daysRemaining != null
                    ? `${monitor.sslRecords[0].daysRemaining} days`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Domain</dt>
                <dd>{domainDays != null ? `${domainDays} days` : 'Unavailable'}</dd>
              </div>
              <div>
                <dt className="text-muted">DNS</dt>
                <dd>OK</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Get alerts in Telegram</h2>
            <p className="mt-2 text-sm text-muted">
              Receive notifications immediately when your website, SSL, DNS or domain has a problem.
            </p>
            {telegram.connected ? (
              <p className="mt-4 font-medium text-ok">Telegram connected ✓</p>
            ) : (
              <Button className="mt-4" onClick={connectTelegram}>
                Connect Telegram
              </Button>
            )}
          </div>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      ) : null}
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading…</main>}>
      <OnboardingInner />
    </Suspense>
  );
}
