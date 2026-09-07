import { describe, expect, it } from 'vitest';
import { applyCheckResult } from '@pingo/monitoring';
import type { MonitorStatus } from '@pingo/shared';

describe('website check consecutive failures', () => {
  it('queues a DOWN incident only after two failures', () => {
    let state: { status: MonitorStatus; consecutiveFailures: number } = {
      status: 'UP',
      consecutiveFailures: 0,
    };
    const first = applyCheckResult(state, 'DOWN');
    expect(first.incidentStart).toBe(false);
    state = { status: first.nextStatus, consecutiveFailures: first.consecutiveFailures };
    const second = applyCheckResult(state, 'DOWN');
    expect(second.incidentStart).toBe(true);
    expect(second.nextStatus).toBe('DOWN');
  });
});
