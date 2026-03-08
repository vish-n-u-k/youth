/**
 * @purpose Security configuration aligned with architecture
 * @inputs  architect_output/global_security_policies.json
 */
export const security = {
  rateLimit: {
    enabled: true,
  },

  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSymbols: false,
  },

  session: {
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    cookieName: 'session',
    invalidateOnPasswordChange: true,
    maxConcurrentSessions: 5,
  },

  audit: {
    enabled: true,
    retentionDays: 365,
  },
} as const;

export type SecurityConfig = typeof security;
