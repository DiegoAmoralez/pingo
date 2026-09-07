export default function sitemap() {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
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
  return pages.map((path) => ({
    url: `${appUrl}${path}`,
    lastModified: new Date(),
  }));
}
