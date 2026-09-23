import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

const navLinks = (t: (en: string, ru: string) => string): Array<[string, string]> => [
  ['/#features', t('Features', 'Возможности')],
  ['/#how', t('How it works', 'Как работает')],
  ['/pricing', t('Pricing', 'Тарифы')],
];

export async function SiteHeader({ signedIn }: { signedIn?: boolean }) {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  const primaryHref = signedIn ? '/dashboard' : '/register';
  const primaryLabel = signedIn ? t('Open dashboard', 'Открыть кабинет') : t('Start free', 'Начать бесплатно');

  return (
    <header className="site-header sticky top-0 z-40 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="PingoGo home">
          <Image src="/logo.png" alt="PingoGo" width={164} height={46} priority className="h-9 w-auto sm:h-10" />
        </Link>

        <nav className="hidden items-center gap-9 text-[15px] font-semibold text-foreground/80 md:flex" aria-label={t('Main', 'Основное')}>
          {navLinks(t).map(([href, label]) => (
            <Link key={href} href={href} className="relative py-1 hover:text-accent after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-200 hover:after:scale-x-100">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <LanguageSwitcher />
          {!signedIn ? (
            <Link href="/login" className="hidden font-semibold text-foreground/80 hover:text-accent sm:block">
              {t('Sign in', 'Войти')}
            </Link>
          ) : null}
          <span className="hidden sm:inline-flex">
            <Link href={primaryHref} className="lp-btn lp-btn-primary !h-11 whitespace-nowrap !px-5 text-sm">
              {primaryLabel}
            </Link>
          </span>

          <details className="relative md:hidden">
            <summary className="flex cursor-pointer list-none items-center rounded-xl border border-border bg-white p-2.5" aria-label={t('Open menu', 'Открыть меню')}>
              <Menu className="h-4 w-4" />
            </summary>
            <nav className="lp-card absolute right-0 mt-2 flex w-56 flex-col gap-1 p-2 text-sm font-semibold">
              {navLinks(t).map(([href, label]) => (
                <Link key={href} className="rounded-xl px-3 py-2.5 hover:bg-soft-lime" href={href}>
                  {label}
                </Link>
              ))}
              {!signedIn ? (
                <Link className="rounded-xl px-3 py-2.5 hover:bg-soft-lime" href="/login">
                  {t('Sign in', 'Войти')}
                </Link>
              ) : null}
              <Link className="rounded-xl bg-accent px-3 py-2.5 text-white" href={primaryHref}>
                {primaryLabel}
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
  const t = (en: string, ru: string) => pick(locale, en, ru);
  const year = new Date().getFullYear();
  const links: Array<[string, string]> = [
    ...navLinks(t),
    ['/privacy', t('Privacy', 'Конфиденциальность')],
    ['/terms', t('Terms', 'Условия')],
  ];

  return (
    <footer className="mx-auto mt-16 w-full max-w-7xl px-5 pb-10 text-sm sm:px-8">
      <div className="flex flex-col gap-6 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
        <Link href="/" aria-label="PingoGo home" className="shrink-0">
          <Image src="/logo.png" alt="PingoGo" width={136} height={38} className="h-8 w-auto" />
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-muted" aria-label={t('Footer', 'Подвал')}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-accent hover:underline hover:underline-offset-4">
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-[13px] text-muted">
          © {year} PingoGo. {t('We keep watch so you can keep moving.', 'Мы следим, чтобы вы двигались дальше.')}
        </p>
      </div>
    </footer>
  );
}
