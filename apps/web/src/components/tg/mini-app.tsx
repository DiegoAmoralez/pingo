'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { bootstrap as bootstrapRequest, createApi, isMaintenanceError, type Bootstrap } from './api';
import { LoginScreen } from './login-screen';
import { TelegramMaintenanceScreen } from './maintenance-screen';
import { AddSiteScreen, SiteScreen, SitesScreen } from './screens-sites';
import { IncidentsScreen, PlanScreen, SettingsScreen } from './screens-more';
import { tgStrings } from './strings';
import { getWebApp, haptic, openExternal } from './telegram-sdk';
import { PrimaryButton, Spinner } from './ui';

type Screen =
  | { name: 'sites' }
  | { name: 'site'; id: string }
  | { name: 'add' }
  | { name: 'incidents'; monitorId?: string }
  | { name: 'settings' }
  | { name: 'plan' };

type Tab = 'sites' | 'incidents' | 'settings';

type Linked = Extract<Bootstrap, { status: 'linked' }>;

type Phase =
  | { kind: 'loading' }
  | { kind: 'outside' }
  | { kind: 'maintenance' }
  | { kind: 'error'; message: string }
  | { kind: 'unlinked'; initData: string; locale: Locale; startParam: string | null }
  | { kind: 'ready'; session: Linked };

function tabOf(screen: Screen): Tab {
  if (screen.name === 'incidents') return 'incidents';
  if (screen.name === 'settings' || screen.name === 'plan') return 'settings';
  return 'sites';
}

function initialScreen(startParam: string | null): Screen {
  const fromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('monitor') : null;
  const fromStart = startParam?.startsWith('monitor_') ? startParam.slice('monitor_'.length) : null;
  const id = fromQuery ?? fromStart;
  return id ? { name: 'site', id } : { name: 'sites' };
}

export function TelegramMiniApp() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [locale, setLocale] = useState<Locale>('en');
  const [stack, setStack] = useState<Screen[]>([{ name: 'sites' }]);
  const [refreshKey, setRefreshKey] = useState(0);
  const t = useMemo(() => tgStrings(locale), [locale]);

  const screen = stack[stack.length - 1] ?? { name: 'sites' };

  const push = useCallback((next: Screen) => setStack((s) => [...s, next]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((next: Screen) => setStack([next]), []);

  // Bootstrap: verify initData on the server and pick locale.
  useEffect(() => {
    const app = getWebApp();
    if (!app) {
      const browserLocale: Locale = navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
      setLocale(browserLocale);
      setPhase({ kind: 'outside' });
      return;
    }
    app.ready();
    app.expand();

    bootstrapRequest(app.initData)
      .then((result) => {
        setLocale(result.locale);
        document.documentElement.lang = result.locale;
        if (result.status === 'linked') {
          setStack([initialScreen(result.startParam)]);
          setPhase({ kind: 'ready', session: result });
        } else {
          setPhase({ kind: 'unlinked', initData: app.initData, locale: result.locale, startParam: result.startParam });
        }
      })
      .catch((error: Error) =>
        setPhase(isMaintenanceError(error) ? { kind: 'maintenance' } : { kind: 'error', message: error.message }),
      );
  }, []);

  // Telegram's native back button mirrors our navigation stack.
  const popRef = useRef(pop);
  popRef.current = pop;
  useEffect(() => {
    const app = getWebApp();
    if (!app) return;
    const handler = () => {
      haptic('tap');
      popRef.current();
    };
    if (stack.length > 1) {
      app.BackButton.show();
      app.BackButton.onClick(handler);
    } else {
      app.BackButton.hide();
    }
    return () => app.BackButton.offClick(handler);
  }, [stack.length]);

  const api = useMemo(
    () => (phase.kind === 'ready' ? createApi(phase.session.token, () => setPhase({ kind: 'maintenance' })) : null),
    [phase],
  );

  if (phase.kind === 'maintenance') {
    return <TelegramMaintenanceScreen />;
  }

  if (phase.kind === 'loading') {
    return (
      <div className="tg-app">
        <Spinner label={t.loading} />
      </div>
    );
  }

  if (phase.kind === 'outside') {
    return (
      <div className="tg-app flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <p className="text-[18px] font-bold">{t.notInTelegram}</p>
        <p className="tg-hint mt-2 text-[14px]">{t.notInTelegramHint}</p>
        <div className="mt-6 w-full max-w-xs">
          <PrimaryButton onClick={() => (window.location.href = '/dashboard')}>{t.openDashboard}</PrimaryButton>
        </div>
      </div>
    );
  }

  if (phase.kind === 'error') {
    return (
      <div className="tg-app flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <p className="text-[16px] font-semibold">{phase.message || t.error}</p>
        <div className="mt-6 w-full max-w-xs">
          <PrimaryButton onClick={() => window.location.reload()}>{t.retry}</PrimaryButton>
        </div>
      </div>
    );
  }

  if (phase.kind === 'unlinked') {
    return (
      <div className="tg-app">
        <LoginScreen
          t={t}
          locale={locale}
          initData={phase.initData}
          onLocale={(next) => {
            setLocale(next);
            document.documentElement.lang = next;
          }}
          onLinked={(session) => {
            setLocale(session.locale);
            setStack([initialScreen(phase.startParam)]);
            setPhase({ kind: 'ready', session });
          }}
        />
      </div>
    );
  }

  const { session } = phase;
  const screenProps = { api: api!, t, locale, timeZone: session.user.timezone || 'UTC' };
  const activeTab = tabOf(screen);

  const selectTab = (tab: Tab) => {
    haptic('tap');
    if (tab === 'sites') reset({ name: 'sites' });
    if (tab === 'incidents') reset({ name: 'incidents' });
    if (tab === 'settings') reset({ name: 'settings' });
  };

  return (
    <div className="tg-app flex min-h-dvh flex-col">
      <main className="flex-1 pb-24">
        {screen.name === 'sites' && (
          <SitesScreen {...screenProps} refreshKey={refreshKey} onOpen={(id) => push({ name: 'site', id })} onAdd={() => push({ name: 'add' })} />
        )}
        {screen.name === 'site' && (
          <SiteScreen
            {...screenProps}
            key={screen.id}
            id={screen.id}
            onDeleted={() => {
              setRefreshKey((k) => k + 1);
              reset({ name: 'sites' });
            }}
            onIncidents={(id) => push({ name: 'incidents', monitorId: id })}
          />
        )}
        {screen.name === 'add' && (
          <AddSiteScreen
            {...screenProps}
            onAdded={(id) => {
              setRefreshKey((k) => k + 1);
              setStack([{ name: 'sites' }, { name: 'site', id }]);
            }}
          />
        )}
        {screen.name === 'incidents' && (
          <IncidentsScreen {...screenProps} monitorId={screen.monitorId} onOpenSite={(id) => push({ name: 'site', id })} />
        )}
        {screen.name === 'settings' && (
          <SettingsScreen
            {...screenProps}
            onLocale={(next) => {
              setLocale(next);
              document.documentElement.lang = next;
            }}
            onPlan={() => push({ name: 'plan' })}
          />
        )}
        {screen.name === 'plan' && <PlanScreen {...screenProps} />}
      </main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--tg-separator)] bg-[var(--tg-section)] pb-[max(env(safe-area-inset-bottom),8px)]"
      >
        <div className="mx-auto flex max-w-lg">
          {(
            [
              ['sites', t.tabSites, SitesIcon],
              ['incidents', t.tabIncidents, IncidentsIcon],
              ['settings', t.tabSettings, SettingsIcon],
            ] as Array<[Tab, string, typeof SitesIcon]>
          ).map(([tab, label, Icon]) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => selectTab(tab)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-1.5 text-[11px] font-semibold transition-colors duration-150 ${
                  active ? 'tg-link' : 'tg-hint'
                }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Hidden link keeps the "open in browser" affordance reachable for screen readers. */}
      <button type="button" className="sr-only" onClick={() => openExternal(`${window.location.origin}/dashboard`)}>
        {t.openDashboard}
      </button>
    </div>
  );
}

function SitesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function IncidentsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l9.5 17H2.5L12 3z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5v.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
