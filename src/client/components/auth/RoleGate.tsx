'use client';

// ============================================
// ROLE GATE COMPONENT
// ============================================
// Conditionally render children based on roles

import { type ReactNode } from 'react';

import { usePermissions } from '@/client/hooks/use-permissions';
import { satisfiesRoleRequirement } from '@/lib/permissions/matcher';

import type { RoleRequirement } from '@/lib/permissions/types';

interface RoleGateProps {
  /** Single role name required */
  require?: string;
  /** ANY of these roles required */
  requireAny?: string[];
  /** ALL of these roles required */
  requireAll?: string[];
  /** Content to render if allowed */
  children: ReactNode;
  /** Content to render if denied (default: null) */
  fallback?: ReactNode;
  /** Content to render while loading (default: null) */
  loading?: ReactNode;
}

/**
 * Gate component that shows/hides content based on roles
 *
 * @example
 * // Single role
 * <RoleGate require="Admin">
 *   <AdminPanel />
 * </RoleGate>
 *
 * @example
 * // ANY of these roles
 * <RoleGate requireAny={['Admin', 'Developer']}>
 *   <DevTools />
 * </RoleGate>
 *
 * @example
 * // With fallback
 * <RoleGate require="Platform Admin" fallback={<p>Platform admins only</p>}>
 *   <PlatformSettings />
 * </RoleGate>
 */
export function RoleGate({
  require,
  requireAny,
  requireAll,
  children,
  fallback = null,
  loading: loadingFallback = null,
}: RoleGateProps) {
  const { roles, loading } = usePermissions();

  if (loading) {return <>{loadingFallback}</>;}

  // Build requirement from props
  let requirement: RoleRequirement | null = null;
  if (require) {requirement = require;}
  else if (requireAny?.length) {requirement = { any: requireAny };}
  else if (requireAll?.length) {requirement = { all: requireAll };}

  // No requirement = allow
  if (!requirement) {return <>{children}</>;}

  // Check if satisfied
  const allowed = satisfiesRoleRequirement(roles, requirement);

  return <>{allowed ? children : fallback}</>;
}
