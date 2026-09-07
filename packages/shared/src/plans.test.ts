import { describe, expect, it } from 'vitest';
import { formatPrice, getPlan, isPaidStatus } from './plans.js';

describe('plans', () => {
  it('returns free plan limits', () => {
    const plan = getPlan('FREE');
    expect(plan.maxMonitors).toBe(2);
    expect(plan.minCheckIntervalSeconds).toBe(300);
    expect(plan.historyDays).toBe(7);
    expect(plan.monthlyPriceCents).toBe(0);
  });

  it('marks paid subscription statuses', () => {
    expect(isPaidStatus('ACTIVE')).toBe(true);
    expect(isPaidStatus('CANCELED')).toBe(false);
    expect(isPaidStatus('NONE')).toBe(false);
  });

  it('formats prices', () => {
    expect(formatPrice(0)).toBe('$0');
    expect(formatPrice(399)).toBe('$3.99');
  });
});
