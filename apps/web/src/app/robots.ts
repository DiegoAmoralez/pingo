import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const appUrl = getSiteUrl();
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/admin',
        '/settings',
        '/api',
        '/login',
        '/register',
        '/onboarding',
        '/forgot-password',
        '/reset-password',
        '/status/',
      ],
    }],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
