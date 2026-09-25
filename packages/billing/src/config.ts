import type { PlanCode } from '@pingo/shared';

/**
 * Stripe runs as two isolated worlds: the live account and its sandbox.
 * PingoGo keeps a key set for each so an admin can flip between them
 * without redeploying.
 */
export const STRIPE_MODES = ['live', 'test'] as const;
export type StripeMode = (typeof STRIPE_MODES)[number];

export const PAID_PLANS = ['PERSONAL', 'PRO', 'AGENCY'] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

/** Stable identifiers of our recurring prices inside Stripe (same in both modes). */
export const PRICE_LOOKUP_KEYS: Record<PaidPlan, string> = {
  PERSONAL: 'pingo_personal_monthly',
  PRO: 'pingo_pro_monthly',
  AGENCY: 'pingo_agency_monthly',
};

export type StripeModeConfig = {
  mode: StripeMode;
  secretKey: string;
  webhookSecret: string | null;
  /** Optional explicit price IDs; when absent prices are resolved by lookup key. */
  priceOverrides: Partial<Record<PaidPlan, string>>;
};

export function isStripeMode(value: unknown): value is StripeMode {
  return value === 'live' || value === 'test';
}

function envPrefix(mode: StripeMode): string {
  return mode === 'live' ? 'STRIPE_LIVE' : 'STRIPE_TEST';
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * `sk_live_…` / `rk_live_…` → live, `sk_test_…` / `rk_test_…` / `rkcs_test_…` → test.
 * Publishable keys (`pk_…`) are not server keys and are rejected.
 */
export function modeOfKey(secretKey: string): StripeMode | null {
  if (secretKey.startsWith('pk_')) return null;
  if (/^[a-z]+_live_/.test(secretKey)) return 'live';
  if (/^[a-z]+_test_/.test(secretKey)) return 'test';
  return null;
}

/**
 * Reads the key set for a mode. Mode-specific variables win; the legacy
 * single-mode variables (`STRIPE_SECRET_KEY` …) are honoured for whichever
 * mode their key prefix belongs to, so existing deployments keep working.
 */
export function readStripeModeConfig(mode: StripeMode): StripeModeConfig | null {
  const prefix = envPrefix(mode);
  let secretKey = clean(process.env[`${prefix}_SECRET_KEY`]);
  let legacy = false;

  if (!secretKey) {
    const fallback = clean(process.env.STRIPE_SECRET_KEY);
    if (fallback && modeOfKey(fallback) === mode) {
      secretKey = fallback;
      legacy = true;
    }
  }
  if (!secretKey) return null;

  const webhookSecret =
    clean(process.env[`${prefix}_WEBHOOK_SECRET`]) ?? (legacy ? clean(process.env.STRIPE_WEBHOOK_SECRET) : null);

  const priceOverrides: Partial<Record<PaidPlan, string>> = {};
  for (const plan of PAID_PLANS) {
    const id = clean(process.env[`${prefix}_PRICE_${plan}`]) ?? (legacy ? clean(process.env[`STRIPE_PRICE_${plan}`]) : null);
    if (id) priceOverrides[plan] = id;
  }

  return { mode, secretKey, webhookSecret, priceOverrides };
}

export function configuredStripeModes(): StripeMode[] {
  return STRIPE_MODES.filter((mode) => readStripeModeConfig(mode) !== null);
}

/**
 * Mode used until an admin picks one: `STRIPE_DEFAULT_MODE`, otherwise the
 * sandbox when it is configured (never charge real cards by accident).
 */
export function defaultStripeMode(): StripeMode | null {
  const configured = configuredStripeModes();
  if (configured.length === 0) return null;
  const preferred = clean(process.env.STRIPE_DEFAULT_MODE);
  if (isStripeMode(preferred) && configured.includes(preferred)) return preferred;
  return configured.includes('test') ? 'test' : 'live';
}

/** `sk_test_51Ab…Zx9k` — enough to recognise a key, useless to an attacker. */
export function maskSecret(secret: string): string {
  if (secret.length <= 12) return '••••';
  return `${secret.slice(0, 8)}…${secret.slice(-4)}`;
}

export function isPaidPlan(plan: PlanCode | string): plan is PaidPlan {
  return (PAID_PLANS as readonly string[]).includes(plan);
}
