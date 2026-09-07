import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold">Status page</h1>
        <p className="mt-3 text-muted">
          Public status pages are a future feature and are currently disabled ({slug}).
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
