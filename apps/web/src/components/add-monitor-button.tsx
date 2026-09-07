'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';

export function AddMonitorButton({ label = '+ Add monitor' }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {label}
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
      setError(json.error ?? 'Could not add website');
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
        className="dialog-enter w-full max-w-lg rounded-3xl bg-card p-6 shadow-xl"
        role="dialog"
        aria-labelledby="add-monitor-title"
      >
        <h2 id="add-monitor-title" className="text-xl font-semibold">
          Add website
        </h2>
        <div className="mt-4 space-y-1">
          <Label htmlFor="url">Website URL</Label>
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
          {advanced ? 'Hide' : 'Advanced'} settings
        </button>
        {advanced ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="interval">Check interval</Label>
              <Input id="interval" value={interval} onChange={(e) => setInterval(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="timeout">Timeout</Label>
              <Input id="timeout" value={timeout} onChange={(e) => setTimeoutSeconds(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="expected">Expected HTTP</Label>
              <Input id="expected" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-crit">{error}</p> : null}
        {limit ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium">You&apos;ve reached your Free plan limit.</p>
            <p className="mt-1 text-muted">Upgrade to monitor more websites.</p>
            <Button className="mt-3" type="button" onClick={() => router.push('/settings?tab=billing')}>
              Upgrade
            </Button>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding…' : 'Start monitoring'}
          </Button>
        </div>
      </form>
    </div>
  );
}
