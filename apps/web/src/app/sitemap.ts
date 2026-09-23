import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getSiteUrl();
  const pages = [
    '',
    '/pricing',
    '/website-monitoring',
    '/ssl-monitoring',
    '/domain-expiration-monitor',
    '/dns-monitoring',
    '/telegram-website-monitor',
    '/privacy',
    '/terms',
  ];
  return pages.map((path, index) => ({
    url: `${appUrl}${path}`,
    changeFrequency: index === 0 ? 'weekly' : 'monthly',
    priority: index === 0 ? 1 : path === '/pricing' ? 0.9 : 0.7,
  }));
}
