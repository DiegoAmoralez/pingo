import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Website monitoring',
  description: 'Uptime, HTTP status and response time monitoring with Telegram alerts.',
};

export default function Page() {
  return (
    <SeoPage
      title="Website monitoring"
      description="Add a URL once. PINGO checks HTTP status and response time, then opens an incident only after consecutive failures."
      body={[
        'PINGO performs lightweight HTTP checks from a background worker. It prefers HEAD requests and falls back to a bounded GET so monitoring never turns into a download proxy.',
        'A website is marked down after two consecutive failed checks. Recovery closes the incident and sends a short Telegram message with downtime duration.',
        'Private networks, cloud metadata endpoints and credentialed URLs are blocked to prevent SSRF.',
      ]}
    />
  );
}
