// ============================================
// ROUTE MATCHER
// ============================================

import type { RoutePermissionEntry } from './types';

/**
 * Convert route pattern to regex
 *
 * @example
 * /api/projects/:id  →  ^/api/projects/[^/]+$
 * /api/admin/*       →  ^/api/admin/.*$
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:(\w+)/g, '[^/]+')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/**
 * Find matching route entry from registry
 *
 * @param registry - Array of route permission entries
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path
 * @returns Matching entry or null
 */
export function findRoutePermission(
  registry: RoutePermissionEntry[],
  method: string,
  path: string
): RoutePermissionEntry | null {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.split('?')[0] ?? path; // Remove query string

  for (const entry of registry) {
    // Check method match (wildcard '*' matches all)
    if (entry.method !== '*' && entry.method.toUpperCase() !== normalizedMethod) {
      continue;
    }

    // Check path match
    if (patternToRegex(entry.path).test(normalizedPath)) {
      return entry;
    }
  }

  return null;
}

/**
 * Check if a path matches a pattern
 */
export function pathMatchesPattern(pattern: string, path: string): boolean {
  return patternToRegex(pattern).test(path.split('?')[0] ?? path);
}
