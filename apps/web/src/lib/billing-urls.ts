/** Where Stripe sends people back; the settings page reads `checkout` to show a banner. */
export function billingReturnUrl(outcome?: 'success' | 'cancel'): string {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const url = new URL('/settings', base);
  url.searchParams.set('tab', 'billing');
  if (outcome) url.searchParams.set('checkout', outcome);
  return url.toString();
}

/** Public URL Stripe must post webhooks to (same for live and sandbox). */
export function stripeWebhookUrl(): string {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/webhooks/stripe`;
}
