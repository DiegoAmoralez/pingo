import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function SeoPage({
  title,
  description,
  body,
}: {
  title: string;
  description: string;
  body: string[];
}) {
  const locale = await getLocale();
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="rounded-[2rem] bg-soft-lime/60 px-6 py-12 sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{pick(locale, 'PingoGo monitoring', 'Мониторинг PingoGo')}</p>
          <h1 className="text-balance mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{description}</p>
          <Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-white">
            {pick(locale, 'Start monitoring free', 'Начать бесплатно')}
          </Link>
        </div>
        <div className="brand-card mt-8 space-y-0 divide-y divide-border rounded-3xl px-6 sm:px-9">
          {body.map((p) => (
            <div key={p} className="flex gap-4 py-6">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
              <p className="text-sm leading-7 text-foreground">{p}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export const seoMetadata = (title: string, description: string): Metadata => ({
  title,
  description,
  openGraph: { title: `${title} · PingoGo`, description },
});
