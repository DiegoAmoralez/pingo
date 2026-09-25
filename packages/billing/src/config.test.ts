import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  configuredStripeModes,
  defaultStripeMode,
  maskSecret,
  modeOfKey,
  readStripeModeConfig,
} from './config.js';
import { subscriptionAppliesToMode } from './mode.js';

const STRIPE_VARS = [
  'STRIPE_LIVE_SECRET_KEY',
  'STRIPE_LIVE_WEBHOOK_SECRET',
  'STRIPE_LIVE_PRICE_PRO',
  'STRIPE_TEST_SECRET_KEY',
  'STRIPE_TEST_WEBHOOK_SECRET',
  'STRIPE_DEFAULT_MODE',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_PERSONAL',
];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of STRIPE_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of STRIPE_VARS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('modeOfKey', () => {
  it('recognises secret and restricted keys of both modes', () => {
    expect(modeOfKey('sk_live_abc')).toBe('live');
    expect(modeOfKey('rk_live_abc')).toBe('live');
    expect(modeOfKey('sk_test_abc')).toBe('test');
    expect(modeOfKey('rk_test_abc')).toBe('test');
    expect(modeOfKey('rkcs_test_abc')).toBe('test');
    expect(modeOfKey('pk_test_abc')).toBeNull();
    expect(modeOfKey('whsec_abc')).toBeNull();
  });
});

describe('readStripeModeConfig', () => {
  it('returns null when a mode has no key', () => {
    expect(readStripeModeConfig('live')).toBeNull();
    expect(configuredStripeModes()).toEqual([]);
  });

  it('prefers mode-specific variables and collects price overrides', () => {
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_123';
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = 'whsec_live';
    process.env.STRIPE_LIVE_PRICE_PRO = 'price_pro_live';
    const config = readStripeModeConfig('live');
    expect(config).toEqual({
      mode: 'live',
      secretKey: 'sk_live_123',
      webhookSecret: 'whsec_live',
      priceOverrides: { PRO: 'price_pro_live' },
    });
  });

  it('maps legacy single-mode variables to the mode of their key prefix', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_legacy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_legacy';
    process.env.STRIPE_PRICE_PERSONAL = 'price_personal_legacy';
    expect(readStripeModeConfig('live')).toBeNull();
    expect(readStripeModeConfig('test')).toEqual({
      mode: 'test',
      secretKey: 'sk_test_legacy',
      webhookSecret: 'whsec_legacy',
      priceOverrides: { PERSONAL: 'price_personal_legacy' },
    });
  });

  it('does not let legacy secrets leak into a mode configured explicitly', () => {
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_explicit';
    process.env.STRIPE_SECRET_KEY = 'sk_test_legacy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_legacy';
    expect(readStripeModeConfig('test')?.webhookSecret).toBeNull();
  });
});

describe('defaultStripeMode', () => {
  it('is null without keys, sandbox when both exist, and honours STRIPE_DEFAULT_MODE', () => {
    expect(defaultStripeMode()).toBeNull();
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_1';
    expect(defaultStripeMode()).toBe('live');
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_1';
    expect(defaultStripeMode()).toBe('test');
    process.env.STRIPE_DEFAULT_MODE = 'live';
    expect(defaultStripeMode()).toBe('live');
  });

  it('ignores STRIPE_DEFAULT_MODE pointing at an unconfigured mode', () => {
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_1';
    process.env.STRIPE_DEFAULT_MODE = 'live';
    expect(defaultStripeMode()).toBe('test');
  });
});

describe('subscriptionAppliesToMode', () => {
  it('lets manual grants apply everywhere and isolates Stripe worlds', () => {
    expect(subscriptionAppliesToMode(null, 'live')).toBe(false);
    expect(subscriptionAppliesToMode({ providerMode: null }, 'live')).toBe(true);
    expect(subscriptionAppliesToMode({ providerMode: 'test' }, 'test')).toBe(true);
    expect(subscriptionAppliesToMode({ providerMode: 'test' }, 'live')).toBe(false);
    expect(subscriptionAppliesToMode({ providerMode: 'live' }, null)).toBe(true);
  });
});

describe('maskSecret', () => {
  it('keeps only the prefix and the last characters', () => {
    // Built at runtime so secret scanners do not mistake the sample for a real key.
    const sample = ['sk', 'test', 'EXAMPLE_SAMPLE_KEY_StUv'].join('_');
    expect(maskSecret(sample)).toBe('sk_test_…StUv');
    expect(maskSecret('short')).toBe('••••');
  });
});
