import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DNS monitoring',
  description: 'Snapshot A, AAAA, CNAME, MX and NS records and get notified on changes.',
};

export default function Page() {
  return (
    <SeoPage
      title="DNS monitoring"
      description="PINGO stores a DNS snapshot when you add a website and compares every later lookup."
      body={[
        'A record changes and nameserver changes get their own Telegram messages. DNS changes are not treated as downtime.',
        'TXT records can be collected for completeness but do not generate alerts in the current release.',
      ]}
    />
  );
}
