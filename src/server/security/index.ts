// ============================================
// SECURITY MODULE - PUBLIC API
// ============================================

// Rate limiting
export {
  checkRateLimit,
  resetRateLimit,
  getRateLimitHeaders,
  type RateLimitResult,
} from './rate-limit';

// Account lockout
export {
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  unlockAccount,
  type LockoutStatus,
} from './lockout';

// Audit logging
export { auditLog, getAuditLogs, cleanupAuditLogs, type AuditLogEntry } from './audit';

// Password rules
export {
  validatePassword,
  getPasswordRequirements,
  getPasswordZodSchema,
  type PasswordValidationResult,
  type PasswordRequirement,
} from './password-rules';
