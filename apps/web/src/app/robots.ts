export default function robots() {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/settings', '/api'] }],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
