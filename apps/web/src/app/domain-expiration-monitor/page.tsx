import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Domain expiration monitor',
  description: 'Watch domain expiry, registrar and nameservers using RDAP.',
};

export default function Page() {
  return (
    <SeoPage
      title="Domain expiration monitor"
      description="PINGO finds the registrable root domain, queries RDAP, and alerts before the domain expires."
      body={[
        'shop.example.co.uk becomes example.co.uk using the Public Suffix List. Multiple websites on the same domain share one Domain Watch.',
        'If a registry does not publish an expiration date, PINGO shows Domain expiration unavailable and retries later. The website monitor is never blocked by a WHOIS gap.',
      ]}
    />
  );
}
