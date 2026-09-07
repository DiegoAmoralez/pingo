import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { PricingCard } from '@/components/pricing-card';
import { StatusBadge } from '@/components/status-badge';
import { getSession } from '@/lib/session';

export default async function LandingPage() {
  const session = await getSession();
  return (
    <div>
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-8 pt-10 lg:grid-cols-2 lg:pt-16">
          <div>
            <p className="text-sm font-medium text-accent">Website + SSL + DNS + domain</p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight sm:text-6xl">
              Know when your website breaks.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              PINGO monitors your website, SSL, DNS and domain and tells you in Telegram when
              something goes wrong.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-medium text-accent-fg"
              >
                Start monitoring free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-white px-6 text-base"
              >
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              No credit card required. Setup takes less than a minute.
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">example.com</p>
                <StatusBadge tone="healthy" label="Online" />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted">Website</dt>
                  <dd>186 ms</dd>
                </div>
                <div>
                  <dt className="text-muted">SSL</dt>
                  <dd>73 days</dd>
                </div>
                <div>
                  <dt className="text-muted">Domain</dt>
                  <dd>214 days</dd>
                </div>
                <div>
                  <dt className="text-muted">DNS</dt>
                  <dd>Healthy</dd>
                </div>
              </dl>
            </div>
            <div className="ml-auto max-w-sm rounded-3xl bg-[#1f1c19] p-5 text-sm text-[#f6f1ea] shadow-xl">
              <p className="text-xs uppercase tracking-wide text-stone-400">PINGO</p>
              <p className="mt-3 font-medium">🔴 Website down</p>
              <p className="mt-2 text-stone-300">example.com</p>
              <p className="text-stone-300">HTTP 502</p>
              <p className="mt-3 text-stone-500">Started 2 minutes ago</p>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-3 max-w-2xl text-muted">
            PINGO checks everything automatically and only contacts you when something needs
            attention.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: '1', t: 'Add your website', d: 'Paste a URL. We discover SSL, DNS and domain details immediately.' },
              { n: '2', t: 'Connect Telegram', d: 'One tap links your chat. Alerts arrive where you already look.' },
              { n: '3', t: 'Forget about it', d: 'PINGO keeps watching. You only hear from us when it matters.' },
            ].map((step) => (
              <div key={step.n} className="rounded-3xl border border-border bg-card p-6">
                <p className="text-sm text-accent">{step.n}</p>
                <h3 className="mt-2 text-xl font-semibold">{step.t}</h3>
                <p className="mt-2 text-sm text-muted">{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="text-3xl font-semibold tracking-tight">What PINGO monitors</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              ['Website uptime', 'HTTP status, response time and outage incidents.'],
              ['SSL certificates', 'Issuer, expiry date and warning thresholds.'],
              ['Domain Watch', 'Registrar, expiration and nameservers via RDAP.'],
              ['DNS changes', 'A, AAAA, CNAME, MX and NS snapshots with diffs.'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-border bg-card p-6">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl bg-[#171412] px-8 py-12 text-[#f6f1ea]">
            <h2 className="text-3xl font-semibold">Telegram alerts, not noise.</h2>
            <p className="mt-3 max-w-2xl text-stone-400">
              Downtime waits for two failed checks. SSL and domain warnings fire once per threshold.
              DNS changes are reported without pretending they are outages.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="text-3xl font-semibold tracking-tight">Pricing</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <PricingCard code="FREE" ctaHref="/register" ctaLabel="Start free" />
            <PricingCard code="PERSONAL" ctaHref="/register" ctaLabel="Upgrade" />
            <PricingCard code="PRO" ctaHref="/register" ctaLabel="Upgrade" />
            <PricingCard code="AGENCY" ctaHref="/register" ctaLabel="Upgrade" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">FAQ</h2>
          <div className="mt-8 space-y-6">
            {[
              ['Do I need a credit card?', 'No. The Free plan is enough to watch two websites with Telegram alerts.'],
              ['How fast are checks?', 'Every 5 minutes on Free, every minute on paid plans.'],
              ['What if WHOIS/RDAP has no expiry date?', 'We still monitor the website. Domain expiration shows as unavailable and we retry later.'],
              ['Is this a Datadog replacement?', 'No. PINGO is deliberately simple: add a website, connect Telegram, forget about it.'],
            ].map(([q, a]) => (
              <div key={q}>
                <h3 className="font-medium">{q}</h3>
                <p className="mt-1 text-sm text-muted">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
