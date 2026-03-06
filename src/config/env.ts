// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
// Validates required environment variables at startup.
// Throws an error if required variables are missing.

/**
 * Required environment variables
 * The app will not start without these.
 */
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'] as const;

/**
 * Minimum length requirements for security-sensitive variables
 */
const MIN_LENGTHS: Partial<Record<string, number>> = {
  JWT_SECRET: 32,
};

class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

function validateEnv(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];

    if (!value) {
      missing.push(key);
      continue;
    }

    const minLength = MIN_LENGTHS[key];
    if (minLength && value.length < minLength) {
      invalid.push(`${key} must be at least ${minLength} characters (got ${value.length})`);
    }
  }

  if (missing.length > 0) {
    throw new EnvValidationError(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Copy .env.example to .env.local and fill in the values.`
    );
  }

  if (invalid.length > 0) {
    throw new EnvValidationError(`Invalid environment variables: ${invalid.join('; ')}`);
  }
}

// Validate on module load (at app startup)
validateEnv();

/**
 * Type-safe environment configuration
 * Only access env vars through this object to ensure they are validated.
 */
export const env = {
  /** JWT secret for signing tokens (min 32 chars) */
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new EnvValidationError('JWT_SECRET is not configured');
    }
    return secret;
  },

  /** Database connection URL */
  get databaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new EnvValidationError('DATABASE_URL is not configured');
    }
    return url;
  },

  /** Current environment */
  get nodeEnv(): 'development' | 'production' | 'test' {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production' || nodeEnv === 'test') {
      return nodeEnv;
    }
    return 'development';
  },

  /** Whether running in production */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },

  /** Whether running in development */
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },
} as const;
