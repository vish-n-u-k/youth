/**
 * @purpose Application error classes aligned with global error envelope
 * @inputs  architect_output/global_security_policies.json (errorHandling)
 * @outputs Standard ApiError envelope: { error, message, statusCode }
 * @errors  Known status codes: 400, 401, 403, 404, 409, 410, 429, 500
 */

export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string): AppError {
    return new AppError('BAD_REQUEST', message, 400);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Insufficient permissions'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(resource: string): AppError {
    return new AppError('NOT_FOUND', `${resource} not found`, 404);
  }

  static conflict(message: string): AppError {
    return new AppError('CONFLICT', message, 409);
  }

  static gone(message: string): AppError {
    return new AppError('GONE', message, 410);
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): AppError {
    return new AppError('TOO_MANY_REQUESTS', message, 429);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500);
  }

  toJSON(): { error: string; message: string; statusCode: number } {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

export class ValidationError extends AppError {
  constructor(
    public errors: Array<{ field: string; message: string }>
  ) {
    super('VALIDATION_ERROR', 'Validation failed', 400);
  }

  override toJSON(): { error: string; message: string; statusCode: number; details?: unknown } {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.errors,
    };
  }
}
