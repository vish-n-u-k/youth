// ============================================
// ROUTE PERMISSIONS REGISTRY
// ============================================
// This is the ONLY file you customize per project.
// Define your API routes and their required permissions here.

import type { RoutePermissionEntry } from '@/lib/permissions/types';

/**
 * API Route Permissions
 *
 * Permission values:
 * - null: Public route (no auth required)
 * - 'authenticated': Any logged-in user
 * - 'permission:key': Specific permission required
 * - { any: [...] }: ANY of these permissions
 * - { all: [...] }: ALL of these permissions
 */
export const ROUTE_PERMISSIONS: RoutePermissionEntry[] = [
  // ═══════════════════════════════════════════════════════
  // PUBLIC ROUTES
  // ═══════════════════════════════════════════════════════
  { method: 'POST', path: '/api/auth/register', permission: null },
  { method: 'POST', path: '/api/auth/login', permission: null },
  { method: 'POST', path: '/api/auth/forgot-password', permission: null },
  { method: 'GET', path: '/api/health', permission: null },

  // ═══════════════════════════════════════════════════════
  // AUTH (authenticated, no specific permission)
  // ═══════════════════════════════════════════════════════
  { method: 'GET', path: '/api/auth/me', permission: 'authenticated' },
  { method: 'POST', path: '/api/auth/logout', permission: 'authenticated' },
  { method: 'GET', path: '/api/auth/permissions', permission: 'authenticated' },

  // ═══════════════════════════════════════════════════════
  // ROLES (role management endpoints)
  // ═══════════════════════════════════════════════════════
  { method: 'GET', path: '/api/roles', permission: 'users:read:all' },
  { method: 'POST', path: '/api/roles', permission: 'users:manage:all' },
  { method: 'GET', path: '/api/roles/:id', permission: 'users:read:all' },
  { method: 'PUT', path: '/api/roles/:id', permission: 'users:manage:all' },
  { method: 'DELETE', path: '/api/roles/:id', permission: 'users:manage:all' },

  // ═══════════════════════════════════════════════════════
  // USER ROLE ASSIGNMENTS
  // ═══════════════════════════════════════════════════════
  { method: 'GET', path: '/api/users/:id/roles', permission: 'users:read:all' },
  { method: 'POST', path: '/api/users/:id/roles', permission: 'users:manage:all' },
  { method: 'DELETE', path: '/api/users/:id/roles/:roleId', permission: 'users:manage:all' },

  // ═══════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════
  {
    method: 'GET',
    path: '/api/users',
    permission: { any: ['users:read:all', 'admin:access:all'] },
  },
  {
    method: 'GET',
    path: '/api/users/:id',
    permission: { any: ['users:read:all', 'admin:access:all'] },
  },
  { method: 'PUT', path: '/api/users/:id', permission: 'users:manage:all' },
  { method: 'DELETE', path: '/api/users/:id', permission: 'users:manage:all' },

  // ═══════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════
  { method: 'GET', path: '/api/admin/dashboard', permission: 'admin:access:all' },
  {
    method: 'DELETE',
    path: '/api/admin/purge',
    permission: { all: ['admin:access:all', 'system:admin:all'] },
  },
  { method: '*', path: '/api/admin/*', permission: 'admin:access:all' },

  // ═══════════════════════════════════════════════════════
  // ADD YOUR ROUTES BELOW
  // ═══════════════════════════════════════════════════════
  //
  // Example for projects:
  // { method: 'GET', path: '/api/projects', permission: 'projects:read:all' },
  // { method: 'POST', path: '/api/projects', permission: 'projects:create:all' },
  // { method: 'GET', path: '/api/projects/:id', permission: 'projects:read:all' },
  // { method: 'PUT', path: '/api/projects/:id', permission: 'projects:update:all' },
  // { method: 'DELETE', path: '/api/projects/:id', permission: 'projects:delete:all' },
];

/**
 * Page Permissions (Frontend routing)
 *
 * Used by RouteGuard component to protect pages
 */
export const PAGE_PERMISSIONS: RoutePermissionEntry[] = [
  // Public pages
  { method: 'GET', path: '/login', permission: null },
  { method: 'GET', path: '/register', permission: null },
  { method: 'GET', path: '/forgot-password', permission: null },

  // Protected pages
  { method: 'GET', path: '/dashboard', permission: 'authenticated' },
  { method: 'GET', path: '/settings', permission: 'authenticated' },
  { method: 'GET', path: '/admin', permission: 'admin:access:all' },
  { method: 'GET', path: '/admin/*', permission: 'admin:access:all' },

  // ═══════════════════════════════════════════════════════
  // ADD YOUR PAGE ROUTES BELOW
  // ═══════════════════════════════════════════════════════
  //
  // Example:
  // { method: 'GET', path: '/projects', permission: 'projects:read:all' },
  // { method: 'GET', path: '/projects/new', permission: 'projects:create:all' },
  // { method: 'GET', path: '/projects/:id', permission: 'projects:read:all' },
];
