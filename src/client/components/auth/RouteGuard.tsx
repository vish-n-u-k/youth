'use client';

// ============================================
// ROUTE GUARD COMPONENT
// ============================================
// Protect pages with permission/role requirements

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { usePermissions } from '@/client/hooks/use-permissions';
import { useAuth } from '@/client/lib/auth-context';
import { PAGE_PERMISSIONS } from '@/config/route-permissions';
import { satisfiesRequirement, satisfiesRoleRequirement } from '@/lib/permissions/matcher';
import { findRoutePermission } from '@/lib/permissions/route-matcher';

import type { PermissionRequirement, RoleRequirement } from '@/lib/permissions/types';

interface RouteGuardProps {
  children: ReactNode;
  // Permission-based
  permission?: string;
  permissionAny?: string[];
  permissionAll?: string[];
  // Role-based
  role?: string;
  roleAny?: string[];
  roleAll?: string[];
  // Config
  redirectTo?: string;
  loading?: ReactNode;
}

/**
 * Route guard that protects pages
 *
 * @example
 * // Protect by permission (from PAGE_PERMISSIONS registry)
 * export default function ProjectsPage() {
 *   return (
 *     <RouteGuard>
 *       <ProjectsList />
 *     </RouteGuard>
 *   );
 * }
 *
 * @example
 * // Protect by explicit permission
 * export default function AdminPage() {
 *   return (
 *     <RouteGuard permission="admin:access:all">
 *       <AdminDashboard />
 *     </RouteGuard>
 *   );
 * }
 *
 * @example
 * // Protect by role
 * export default function PlatformSettingsPage() {
 *   return (
 *     <RouteGuard role="Platform Admin">
 *       <PlatformSettings />
 *     </RouteGuard>
 *   );
 * }
 */
export function RouteGuard({
  children,
  permission,
  permissionAny,
  permissionAll,
  role,
  roleAny,
  roleAll,
  redirectTo = '/login',
  loading: loadingComponent = <DefaultLoading />,
}: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { permissions, roles, loading: permLoading } = usePermissions();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Wait for auth and permissions to load
    if (authLoading || permLoading) {return;}

    // Build permission requirement from props or registry
    let permRequirement: PermissionRequirement = null;
    if (permission) {permRequirement = permission;}
    else if (permissionAny?.length) {permRequirement = { any: permissionAny };}
    else if (permissionAll?.length) {permRequirement = { all: permissionAll };}
    else {
      // Look up in registry
      const entry = findRoutePermission(PAGE_PERMISSIONS, 'GET', pathname);
      permRequirement = entry?.permission ?? 'authenticated';
    }

    // Build role requirement from props
    let roleRequirement: RoleRequirement | null = null;
    if (role) {roleRequirement = role;}
    else if (roleAny?.length) {roleRequirement = { any: roleAny };}
    else if (roleAll?.length) {roleRequirement = { all: roleAll };}

    // Public route
    if (permRequirement === null) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    // Must be authenticated
    if (!isAuthenticated) {
      router.replace(`${redirectTo}?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check role requirement (if specified)
    if (roleRequirement && !satisfiesRoleRequirement(roles, roleRequirement)) {
      router.replace('/unauthorized');
      return;
    }

    // Check permission requirement
    if (permRequirement === 'authenticated') {
      // Just needs to be logged in
      setAuthorized(true);
      setChecking(false);
      return;
    }

    if (!satisfiesRequirement(permissions, permRequirement)) {
      router.replace('/unauthorized');
      return;
    }

    // All checks passed
    setAuthorized(true);
    setChecking(false);
  }, [
    pathname,
    permissions,
    roles,
    authLoading,
    permLoading,
    isAuthenticated,
    permission,
    permissionAny,
    permissionAll,
    role,
    roleAny,
    roleAll,
    router,
    redirectTo,
  ]);

  // Show loading while checking
  if (authLoading || permLoading || checking) {
    return <>{loadingComponent}</>;
  }

  // Show children if authorized
  if (authorized) {
    return <>{children}</>;
  }

  // Still loading/redirecting
  return <>{loadingComponent}</>;
}

function DefaultLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  );
}

/**
 * Simple auth guard - just checks if user is logged in
 */
export function AuthGuard({
  children,
  redirectTo = '/login',
  loading: loadingComponent = <DefaultLoading />,
}: {
  children: ReactNode;
  redirectTo?: string;
  loading?: ReactNode;
}) {
  return (
    <RouteGuard redirectTo={redirectTo} loading={loadingComponent}>
      {children}
    </RouteGuard>
  );
}
