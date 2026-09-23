'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';
import { useLocale } from '@/components/locale-provider';

export function AddMonitorButton({ label }: { label?: string }) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {label ?? tr('+ Add monitor', '+ Добавить монитор')}
      </Button>
      {open ? <AddMonitorModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function AddMonitorModal({
  onClose,
  redirectTo,
}: {
  onClose: () => void;
  redirectTo?: string;
}) {
  const { tr } = useLocale();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [interval, setInterval] = useState('300');
  const [timeout, setTimeoutSeconds] = useState('10');
  const [expected, setExpected] = useState('200-399');
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setLimit(false);
    const response = await fetch('/api/monitors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        checkIntervalSeconds: Number(interval),
        timeoutSeconds: Number(timeout),
        expectedStatusCodes: expected,
      }),
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
    onClose();
    router.push(redirectTo ?? `/onboarding?monitor=${json.monitor.id}`);
    router.refresh();
  }

  return (
    <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        onSubmit={submit}
        className="dialog-enter w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-labelledby="add-monitor-title"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{tr('New monitor', 'Новый монитор')}</p>
        <h2 id="add-monitor-title" className="mt-2 text-2xl font-extrabold tracking-tight">
          {tr('Add website', 'Добавить сайт')}
        </h2>
        <p className="mt-2 text-sm text-muted">{tr('Paste a URL and we’ll check uptime, SSL, DNS and domain details.', 'Вставьте URL — мы проверим доступность, SSL, DNS и данные домена.')}</p>
        <div className="mt-4 space-y-1">
          <Label htmlFor="url">{tr('Website URL', 'URL сайта')}</Label>
          <Input
            id="url"
            placeholder="https://mywebsite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <button
          type="button"
          className="mt-4 text-sm text-muted"
          onClick={() => setAdvanced((v) => !v)}
        >
          {advanced ? tr('Hide settings', 'Скрыть настройки') : tr('Advanced settings', 'Расширенные настройки')}
        </button>
        {advanced ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="interval">{tr('Check interval', 'Интервал проверки')}</Label>
              <Input id="interval" value={interval} onChange={(e) => setInterval(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="timeout">{tr('Timeout', 'Тайм-аут')}</Label>
              <Input id="timeout" value={timeout} onChange={(e) => setTimeoutSeconds(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="expected">{tr('Expected HTTP', 'Ожидаемый HTTP')}</Label>
              <Input id="expected" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-crit">{error}</p> : null}
        {limit ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium">{tr("You've reached your Free plan limit.", 'Вы достигли лимита бесплатного тарифа.')}</p>
            <p className="mt-1 text-muted">{tr('Upgrade to monitor more websites.', 'Повысьте тариф, чтобы отслеживать больше сайтов.')}</p>
            <Button className="mt-3" type="button" onClick={() => router.push('/settings?tab=billing')}>
              {tr('Upgrade', 'Повысить тариф')}
            </Button>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr('Cancel', 'Отмена')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? tr('Adding…', 'Добавляем…') : tr('Start monitoring', 'Начать мониторинг')}
          </Button>
        </div>
      </form>
    </div>
  );
}
