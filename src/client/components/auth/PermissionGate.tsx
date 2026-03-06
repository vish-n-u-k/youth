'use client';

// ============================================
// PERMISSION GATE COMPONENT
// ============================================
// Conditionally render children based on permissions

import { type ReactNode } from 'react';

import { usePermissions } from '@/client/hooks/use-permissions';
import { satisfiesRequirement } from '@/lib/permissions/matcher';

import type { PermissionRequirement } from '@/lib/permissions/types';

interface PermissionGateProps {
  /** Single permission key required */
  require?: string;
  /** ANY of these permissions required */
  requireAny?: string[];
  /** ALL of these permissions required */
  requireAll?: string[];
  /** Content to render if allowed */
  children: ReactNode;
  /** Content to render if denied (default: null) */
  fallback?: ReactNode;
  /** Content to render while loading (default: null) */
  loading?: ReactNode;
}

/**
 * Gate component that shows/hides content based on permissions
 *
 * @example
 * // Single permission
 * <PermissionGate require="projects:create:all">
 *   <button>Create Project</button>
 * </PermissionGate>
 *
 * @example
 * // ANY of these permissions
 * <PermissionGate requireAny={['projects:read:all', 'admin:access:all']}>
 *   <ProjectList />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate require="billing:manage:all" fallback={<p>No access</p>}>
 *   <BillingPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  require,
  requireAny,
  requireAll,
  children,
  fallback = null,
  loading: loadingFallback = null,
}: PermissionGateProps) {
  const { permissions, loading } = usePermissions();

  if (loading) {return <>{loadingFallback}</>;}

  // Build requirement from props
  let requirement: PermissionRequirement = null;
  if (require) {requirement = require;}
  else if (requireAny?.length) {requirement = { any: requireAny };}
  else if (requireAll?.length) {requirement = { all: requireAll };}

  // Check if satisfied
  const allowed = satisfiesRequirement(permissions, requirement);

  return <>{allowed ? children : fallback}</>;
}
