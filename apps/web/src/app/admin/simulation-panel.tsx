'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Globe, Info, Lock, RefreshCw, Server, ShieldAlert, SkipForward, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { useLocale } from '@/components/locale-provider';
import type { DownCause, SimulationScenario } from '@/server/simulate-incidents';
import { recentNotificationsAction, simulateIncidentAction, type SimulationActionResult } from './actions';

export type SimulationTarget = {
  id: string;
  email: string;
  plan: string;
  telegram: string | null;
  alertLocale: 'en' | 'ru';
  monitors: Array<{ id: string; hostname: string; status: string; paused: boolean }>;
};

const SSL_DAYS = [30, 14, 7, 3, 1, 0] as const;
const DOMAIN_DAYS = [90, 60, 30, 14, 7, 3, 1] as const;

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm font-semibold text-foreground outline-none transition-colors duration-200 ease-out focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20 disabled:opacity-50';

export function SimulationPanel({ targets }: { targets: SimulationTarget[] }) {
  const { tr } = useLocale();
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState(targets.find((t) => t.monitors.length > 0)?.id ?? targets[0]?.id ?? '');
  const account = useMemo(() => targets.find((t) => t.id === userId) ?? null, [targets, userId]);
  const [monitorId, setMonitorId] = useState(account?.monitors[0]?.id ?? '');
  const [scenario, setScenario] = useState<SimulationScenario>('down');
  const [cause, setCause] = useState<DownCause>('http_502');
  const [sslDays, setSslDays] = useState<number>(7);
  const [domainDays, setDomainDays] = useState<number>(14);
  const [result, setResult] = useState<SimulationActionResult | null>(null);

  const monitors = account?.monitors ?? [];
  const activeMonitorId = monitors.some((m) => m.id === monitorId) ? monitorId : (monitors[0]?.id ?? '');

  const scenarios: Array<{ id: SimulationScenario; icon: React.ReactNode; title: string; description: string }> = [
    { id: 'down', icon: <ShieldAlert className="h-4 w-4" />, title: tr('Site down', 'Сайт недоступен'), description: tr('Opens an incident and sends the downtime alert.', 'Открывает инцидент и шлёт уведомление о падении.') },
    { id: 'recovery', icon: <CheckCircle2 className="h-4 w-4" />, title: tr('Site recovered', 'Сайт восстановился'), description: tr('Resolves the open incident, sends the recovery alert.', 'Закрывает открытый инцидент, шлёт уведомление о восстановлении.') },
    { id: 'ssl', icon: <Lock className="h-4 w-4" />, title: tr('SSL expiring', 'SSL истекает'), description: tr('Sets the certificate expiry and sends the SSL alert.', 'Ставит срок сертификата и шлёт SSL-уведомление.') },
    { id: 'domain', icon: <Globe className="h-4 w-4" />, title: tr('Domain expiring', 'Домен истекает'), description: tr('Sets the domain expiry and sends the domain alert.', 'Ставит срок домена и шлёт уведомление о домене.') },
    { id: 'dns', icon: <Server className="h-4 w-4" />, title: tr('DNS changed', 'DNS изменился'), description: tr('New A record snapshot + DNS change alert.', 'Новый снимок A-записи + уведомление об изменении.') },
    { id: 'ns', icon: <Server className="h-4 w-4" />, title: tr('Nameservers changed', 'NS изменились'), description: tr('New NS snapshot + nameserver change alert.', 'Новый снимок NS + уведомление о смене NS.') },
    { id: 'all', icon: <Zap className="h-4 w-4" />, title: tr('Everything at once', 'Все проблемы сразу'), description: tr('Down + SSL 7d + domain 14d + DNS + NS. Recovery is separate.', 'Падение + SSL 7 дн. + домен 14 дн. + DNS + NS. Восстановление отдельно.') },
  ];

  const handleAccountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = targets.find((t) => t.id === event.target.value);
    setUserId(event.target.value);
    setMonitorId(next?.monitors[0]?.id ?? '');
    setResult(null);
  };

  const handleRun = () => {
    if (!account || !activeMonitorId) return;
    startTransition(async () => {
      const response = await simulateIncidentAction({
        userId: account.id,
        monitorId: activeMonitorId,
        scenario,
        cause,
        days: scenario === 'ssl' ? sslDays : scenario === 'domain' ? domainDays : undefined,
      });
      setResult(response);
    });
  };

  const handleRefresh = () => {
    if (!account) return;
    startTransition(async () => {
      const notifications = await recentNotificationsAction(account.id);
      setResult((prev) => ({ ok: prev?.ok ?? true, error: prev?.error ?? null, steps: prev?.steps ?? [], notifications }));
    });
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-[-0.02em]">{tr('Incident simulator', 'Симуляция инцидентов')}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-foreground/75">
            {tr(
              'Pick an account and one of its sites, then trigger a situation. It writes the same records the worker would and sends real Telegram alerts through the normal pipeline.',
              'Выберите аккаунт и его сайт, затем запустите ситуацию. Создаются те же записи, что и у воркера, и отправляются настоящие уведомления в Telegram через обычный конвейер.',
            )}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fff4df] px-3 py-1 text-xs font-bold text-[#b56a00]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {tr('Writes to production data', 'Пишет в боевые данные')}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="sim-account">{tr('Account', 'Аккаунт')}</Label>
          <select id="sim-account" className={selectClass} value={userId} onChange={handleAccountChange} disabled={pending}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.email} · {t.plan} · {t.monitors.length} {tr('sites', 'сайт(ов)')} · {t.telegram ? `TG ${t.telegram}` : tr('no Telegram', 'без Telegram')}
              </option>
            ))}
          </select>
          {account ? (
            <p className="mt-1.5 text-xs text-muted">
              {tr('Alert language', 'Язык уведомлений')}: {account.alertLocale.toUpperCase()}
              {account.telegram ? '' : ` · ${tr('alerts will be marked FAILED (no Telegram)', 'уведомления получат статус FAILED (нет Telegram)')}`}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="sim-monitor">{tr('Site', 'Сайт')}</Label>
          <select
            id="sim-monitor"
            className={selectClass}
            value={activeMonitorId}
            onChange={(event) => setMonitorId(event.target.value)}
            disabled={pending || monitors.length === 0}
          >
            {monitors.length === 0 ? <option value="">{tr('This account has no sites', 'У аккаунта нет сайтов')}</option> : null}
            {monitors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.hostname} · {m.status}{m.paused ? ` · ${tr('paused', 'на паузе')}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={tr('Scenario', 'Сценарий')}>
        {scenarios.map((item) => {
          const active = item.id === scenario;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={0}
              onClick={() => setScenario(item.id)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] ${
                active ? 'border-accent bg-soft-lime/60 shadow-sm' : 'border-border bg-white hover:border-accent/40'
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? 'bg-accent text-white' : 'bg-background text-accent'}`} aria-hidden>
                {item.icon}
              </span>
              <span className="text-sm font-bold">{item.title}</span>
              <span className="text-xs leading-5 text-muted">{item.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        {scenario === 'down' || scenario === 'all' ? (
          <div className="sm:w-72">
            <Label htmlFor="sim-cause">{tr('Failure type', 'Тип ошибки')}</Label>
            <select id="sim-cause" className={selectClass} value={cause} onChange={(e) => setCause(e.target.value as DownCause)} disabled={pending}>
              <option value="http_502">HTTP 502 Bad Gateway</option>
              <option value="http_500">HTTP 500 Internal Server Error</option>
              <option value="http_404">HTTP 404 Not Found</option>
              <option value="timeout">{tr('Connection timeout', 'Таймаут соединения')}</option>
              <option value="refused">{tr('Connection refused', 'Соединение отклонено')}</option>
              <option value="dns">{tr('DNS lookup failed', 'Ошибка DNS')}</option>
              <option value="tls">{tr('TLS handshake failed', 'Ошибка TLS')}</option>
            </select>
          </div>
        ) : null}
        {scenario === 'ssl' ? (
          <div className="sm:w-56">
            <Label htmlFor="sim-ssl-days">{tr('Days until SSL expiry', 'Дней до истечения SSL')}</Label>
            <select id="sim-ssl-days" className={selectClass} value={sslDays} onChange={(e) => setSslDays(Number(e.target.value))} disabled={pending}>
              {SSL_DAYS.map((d) => <option key={d} value={d}>{d === 0 ? tr('Expired today', 'Истёк сегодня') : d}</option>)}
            </select>
          </div>
        ) : null}
        {scenario === 'domain' ? (
          <div className="sm:w-56">
            <Label htmlFor="sim-domain-days">{tr('Days until domain expiry', 'Дней до истечения домена')}</Label>
            <select id="sim-domain-days" className={selectClass} value={domainDays} onChange={(e) => setDomainDays(Number(e.target.value))} disabled={pending}>
              {DOMAIN_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ) : null}
        <Button type="button" size="lg" onClick={handleRun} disabled={pending || !activeMonitorId} className="sm:ml-auto">
          <Zap className="h-4 w-4" aria-hidden />
          {pending ? tr('Running…', 'Выполняем…') : tr('Run scenario', 'Запустить сценарий')}
        </Button>
      </div>

      {result ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{tr('What happened', 'Что произошло')}</p>
            {result.error ? (
              <p className="mt-3 rounded-xl bg-crit/10 px-3 py-2 text-sm font-semibold text-crit">{result.error}</p>
            ) : null}
            <ul className="mt-3 space-y-2 text-sm">
              {result.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  {step.level === 'ok' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                  ) : step.level === 'skip' ? (
                    <SkipForward className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  )}
                  <span>{step.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-background p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{tr('Telegram deliveries', 'Доставка в Telegram')}</p>
              <Button type="button" variant="ghost" size="sm" onClick={handleRefresh} disabled={pending} aria-label={tr('Refresh', 'Обновить')}>
                <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} aria-hidden />
                {tr('Refresh', 'Обновить')}
              </Button>
            </div>
            {result.notifications.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{tr('No notifications yet.', 'Уведомлений пока нет.')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {result.notifications.map((n) => (
                  <li key={n.id} className="flex items-center gap-3 py-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                        n.status === 'SENT' ? 'bg-ok' : n.status === 'FAILED' ? 'bg-crit' : 'bg-warn'
                      }`}
                      aria-hidden
                    />
                    <span className="font-semibold">{n.type}</span>
                    <span className="truncate text-muted">{n.hostname ?? '—'}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {n.status} · {new Date(n.sentAt ?? n.createdAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
