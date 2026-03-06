/**
 * Custom application error
 *
 * Use this for domain-specific errors that should be
 * returned to the client with proper HTTP status codes.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(resource: string): AppError {
    return new AppError(
      'NOT_FOUND',
      `${resource} not found`,
      404
    );
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string): AppError {
    return new AppError(
      'CONFLICT',
      message,
      409
    );
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(
      'UNAUTHORIZED',
      message,
      401
    );
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message = 'Permission denied'): AppError {
    return new AppError(
      'FORBIDDEN',
      message,
      403
    );
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string): AppError {
    return new AppError(
      'BAD_REQUEST',
      message,
      400
    );
  }
}
