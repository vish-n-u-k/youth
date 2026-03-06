// ============================================
// CLIENT LIB - PUBLIC API
// ============================================

// Auth context
export { AuthProvider, useAuth } from './auth-context';

// Permission service
export {
  fetchAndStorePermissions,
  getPermissionPayload,
  getPermissionKeys,
  getRoleNames,
  clearPermissions,
  hasPermissionCache,
  type PermissionTokenPayload,
} from './permission-service';
