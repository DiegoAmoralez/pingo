import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
        <h1 className="text-4xl font-semibold tracking-tight">Privacy policy</h1>
        <p className="mt-4 text-muted">
          This is a template. Have a lawyer review it before production use.
        </p>
        <div className="mt-8 space-y-4">
          <p>
            PINGO stores account email, hashed passwords, monitor configuration, check results,
            Telegram chat identifiers and billing customer IDs needed to operate the service.
          </p>
          <p>
            We do not store card numbers. Payments are processed by Stripe. Transactional email may
            be sent through Resend.
          </p>
          <p>
            Essential cookies are used for authentication. Optional product analytics run only when
            a PostHog key is configured.
          </p>
          <p>You can delete your account from Settings. Associated monitors and checks are removed.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
