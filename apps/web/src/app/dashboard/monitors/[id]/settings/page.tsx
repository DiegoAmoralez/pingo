'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ConfirmDialog, PageHeader } from '@/components/app-primitives';

export default function MonitorSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [interval, setInterval] = useState('300');
  const [timeout, setTimeoutSeconds] = useState('10');
  const [expected, setExpected] = useState('200-399');
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    params.then(({ id: nextId }) => {
      setId(nextId);
      fetch(`/api/monitors/${nextId}`)
        .then((r) => r.json())
        .then((json) => {
          const monitor = json.monitor;
          setName(monitor.name);
          setUrl(monitor.url);
          setInterval(String(monitor.checkIntervalSeconds));
          setTimeoutSeconds(String(monitor.timeoutSeconds));
          setExpected(monitor.expectedStatusCodes);
          setPaused(Boolean(monitor.pausedAt));
        });
    });
  }, [params]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await fetch(`/api/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        url,
        checkIntervalSeconds: Number(interval),
        timeoutSeconds: Number(timeout),
        expectedStatusCodes: expected,
        paused,
      }),
    });
    router.push(`/dashboard/monitors/${id}`);
    router.refresh();
  }

  async function destroy() {
    await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Monitor settings" />
      <form onSubmit={save} className="max-w-xl space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="url">URL</Label>
          <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="interval">Check interval (seconds)</Label>
          <Input id="interval" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="timeout">Timeout (seconds)</Label>
          <Input id="timeout" value={timeout} onChange={(e) => setTimeoutSeconds(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="expected">Expected HTTP codes</Label>
          <Input id="expected" value={expected} onChange={(e) => setExpected(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          Pause monitoring
        </label>
        <Button type="submit">Save</Button>
      </form>
      <section className="max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5">
        <h2 className="font-semibold text-crit">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">Delete this monitor and its check history.</p>
        <Button className="mt-4" variant="danger" type="button" onClick={() => setConfirm(true)}>
          Delete monitor
        </Button>
      </section>
      {confirm ? (
        <ConfirmDialog
          title="Delete monitor?"
          description="This cannot be undone."
          confirmLabel="Delete"
          onClose={() => setConfirm(false)}
          onConfirm={destroy}
        />
      ) : null}
    </div>
  );
}
