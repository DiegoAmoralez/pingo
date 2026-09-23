import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold">{pick(locale, 'Status page', 'Страница статуса')}</h1>
        <p className="mt-3 text-muted">
          {pick(locale, `Public status pages are a future feature and are currently disabled (${slug}).`, `Публичные страницы статуса появятся в будущем и сейчас отключены (${slug}).`)}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
