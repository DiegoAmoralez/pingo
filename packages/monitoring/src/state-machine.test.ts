import { describe, expect, it } from 'vitest';
import { applyCheckResult } from './state-machine.js';

describe('incident state transitions', () => {
  it('starts UNKNOWN and becomes UP after first success', () => {
    const next = applyCheckResult({ status: 'UNKNOWN', consecutiveFailures: 0 }, 'UP');
    expect(next.nextStatus).toBe('UP');
    expect(next.incidentStart).toBe(false);
  });

  it('does not mark DOWN after a single failure', () => {
    const next = applyCheckResult({ status: 'UP', consecutiveFailures: 0 }, 'DOWN');
    expect(next.nextStatus).toBe('UP');
    expect(next.incidentStart).toBe(false);
    expect(next.consecutiveFailures).toBe(1);
  });

  it('marks DOWN after two consecutive failures', () => {
    const first = applyCheckResult({ status: 'UP', consecutiveFailures: 0 }, 'DOWN');
    const second = applyCheckResult(
      { status: first.nextStatus, consecutiveFailures: first.consecutiveFailures },
      'DOWN',
    );
    expect(second.nextStatus).toBe('DOWN');
    expect(second.incidentStart).toBe(true);
  });

  it('recovers to UP after a success and closes the incident', () => {
    const next = applyCheckResult({ status: 'DOWN', consecutiveFailures: 4 }, 'UP');
    expect(next.nextStatus).toBe('UP');
    expect(next.incidentRecover).toBe(true);
    expect(next.consecutiveFailures).toBe(0);
  });
});
