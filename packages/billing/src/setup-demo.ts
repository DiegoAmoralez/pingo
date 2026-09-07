import Stripe from 'stripe';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLANS = [
  { code: 'PERSONAL' as const, name: 'PINGO Personal', amount: Number(process.env.PLAN_PRICE_PERSONAL ?? 399) },
  { code: 'PRO' as const, name: 'PINGO Pro', amount: Number(process.env.PLAN_PRICE_PRO ?? 899) },
  { code: 'AGENCY' as const, name: 'PINGO Agency', amount: Number(process.env.PLAN_PRICE_AGENCY ?? 1999) },
];

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const envPath = path.join(rootDir, '.env');

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !secret.startsWith('sk_test_')) {
    throw new Error('Set STRIPE_SECRET_KEY to a Stripe test-mode secret key (sk_test_...).');
  }

  const stripe = new Stripe(secret);
  const existing = await stripe.products.list({ limit: 100, active: true });
  const updates: Record<string, string> = {};

  for (const plan of PLANS) {
    const product =
      existing.data.find((item) => item.metadata.pingo_plan === plan.code) ??
      (await stripe.products.create({
        name: plan.name,
        metadata: { pingo_plan: plan.code, pingo_demo: 'true' },
      }));

    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
    const monthly =
      prices.data.find(
        (price) =>
          price.recurring?.interval === 'month' &&
          price.unit_amount === plan.amount &&
          price.currency === 'usd',
      ) ??
      (await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: plan.amount,
        recurring: { interval: 'month' },
        metadata: { pingo_plan: plan.code },
      }));

    updates[`STRIPE_PRICE_${plan.code}`] = monthly.id;
    console.log(`${plan.code}: ${product.id} / ${monthly.id}`);
  }

  const portals = await stripe.billingPortal.configurations.list({ limit: 5 });
  if (portals.data.length === 0) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'PINGO test billing' },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
      },
    });
    console.log('Created Stripe Customer Portal configuration');
  }

  upsertEnv(updates);
  console.log(`Wrote price IDs to ${envPath}`);
  console.log('Test card: 4242 4242 4242 4242, any future expiry, any CVC');
}

function upsertEnv(updates: Record<string, string>) {
  if (!existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  let text = readFileSync(envPath, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) text = text.replace(re, line);
    else text += `\n${line}\n`;
  }
  writeFileSync(envPath, text);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
