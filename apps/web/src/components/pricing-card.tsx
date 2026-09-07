import Link from 'next/link';
import { Button } from './ui/button';
import { formatPrice, getPlanDefinitions } from '@pingo/shared';

export function PricingCard({
  code,
  ctaHref,
  ctaLabel,
}: {
  code: 'FREE' | 'PERSONAL' | 'PRO' | 'AGENCY';
  ctaHref: string;
  ctaLabel: string;
}) {
  const plan = getPlanDefinitions()[code];
  return (
    <div
      className={`relative flex flex-col rounded-3xl border bg-card p-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        plan.popular ? 'border-accent shadow-lg' : 'border-border'
      }`}
    >
      {plan.popular ? (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg">
          Most popular
        </span>
      ) : null}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted">{plan.description}</p>
      <p className="mt-6 text-4xl font-semibold tracking-tight">
        {formatPrice(plan.monthlyPriceCents)}
        <span className="text-base font-normal text-muted"> / month</span>
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>{plan.maxMonitors} websites</li>
        <li>{plan.minCheckIntervalSeconds >= 300 ? '5 minute' : '1 minute'} checks</li>
        <li>{plan.historyDays} day history</li>
        <li>Telegram alerts</li>
        <li>SSL, domain and DNS watch</li>
      </ul>
      <Button asChild className="mt-8" variant={plan.popular ? 'default' : 'secondary'}>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
