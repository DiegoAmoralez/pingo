import { ForbiddenError, NotFoundError } from '@pingo/shared';

export function assertOwned<T extends { userId: string }>(entity: T | null, userId: string): T {
  if (!entity) throw new NotFoundError('Monitor not found');
  if (entity.userId !== userId) throw new ForbiddenError('You do not have access to this monitor');
  return entity;
}
