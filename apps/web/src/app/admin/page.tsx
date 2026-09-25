import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';
import { getAdminSession, isAdminPanelConfigured } from '@/lib/admin-auth';
import { getMaintenanceState } from '@/lib/maintenance';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PageHeader } from '@/components/app-primitives';
import { Button } from '@/components/ui/button';
import { AdminLoginForm } from './login-form';
import { MaintenanceToggle } from './maintenance-toggle';
import { AdminStats } from './admin-stats';
import { SimulationPanel } from './simulation-panel';
import { StripePanel } from './stripe-panel';
import { listSimulationTargets } from '@/server/simulate-incidents';
import { getStripeOverview } from '@/server/stripe-admin';
import { logoutAction } from './actions';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const [session, locale] = await Promise.all([getAdminSession(), getLocale()]);
  const t = (en: string, ru: string) => pick(locale, en, ru);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="w-fit" aria-label="PingoGo home">
            <Image src="/logo.png" alt="PingoGo" width={168} height={48} priority className="h-10 w-auto" />
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t('Admin panel', 'Админ-панель')}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">{t('Sign in', 'Вход')}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {t('Staff access only. Sessions last 12 hours.', 'Только для сотрудников. Сессия живёт 12 часов.')}
          </p>
          <div className="brand-card mt-8 rounded-3xl p-6 sm:p-7">
            {isAdminPanelConfigured() ? (
              <AdminLoginForm />
            ) : (
              <p className="text-sm text-crit">
                {t(
                  'Set ADMIN_PANEL_LOGIN and ADMIN_PANEL_PASSWORD to enable the admin panel.',
                  'Задайте ADMIN_PANEL_LOGIN и ADMIN_PANEL_PASSWORD, чтобы включить админ-панель.',
                )}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  const [maintenance, simulationTargets, stripeOverview] = await Promise.all([
    getMaintenanceState(),
    listSimulationTargets(),
    getStripeOverview(),
  ]);
  const changedAt = maintenance.updatedAt
    ? new Date(maintenance.updatedAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-GB')
    : null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="PingoGo home">
              <Image src="/logo.png" alt="PingoGo" width={140} height={40} priority className="h-9 w-auto" />
            </Link>
            <span className="rounded-full bg-soft-lime px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-accent">
              {t('Admin', 'Админ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="hidden text-sm font-semibold text-muted sm:inline">{session.login}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" size="sm">
                <LogOut className="h-4 w-4" aria-hidden />
                {t('Sign out', 'Выйти')}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8">
        <PageHeader
          title={t('Admin', 'Администрирование')}
          description={t('Site controls, product health and billing snapshot.', 'Управление сайтом, состояние продукта и сводка по оплате.')}
        />

        <section
          className={`rounded-3xl border p-6 transition-colors duration-300 ease-out sm:p-7 ${
            maintenance.enabled ? 'border-warn/40 bg-[#fff7e8]' : 'border-border bg-card'
          }`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-[-0.02em]">{t('Maintenance mode', 'Режим техобслуживания')}</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-foreground/75">
                {t(
                  'While it is on, every visitor of the site sees the "under maintenance" screen and cannot open any page or API. This panel stays available.',
                  'Пока включён, все посетители сайта видят заглушку «технические работы» и не могут открыть ни одну страницу или API. Эта панель остаётся доступной.',
                )}
              </p>
              {changedAt ? (
                <p className="mt-2 text-xs text-muted">
                  {t('Last change', 'Последнее изменение')}: {changedAt}
                  {maintenance.updatedBy ? ` · ${maintenance.updatedBy}` : ''}
                </p>
              ) : null}
            </div>
            <MaintenanceToggle enabled={maintenance.enabled} />
          </div>
        </section>

        <StripePanel overview={stripeOverview} />

        <SimulationPanel targets={simulationTargets} />

        <AdminStats locale={locale} />
      </div>
    </main>
  );
}
