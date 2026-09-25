/**
 * Prepares a Stripe account for PingoGo: products, monthly prices with lookup
 * keys, the Customer Portal configuration and (optionally) the webhook.
 *
 *   pnpm stripe:setup -- --mode test
 *   pnpm stripe:setup -- --mode live --webhook https://www.pingogo.eu/api/webhooks/stripe
 *
 * Reads STRIPE_<MODE>_SECRET_KEY from the environment (.env via tsx --env-file).
 * Nothing is written back to .env: copy the printed lines where they belong.
 */
import { isStripeMode, maskSecret, readStripeModeConfig, type StripeMode } from './config.js';
import { StripeBillingProvider } from './provider.js';

function readArg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const modeArg = readArg('mode') ?? 'test';
  if (!isStripeMode(modeArg)) {
    throw new Error(`--mode must be "test" or "live", got "${modeArg}"`);
  }
  const mode: StripeMode = modeArg;
  const config = readStripeModeConfig(mode);
  if (!config) {
    throw new Error(`Set STRIPE_${mode.toUpperCase()}_SECRET_KEY before running the setup for ${mode} mode.`);
  }

  const provider = new StripeBillingProvider(config);
  console.log(`Stripe ${mode} mode · key ${maskSecret(config.secretKey)}`);

  const catalog = await provider.ensureCatalog();
  for (const price of catalog.prices) {
    console.log(
      `${price.plan.padEnd(8)} ${price.priceId}  $${(price.amountCents / 100).toFixed(2)}/mo  ${price.created ? '(created)' : '(exists)'}`,
    );
  }
  console.log(catalog.portalCreated ? 'Customer Portal configuration created' : 'Customer Portal configuration exists');

  const webhookUrl = readArg('webhook');
  if (webhookUrl) {
    const webhook = await provider.ensureWebhookEndpoint(webhookUrl);
    if (webhook.created && webhook.secret) {
      console.log(`\nWebhook endpoint created: ${webhook.endpointId}`);
      console.log(`Add this to the ${mode} environment (shown only once):`);
      console.log(`STRIPE_${mode.toUpperCase()}_WEBHOOK_SECRET=${webhook.secret}`);
    } else {
      console.log(`\nWebhook endpoint already registered: ${webhook.endpointId}`);
      console.log('Its signing secret is visible in the Stripe Dashboard → Developers → Webhooks.');
    }
  } else {
    console.log('\nNo --webhook URL given; skipped webhook registration.');
  }

  if (mode === 'test') {
    console.log('\nTest card: 4242 4242 4242 4242, any future expiry, any CVC.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
