/**
 * @purpose RBAC service — validates admin role against endpoint requirements
 * @inputs  architect_output/global_services_registry.json (rolePermissionService)
 * @outputs requireRole middleware factory
 * @sideEffects None (read-only check)
 * @errors  403 if role check fails
 *
 * Current MVP: single role "admin". All protected endpoints require admin role.
 * Future: add granular permissions per endpoint.
 */
import { AppError } from '@/server/errors';

/**
 * @purpose Check if an admin has the required role
 * @inputs  adminRole (from session), requiredRole
 * @outputs void (throws on failure)
 * @errors  403 FORBIDDEN if role mismatch
 */
export function assertRole(adminRole: string, requiredRole = 'admin'): void {
  if (adminRole !== requiredRole) {
    throw AppError.forbidden(`Role '${requiredRole}' required`);
  }
}
