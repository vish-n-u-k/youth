// ============================================
// PERMISSION SYSTEM - PUBLIC API
// ============================================

// Types
export type {
  PermissionRequirement,
  RoleRequirement,
  RoutePermissionEntry,
  Role,
  UserAuthContext,
  ResolvedPermissions,
  PermissionTokenPayload,
} from './types';

// Matchers
export {
  matchesPermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  satisfiesRequirement,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  satisfiesRoleRequirement,
} from './matcher';

// Route Matcher
export { findRoutePermission, pathMatchesPattern } from './route-matcher';

// Resolver (server-only)
export { resolveUserPermissions, userHasPermission } from './resolver';
