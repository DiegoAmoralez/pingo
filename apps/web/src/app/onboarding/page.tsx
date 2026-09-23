'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/locale-provider';

type Progress = {
  website: string;
  ssl: string;
  dns: string;
  domain: string;
};

function icon(status: string) {
  if (status === 'ok') return '✓';
  if (status === 'warn') return '⚠';
  if (status === 'error') return '✕';
  return '…';
}

function OnboardingInner() {
  const { tr } = useLocale();
  const labels: Record<string, string> = {
    website: tr('Checking website...', 'Проверяем сайт...'),
    ssl: tr('Checking SSL...', 'Проверяем SSL...'),
    dns: tr('Checking DNS...', 'Проверяем DNS...'),
    domain: tr('Checking domain...', 'Проверяем домен...'),
  };
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
      setError(json.error ?? tr('Could not add website', 'Не удалось добавить сайт'));
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
      <main className="brand-grid flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">{tr('Step 1 of 2', 'Шаг 1 из 2')}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">{tr('What should we monitor?', 'Что будем отслеживать?')}</h1>
        <p className="mt-3 text-sm text-muted">{tr('Add a public URL. We’ll discover SSL, DNS and domain details automatically.', 'Добавьте публичный URL. Мы автоматически определим SSL, DNS и данные домена.')}</p>
        <form className="brand-card mt-8 space-y-4 rounded-3xl p-6 sm:p-8" onSubmit={startMonitoring}>
          <Label htmlFor="url" className="sr-only">
            {tr('Website URL', 'URL сайта')}
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
              {tr("You've reached your plan limit.", 'Вы достигли лимита тарифа.')} <Link href="/settings?tab=billing">{tr('Upgrade', 'Повысить тариф')}</Link>
            </div>
          ) : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? tr('Starting…', 'Запускаем…') : tr('Start monitoring', 'Начать мониторинг')}
          </Button>
        </form>
        </div>
      </main>
    );
  }

  const progress = monitor?.firstCheckProgress;
  const domainDays = monitor?.domain?.expiresAt
    ? Math.floor((new Date(monitor.domain.expiresAt).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      {!monitor ? <p>{tr('Checking website...', 'Проверяем сайт...')}</p> : null}
      {progress && Object.values(progress).some((v) => v === 'pending') ? (
        <ul className="brand-card space-y-3 rounded-3xl p-6 text-lg">
          {(['website', 'ssl', 'dns', 'domain'] as const).map((key) => (
            <li key={key}>
              {icon(progress[key])}{' '}
              {progress[key] === 'pending'
                ? labels[key]
                : key === 'domain' && progress[key] === 'warn'
                  ? tr('⚠ Domain expiration unavailable', '⚠ Срок домена недоступен')
                  : `${icon(progress[key])} ${
                      key === 'website'
                        ? tr('Website online', 'Сайт доступен')
                        : key === 'ssl'
                          ? tr('SSL valid', 'SSL действителен')
                          : key === 'dns'
                            ? tr('DNS resolved', 'DNS разрешён')
                            : tr('Domain expiration', 'Срок домена')
                    }`}
            </li>
          ))}
        </ul>
      ) : null}

      {monitor && progress && Object.values(progress).every((v) => v !== 'pending') ? (
        <div className="space-y-8">
          <div className="brand-card rounded-3xl p-6">
            <h1 className="text-2xl font-extrabold">{monitor.displayHostname}</h1>
            <p className="mt-2">
              ● {monitor.status === 'UP' ? tr('Online', 'Доступен') : monitor.status === 'DOWN' ? tr('Down', 'Недоступен') : tr('Checking', 'Проверяем')}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">{tr('Response', 'Ответ')}</dt>
                <dd>{monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">SSL</dt>
                <dd>
                  {monitor.sslRecords[0]?.daysRemaining != null
                    ? `${monitor.sslRecords[0].daysRemaining} ${tr('days', 'дн.')}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{tr('Domain', 'Домен')}</dt>
                <dd>{domainDays != null ? `${domainDays} ${tr('days', 'дн.')}` : tr('Unavailable', 'Недоступно')}</dd>
              </div>
              <div>
                <dt className="text-muted">DNS</dt>
                <dd>OK</dd>
              </div>
            </dl>
          </div>
          <div className="brand-card rounded-3xl p-6">
            <h2 className="text-xl font-bold">{tr('Get alerts in Telegram', 'Получайте уведомления в Telegram')}</h2>
            <p className="mt-2 text-sm text-muted">
              {tr('Receive notifications immediately when your website, SSL, DNS or domain has a problem.', 'Сразу получайте уведомления о проблемах с сайтом, SSL, DNS или доменом.')}
            </p>
            {telegram.connected ? (
              <p className="mt-4 font-medium text-ok">{tr('Telegram connected ✓', 'Telegram подключён ✓')}</p>
            ) : (
              <Button className="mt-4" onClick={connectTelegram}>
                {tr('Connect Telegram', 'Подключить Telegram')}
              </Button>
            )}
          </div>
          <Button asChild variant="secondary">
            <Link href="/dashboard">{tr('Go to dashboard', 'Перейти в кабинет')}</Link>
          </Button>
        </div>
      ) : null}
    </main>
  );
}

export default function OnboardingPage() {
  const { tr } = useLocale();
  return (
    <Suspense fallback={<main className="p-8">{tr('Loading…', 'Загрузка…')}</main>}>
      <OnboardingInner />
    </Suspense>
  );
}
