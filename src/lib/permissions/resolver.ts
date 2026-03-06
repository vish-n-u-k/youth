// ============================================
// PERMISSION RESOLVER
// ============================================
// Resolves all permissions for a user from roles + direct grants

import { db } from '@/server/db';

import type { ResolvedPermissions } from './types';

/**
 * Resolve all permissions for a user in a specific organization context
 *
 * Permission resolution order:
 * 1. Get user's roles (global + org-scoped, excluding expired)
 * 2. Collect permissions from all roles
 * 3. Get direct permissions from user_permission_maps (excluding expired)
 * 4. Merge & deduplicate
 */
export async function resolveUserPermissions(
  userId: string,
  organizationId?: string
): Promise<ResolvedPermissions> {
  const now = new Date();

  // 1. Get user's roles (global + org-scoped, not expired)
  const userRoles = await db.userRole.findMany({
    where: {
      userId,
      AND: [
        {
          OR: [
            { organizationId: null }, // Global roles
            ...(organizationId ? [{ organizationId }] : []), // Org-specific roles
          ],
        },
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      ],
    },
    include: {
      role: true,
    },
  });

  // 2. Extract role names and permissions
  const roles: string[] = [];
  const rolePermissions: string[] = [];

  for (const ur of userRoles) {
    const role = ur.role;
    if (!role) {continue;}

    // Include global roles always, org roles only if matching
    if (role.organizationId === null || role.organizationId === organizationId) {
      roles.push(role.name);
      rolePermissions.push(...(role.permissions || []));
    }
  }

  // 3. Get direct permissions
  const directMaps = await db.userPermissionMap.findMany({
    where: {
      userId,
      OR: [
        { organizationId: null }, // Global direct permissions
        ...(organizationId ? [{ organizationId }] : []), // Org-specific
      ],
    },
  });

  const directPermissions: string[] = [];
  for (const map of directMaps) {
    // Skip expired
    if (map.expiresAt && map.expiresAt <= now) {continue;}
    directPermissions.push(...(map.permissions || []));
  }

  // 4. Combine and deduplicate
  const allPermissions = [...new Set([...rolePermissions, ...directPermissions])];

  return {
    roles: [...new Set(roles)],
    permissions: allPermissions,
    rolePermissions: [...new Set(rolePermissions)],
    directPermissions: [...new Set(directPermissions)],
  };
}

/**
 * Quick check: does user have permission?
 * Use this for backend middleware
 */
export async function userHasPermission(
  userId: string,
  organizationId: string | undefined,
  requiredPermission: string
): Promise<boolean> {
  const { permissions } = await resolveUserPermissions(userId, organizationId);

  // Check with wildcard support
  return permissions.some((held) => {
    if (held === requiredPermission) {return true;}
    if (held === '*') {return true;}

    const heldParts = held.split(':');
    const reqParts = requiredPermission.split(':');
    if (heldParts.length !== reqParts.length) {return false;}

    return heldParts.every((part, i) => part === '*' || part === reqParts[i]);
  });
}
