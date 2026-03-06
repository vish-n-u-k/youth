// ============================================
// PERMISSION & ROLE MATCHERS
// ============================================

import type { PermissionRequirement, RoleRequirement } from './types';

// ============================================
// PERMISSION MATCHERS
// ============================================

/**
 * Check if held permission matches required permission
 * Supports wildcards: *, domain:*:scope, *:action:*, etc.
 *
 * @example
 * matchesPermission('*', 'projects:read:all') // true
 * matchesPermission('projects:*:all', 'projects:read:all') // true
 * matchesPermission('projects:read:all', 'projects:read:all') // true
 * matchesPermission('projects:read:all', 'projects:write:all') // false
 */
export function matchesPermission(held: string, required: string): boolean {
  if (held === required) {return true;}
  if (held === '*') {return true;}

  const heldParts = held.split(':');
  const requiredParts = required.split(':');

  if (heldParts.length !== requiredParts.length) {return false;}

  for (let i = 0; i < heldParts.length; i++) {
    if (heldParts[i] !== '*' && heldParts[i] !== requiredParts[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(userKeys: string[], required: string): boolean {
  if (!userKeys?.length) {return false;}
  return userKeys.some((held) => matchesPermission(held, required));
}

/**
 * Check if user has ANY of the required permissions
 */
export function hasAnyPermission(userKeys: string[], required: string[]): boolean {
  if (!required?.length) {return false;}
  return required.some((req) => hasPermission(userKeys, req));
}

/**
 * Check if user has ALL of the required permissions
 */
export function hasAllPermissions(userKeys: string[], required: string[]): boolean {
  if (!required?.length) {return false;}
  return required.every((req) => hasPermission(userKeys, req));
}

/**
 * Check if user satisfies a permission requirement
 */
export function satisfiesRequirement(
  userKeys: string[],
  requirement: PermissionRequirement
): boolean {
  if (requirement === null) {return true;}
  if (requirement === 'authenticated') {return userKeys !== null;}
  if (!userKeys?.length) {return false;}
  if (typeof requirement === 'string') {return hasPermission(userKeys, requirement);}
  if ('any' in requirement) {return hasAnyPermission(userKeys, requirement.any);}
  if ('all' in requirement) {return hasAllPermissions(userKeys, requirement.all);}
  return false;
}

// ============================================
// ROLE MATCHERS
// ============================================

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[], required: string): boolean {
  if (!userRoles?.length) {return false;}
  return userRoles.includes(required);
}

/**
 * Check if user has ANY of the required roles
 */
export function hasAnyRole(userRoles: string[], required: string[]): boolean {
  if (!required?.length) {return false;}
  return required.some((role) => hasRole(userRoles, role));
}

/**
 * Check if user has ALL of the required roles
 */
export function hasAllRoles(userRoles: string[], required: string[]): boolean {
  if (!required?.length) {return false;}
  return required.every((role) => hasRole(userRoles, role));
}

/**
 * Check if user satisfies a role requirement
 */
export function satisfiesRoleRequirement(
  userRoles: string[],
  requirement: RoleRequirement
): boolean {
  if (!userRoles?.length) {return false;}
  if (typeof requirement === 'string') {return hasRole(userRoles, requirement);}
  if ('any' in requirement) {return hasAnyRole(userRoles, requirement.any);}
  if ('all' in requirement) {return hasAllRoles(userRoles, requirement.all);}
  return false;
}
