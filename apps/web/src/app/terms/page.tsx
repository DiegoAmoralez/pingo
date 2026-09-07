import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
        <h1 className="text-4xl font-semibold tracking-tight">Terms of service</h1>
        <p className="mt-4 text-muted">
          This is a template. Have a lawyer review it before production use.
        </p>
        <div className="mt-8 space-y-4">
          <p>
            PINGO provides website, SSL, DNS and domain monitoring. It does not guarantee detection
            of every failure and is not a substitute for your own operational processes.
          </p>
          <p>
            You must only monitor websites you are authorized to check. You must not use the service
            to scan internal, private or unauthorized networks.
          </p>
          <p>Paid plans renew until cancelled through the billing portal. Downgrades pause extra monitors instead of deleting them.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
