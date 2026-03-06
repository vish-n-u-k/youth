// ============================================
// AUTH MODULE - PUBLIC API
// ============================================

// Middleware
export { withAuth, getAuth, type AuthenticatedRequest } from './middleware';

// JWT utilities
export {
  createSessionToken,
  verifySessionToken,
  createPermissionToken,
  verifyPermissionToken,
  type SessionTokenPayload,
  type PermissionTokenPayload,
} from './jwt';

// Password utilities
export { hashPassword, verifyPassword } from './password';
