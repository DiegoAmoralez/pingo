import Link from 'next/link';
import { Button } from './ui/button';
import { formatPrice, getPlanDefinitions } from '@pingo/shared';
import { Check } from 'lucide-react';
import { getLocale } from '@/lib/i18n-server';
import { pick, pluralRu } from '@/lib/i18n';

export async function PricingCard({
  code,
  ctaHref,
  ctaLabel,
}: {
  code: 'FREE' | 'PERSONAL' | 'PRO' | 'AGENCY';
  ctaHref: string;
  ctaLabel: string;
}) {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  const plan = getPlanDefinitions()[code];
  const names = {
    FREE: t('Free', 'Бесплатный'),
    PERSONAL: t('Personal', 'Личный'),
    PRO: t('Pro', 'Профессиональный'),
    AGENCY: t('Agency', 'Агентство'),
  };
  const descriptions = {
    FREE: t(plan.description, 'Начните следить за двумя сайтами с уведомлениями в Telegram.'),
    PERSONAL: t(plan.description, 'Более частые проверки и месяц истории для небольших сайтов.'),
    PRO: t(plan.description, 'Для команд с большим количеством сайтов и долгой историей.'),
    AGENCY: t(plan.description, 'Высокие лимиты для агентств и портфолио.'),
  };
  const websiteFeature = locale === 'ru'
    ? `${plan.maxMonitors} ${pluralRu(plan.maxMonitors, 'сайт', 'сайта', 'сайтов')}`
    : `${plan.maxMonitors} websites`;
  const historyFeature = locale === 'ru'
    ? `История за ${plan.historyDays} ${pluralRu(plan.historyDays, 'день', 'дня', 'дней')}`
    : `${plan.historyDays} day history`;
  return (
    <div
      className={`relative flex flex-col rounded-3xl border bg-card p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${
        plan.popular ? 'border-accent bg-gradient-to-b from-soft-lime/60 to-white shadow-lg' : 'border-border'
      }`}
    >
      {plan.popular ? (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg">
          {t('Most popular', 'Самый популярный')}
        </span>
      ) : null}
      <h3 className="text-lg font-bold">{names[code]}</h3>
      <p className="mt-1 text-sm text-muted">{descriptions[code]}</p>
      <p className="mt-6 text-4xl font-extrabold tracking-tight">
        {formatPrice(plan.monthlyPriceCents)}
        <span className="text-base font-normal text-muted"> {t('/ month', '/ месяц')}</span>
      </p>
      <ul className="mt-6 space-y-3 text-sm">
        {[
          websiteFeature,
          t(`${plan.minCheckIntervalSeconds >= 300 ? '5 minute' : '1 minute'} checks`, plan.minCheckIntervalSeconds >= 300 ? 'Проверки каждые 5 минут' : 'Проверки каждую минуту'),
          historyFeature,
          t('Telegram alerts', 'Уведомления в Telegram'),
          t('SSL, domain and DNS watch', 'Контроль SSL, домена и DNS'),
        ].map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-soft-lime text-accent"><Check className="h-3 w-3" /></span>
            {feature}
          </li>
        ))}
      </ul>
      <Button asChild className="mt-8" variant={plan.popular ? 'default' : 'secondary'}>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
