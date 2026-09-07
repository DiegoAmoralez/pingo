import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { PricingCard } from '@/components/pricing-card';

export const metadata: Metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Simple pricing</h1>
        <p className="mt-3 max-w-xl text-muted">
          Start free. Upgrade when you need faster checks or more websites.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <PricingCard code="FREE" ctaHref="/register" ctaLabel="Start free" />
          <PricingCard code="PERSONAL" ctaHref="/register" ctaLabel="Upgrade" />
          <PricingCard code="PRO" ctaHref="/register" ctaLabel="Upgrade" />
          <PricingCard code="AGENCY" ctaHref="/register" ctaLabel="Upgrade" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
