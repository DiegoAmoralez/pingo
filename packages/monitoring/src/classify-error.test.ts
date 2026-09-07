import { describe, expect, it } from 'vitest';
import { classifyNetworkError } from './classify-error.js';

describe('classifyNetworkError', () => {
  it('keeps the original message for unknown failures', () => {
    const result = classifyNetworkError(new TypeError('Cannot destructure property address'));
    expect(result.category).toBe('UNKNOWN');
    expect(result.message).toContain('Cannot destructure');
  });

  it('maps timeouts', () => {
    expect(classifyNetworkError(Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }))).toMatchObject({
      category: 'CONNECTION_TIMEOUT',
    });
  });
});
