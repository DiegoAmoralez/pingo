import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SSL monitoring',
  description: 'Track certificate expiry and get Telegram warnings before HTTPS breaks.',
};

export default function Page() {
  return (
    <SeoPage
      title="SSL monitoring"
      description="PINGO reads the live certificate, stores issuer and expiry, and warns at 30, 14, 7, 3 and 1 day."
      body={[
        'SSL checks run daily. We never spam the same threshold twice.',
        'If a certificate cannot be read, the website monitor still continues. SSL simply shows as unavailable until the next successful lookup.',
      ]}
    />
  );
}
