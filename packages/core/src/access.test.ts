import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError } from '@pingo/shared';
import { assertOwned } from './access.js';

describe('monitor authorization', () => {
  it('allows the owner to access their monitor', () => {
    const monitor = { id: 'm1', userId: 'user-a' };
    expect(assertOwned(monitor, 'user-a')).toBe(monitor);
  });

  it('blocks user A from reading, editing, deleting or checking user B monitor', () => {
    expect(() => assertOwned({ id: 'm1', userId: 'user-b' }, 'user-a')).toThrow(ForbiddenError);
  });

  it('hides missing monitors', () => {
    expect(() => assertOwned(null, 'user-a')).toThrow(NotFoundError);
  });
});
