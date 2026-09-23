import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function SiteHeader({ signedIn }: { signedIn?: boolean }) {
  const locale = await getLocale();
  return (
    <header className="site-header sticky top-0 z-40 border-b border-transparent bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center" aria-label="PingoGo home">
          <Image src="/logo.png" alt="PingoGo" width={164} height={46} priority className="h-9 w-auto sm:h-10" />
        </Link>
      <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
        <Link className="hover:text-accent" href="/#features">
          {pick(locale, 'Features', 'Возможности')}
        </Link>
        <Link className="hover:text-accent" href="/#how">
          {pick(locale, 'How it works', 'Как это работает')}
        </Link>
        <Link className="hover:text-accent" href="/pricing">
          {pick(locale, 'Pricing', 'Тарифы')}
        </Link>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <LanguageSwitcher />
        {signedIn ? (
          <Link href="/dashboard" className="hidden rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-fg shadow-sm hover:-translate-y-0.5 hover:bg-[#00765f] sm:inline-flex">
            {pick(locale, 'Open dashboard', 'Открыть кабинет')}
          </Link>
        ) : (
          <>
            <Link href="/login" className="hidden font-medium hover:text-accent sm:block">{pick(locale, 'Sign in', 'Войти')}</Link>
            <Link href="/register" className="hidden rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-fg shadow-sm hover:-translate-y-0.5 hover:bg-[#00765f] sm:inline-flex">
              {pick(locale, 'Start free', 'Начать бесплатно')}
            </Link>
          </>
        )}
        <details className="relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-xl border border-border bg-white p-2.5">
            <Menu className="h-4 w-4" aria-label={pick(locale, 'Open menu', 'Открыть меню')} />
          </summary>
          <nav className="brand-card absolute right-0 mt-2 flex w-48 flex-col gap-1 rounded-2xl p-2 text-sm">
            <Link className="rounded-xl px-3 py-2 hover:bg-soft-lime" href="/#features">{pick(locale, 'Features', 'Возможности')}</Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-soft-lime" href="/#how">{pick(locale, 'How it works', 'Как это работает')}</Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-soft-lime" href="/pricing">{pick(locale, 'Pricing', 'Тарифы')}</Link>
            <Link className="rounded-xl bg-accent px-3 py-2 font-semibold text-white" href={signedIn ? '/dashboard' : '/login'}>
              {signedIn ? pick(locale, 'Open dashboard', 'Открыть кабинет') : pick(locale, 'Sign in', 'Войти')}
            </Link>
          </nav>
        </details>
      </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const locale = await getLocale();
  return (
    <footer className="mx-auto mt-24 w-full max-w-7xl px-5 pb-10 text-sm text-muted sm:px-8">
      <div className="flex flex-col gap-7 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" aria-label="PingoGo home">
          <Image src="/logo.png" alt="PingoGo" width={136} height={38} className="h-8 w-auto" />
        </Link>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/website-monitoring">{pick(locale, 'Website', 'Сайты')}</Link>
          <Link href="/ssl-monitoring">SSL</Link>
          <Link href="/domain-expiration-monitor">{pick(locale, 'Domain', 'Домены')}</Link>
          <Link href="/dns-monitoring">DNS</Link>
          <Link href="/telegram-website-monitor">Telegram</Link>
          <Link href="/privacy">{pick(locale, 'Privacy', 'Конфиденциальность')}</Link>
          <Link href="/terms">{pick(locale, 'Terms', 'Условия')}</Link>
        </div>
        <p className="text-xs">© {new Date().getFullYear()} PingoGo</p>
      </div>
    </footer>
  );
}
