// ============================================
// PERMISSION TYPES
// ============================================

/**
 * Permission requirement for a route or component
 */
/**
 * Permission key pattern (e.g., "users:read:all")
 */
export type PermissionKey = string & { readonly __brand?: 'PermissionKey' };

export type PermissionRequirement =
  | null // Public - no auth required
  | 'authenticated' // Any logged-in user
  | PermissionKey // Single permission key
  | { any: PermissionKey[] } // ANY of these permissions
  | { all: PermissionKey[] }; // ALL of these permissions

/**
 * Role requirement for a route or component
 */
export type RoleRequirement =
  | string // Single role name
  | { any: string[] } // ANY of these roles
  | { all: string[] }; // ALL of these roles

/**
 * Route permission entry in the registry
 */
export interface RoutePermissionEntry {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*';
  path: string;
  permission: PermissionRequirement;
  description?: string;
}

/**
 * Role with its permissions
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  organizationId: string | null; // null = global
  isSystem: boolean;
}

/**
 * User's auth context (attached to requests)
 */
export interface UserAuthContext {
  userId: string;
  email: string;
  organizationId?: string;
  roles: string[]; // role names
  permissions: string[]; // resolved permission keys
}

/**
 * Resolved permissions result
 */
export interface ResolvedPermissions {
  roles: string[]; // Role names user has
  permissions: string[]; // All resolved permission keys
  rolePermissions: string[]; // Permissions from roles only
  directPermissions: string[]; // Permissions from direct grants only
}

/**
 * Permission JWT payload
 */
export interface PermissionTokenPayload {
  sub: string; // user id
  org?: string; // organization id
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}
