export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class PlanLimitError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PLAN_LIMIT', 402, details);
    this.name = 'PlanLimitError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}
