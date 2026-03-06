'use client';

// ============================================
// PERMISSION HOOKS
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';

import { useAuth } from '@/client/lib/auth-context';
import {
  fetchAndStorePermissions,
  getPermissionKeys,
  getRoleNames,
} from '@/client/lib/permission-service';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  hasAllRoles,
} from '@/lib/permissions/matcher';

interface UsePermissionsResult {
  permissions: string[];
  roles: string[];
  loading: boolean;
  refresh: () => Promise<void>;
}

interface UseCheckResult {
  allowed: boolean;
  loading: boolean;
}

/**
 * Hook to get all permissions and roles for the current user
 */
export function usePermissions(): UsePermissionsResult {
  const { isAuthenticated, organizationId } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    // Try cached first
    const cachedPerms = getPermissionKeys();
    const cachedRoles = getRoleNames();
    if (cachedPerms.length > 0 || cachedRoles.length > 0) {
      setPermissions(cachedPerms);
      setRoles(cachedRoles);
      setLoading(false);
      return;
    }

    // Fetch fresh
    void fetchAndStorePermissions(organizationId).then(({ roles: r, permissions: p }) => {
      setPermissions(p);
      setRoles(r);
      setLoading(false);
    });
  }, [isAuthenticated, organizationId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { roles, permissions } = await fetchAndStorePermissions(organizationId);
    setPermissions(permissions);
    setRoles(roles);
    setLoading(false);
  }, [organizationId]);

  return { permissions, roles, loading, refresh };
}

// ============================================
// PERMISSION HOOKS
// ============================================

/**
 * Check if user has a specific permission
 */
export function useCheckPermission(required: string): UseCheckResult {
  const { permissions, loading } = usePermissions();
  const allowed = useMemo(
    () => !loading && hasPermission(permissions, required),
    [permissions, loading, required]
  );
  return { allowed, loading };
}

/**
 * Check if user has ANY of the required permissions
 */
export function useCheckAnyPermission(required: string[]): UseCheckResult {
  const { permissions, loading } = usePermissions();
  const allowed = useMemo(
    () => !loading && hasAnyPermission(permissions, required),
    [permissions, loading, required]
  );
  return { allowed, loading };
}

/**
 * Check if user has ALL of the required permissions
 */
export function useCheckAllPermissions(required: string[]): UseCheckResult {
  const { permissions, loading } = usePermissions();
  const allowed = useMemo(
    () => !loading && hasAllPermissions(permissions, required),
    [permissions, loading, required]
  );
  return { allowed, loading };
}

// ============================================
// ROLE HOOKS
// ============================================

/**
 * Check if user has a specific role
 */
export function useCheckRole(required: string): UseCheckResult {
  const { roles, loading } = usePermissions();
  const allowed = useMemo(
    () => !loading && hasRole(roles, required),
    [roles, loading, required]
  );
  return { allowed, loading };
}

/**
 * Check if user has ANY of the required roles
 */
export function useCheckAnyRole(required: string[]): UseCheckResult {
  const { roles, loading } = usePermissions();
  const allowed = useMemo(
    () => !loading && hasAnyRole(roles, required),
    [roles, loading, required]
  );
  return { allowed, loading };
}

/**
 * Check if user has ALL of the required roles
 */
export function useCheckAllRoles(required: string[]): UseCheckResult {
  const { roles, loading } = usePermissions();
  const allowed = useMemo(
    () => !loading && hasAllRoles(roles, required),
    [roles, loading, required]
  );
  return { allowed, loading };
}
