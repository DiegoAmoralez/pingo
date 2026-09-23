import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Bell, CircleUserRound, LayoutGrid, Settings, ShieldAlert } from 'lucide-react';
import { AddMonitorButton } from '@/components/add-monitor-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function AppShell({
  email,
  isAdmin,
  children,
}: {
  email: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  async function logout() {
    'use server';
    await auth.api.signOut({ headers: await headers() });
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="site-header sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" aria-label="PingoGo dashboard">
              <Image src="/logo.png" alt="PingoGo" width={148} height={42} priority className="h-8 w-auto sm:h-9" />
            </Link>
            <nav className="hidden items-center gap-1 text-sm font-medium text-muted md:flex">
              <Link className="rounded-xl px-3 py-2 hover:bg-soft-lime hover:text-accent" href="/dashboard">
                {pick(locale, 'Sites', 'Сайты')}
              </Link>
              <Link className="rounded-xl px-3 py-2 hover:bg-soft-lime hover:text-accent" href="/dashboard/incidents">
                {pick(locale, 'Incidents', 'События')}
              </Link>
              <Link className="rounded-xl px-3 py-2 hover:bg-soft-lime hover:text-accent" href="/settings">
                {pick(locale, 'Settings', 'Настройки')}
              </Link>
              {isAdmin ? <Link className="rounded-xl px-3 py-2 hover:bg-soft-lime hover:text-accent" href="/admin">{pick(locale, 'Admin', 'Админ')}</Link> : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button type="button" className="hidden rounded-xl border border-border bg-white p-2.5 text-muted sm:block" aria-label={pick(locale, 'Notifications', 'Уведомления')}>
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden sm:block"><AddMonitorButton label={pick(locale, 'Add site', 'Добавить сайт')} /></div>
            <form action={logout}>
              <button className="flex max-w-[170px] items-center gap-2 truncate rounded-xl border border-border bg-white px-3 py-2 text-sm text-muted" type="submit" title={pick(locale, 'Sign out', 'Выйти')}>
                <CircleUserRound className="h-4 w-4 shrink-0 text-accent" />
                <span className="hidden truncate lg:block">{email}</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-8 sm:py-10 md:pb-10">{children}</div>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-2xl border border-border bg-white/95 p-2 shadow-xl backdrop-blur md:hidden">
        <MobileNav href="/dashboard" icon={<LayoutGrid />} label={pick(locale, 'Sites', 'Сайты')} />
        <MobileNav href="/dashboard/incidents" icon={<ShieldAlert />} label={pick(locale, 'Incidents', 'События')} />
        <MobileNav href="/settings" icon={<Settings />} label={pick(locale, 'Settings', 'Настройки')} />
      </nav>
    </div>
  );
}

function MobileNav({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium text-muted hover:bg-soft-lime hover:text-accent">
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </Link>
  );
}
