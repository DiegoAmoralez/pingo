export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.SENTRY_DSN) return;
  console.info('SENTRY_DSN is set. Add @sentry/nextjs for full production error tracking.');
}
