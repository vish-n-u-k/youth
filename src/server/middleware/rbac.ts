/**
 * @purpose RBAC enforcement middleware — checks admin role
 * @inputs  architect_output/global_middleware_registry.json (role_permission_check, order 6)
 * @outputs void (passes through if authorized; returns 403 if not)
 * @sideEffects None
 * @errors  403 FORBIDDEN if role check fails; 401 if no admin in context
 *
 * Must run AFTER authSession middleware (order 5 → 6).
 * MVP: single role "admin" — all protected endpoints require it.
 */
import type { MiddlewareFn } from './pipeline';
import { assertRole } from '@/server/services/rolePermissionService';
import { AppError } from '@/server/errors';

export function requireRole(role = 'admin'): MiddlewareFn {
  return async (_req, ctx) => {
    if (!ctx.admin) {
      throw AppError.unauthorized('Authentication required');
    }
    assertRole(ctx.admin.role, role);
  };
}
