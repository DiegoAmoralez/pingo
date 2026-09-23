import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { PricingCard } from '@/components/pricing-card';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await getLocale(), 'Pricing', 'Тарифы') };
}

export default async function PricingPage() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{t('Simple, transparent pricing', 'Простые и прозрачные тарифы')}</p>
          <h1 className="text-balance mt-3 text-5xl font-extrabold tracking-[-0.05em] sm:text-6xl">{t('Protect every site without enterprise complexity.', 'Защитите каждый сайт без корпоративной сложности.')}</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted">
            {t('Start free today. Upgrade only when you need faster checks, longer history or more websites.', 'Начните бесплатно. Переходите на платный тариф, когда понадобятся более частые проверки, долгая история или больше сайтов.')}
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <PricingCard code="FREE" ctaHref="/register" ctaLabel={t('Start free', 'Начать бесплатно')} />
          <PricingCard code="PERSONAL" ctaHref="/register" ctaLabel={t('Upgrade', 'Выбрать')} />
          <PricingCard code="PRO" ctaHref="/register" ctaLabel={t('Upgrade', 'Выбрать')} />
          <PricingCard code="AGENCY" ctaHref="/register" ctaLabel={t('Upgrade', 'Выбрать')} />
        </div>
        <p className="mt-8 text-center text-sm text-muted">{t('No setup fee · Cancel anytime · Telegram alerts included', 'Без платы за подключение · Отмена в любое время · Уведомления в Telegram включены')}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
