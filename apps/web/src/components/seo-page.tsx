import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export default function SeoPage({
  title,
  description,
  body,
}: {
  title: string;
  description: string;
  body: string[];
}) {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 text-lg text-muted">{description}</p>
        <div className="mt-8 space-y-4 text-sm leading-7 text-foreground">
          {body.map((p) => (
            <p key={p}>{p}</p>
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
  alternates: { canonical: undefined },
});
