# Global FE Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the global FE foundation — layouts, navigation, auth guard, screen states, API client, and route structure — so module FE implementation can proceed.

**Architecture:** Next.js 14 App Router with three layout shells (admin sidebar+header, public minimal, auth centered). Session-based auth via httpOnly cookies. Chakra UI v3 for component primitives. Lucide React for icons. Single-role (admin) RBAC — no complex permission system needed for MVP.

**Tech Stack:** Next.js 14.2, React 18.3, TypeScript 5.5, Chakra UI 3.34, Lucide React (to install), Zod 3.23

---

## Existing Codebase Summary (Read First)

### Reuse as-is
- `src/app/providers.tsx` — ChakraProvider + AuthProvider wrapper
- `src/client/api/client.ts` — API client (needs minor adaptation)
- `src/client/lib/auth-context.tsx` — Auth context (needs minor adaptation)
- `src/shared/types/index.ts` — ApiResponse, PaginatedResponse types
- `src/shared/utils/index.ts` — cn(), debounce(), etc.
- `src/app/globals.css` — CSS variables (keep, extend)

### Replace / Heavy Refactor
- `src/client/components/auth/RouteGuard.tsx` — Over-engineered for our single-role admin app. Replace with simple auth guard.
- `src/client/lib/permission-service.ts` — JWT permission caching, not needed (session-based auth)
- `src/client/hooks/use-permissions.ts` — Complex permission hooks, not needed
- `src/lib/permissions/*` — Legacy RBAC matcher, not needed
- `src/config/route-permissions.ts` — Legacy route permission registry, not needed
- `src/app/(auth)/login/page.tsx` — Wrong route path, references old auth
- `src/app/(auth)/register/page.tsx` — Not in architecture (no registration)
- `src/app/(protected)/dashboard/page.tsx` — Wrong route path, legacy code
- `src/app/unauthorized/page.tsx` — Keep concept, move to admin route group

### Path Aliases (tsconfig.json)
- `@/*` → `./src/*`
- `@/server/*` → `./src/server/*`
- `@/client/*` → `./src/client/*`
- `@/shared/*` → `./src/shared/*`

### Key Architecture References
- Sitemap: `architect_output/sitemap.json` — 26 routes (4 auth, 6 public, 16 admin)
- Navigation: `architect_output/global_navigation.json` — sidebar sections, header, breadcrumbs
- Security: `architect_output/global_security_policies.json` — session auth, no JWT
- Auth guard: session check via `GET /api/auth/me`, redirect to `/admin/login`
- BE error envelope: `{ error, message, statusCode, details? }`

---

## Task 1: Install lucide-react

**Files:**
- Modify: `package.json`

**Step 1: Install**

Run: `npm install lucide-react`

**Step 2: Verify**

Run: `cat package.json | grep lucide`
Expected: `"lucide-react": "^0.x.x"` in dependencies

---

## Task 2: Adapt API Client for Cookie Auth

**Files:**
- Modify: `src/client/api/client.ts`

**Step 1: Add credentials to all requests and align error shape with BE envelope**

The BE error envelope is `{ error: string, message: string, statusCode: number, details?: any }`.
The current client wraps responses in `ApiResponse<T>` which has `{ data?, error? }`.

Update the `request` method to include `credentials: 'include'` and fix error extraction:

```typescript
// In the request method, add credentials to fetch options:
const response = await fetch(`${this.baseUrl}${endpoint}`, {
  headers: {
    'Content-Type': 'application/json',
    ...headers,
  },
  credentials: 'include',
  body: body ? JSON.stringify(body) : undefined,
  ...rest,
});
```

Also update `ApiError` construction to handle BE envelope shape:
```typescript
if (!response.ok) {
  const errorData = data as any;
  throw new ApiError(
    errorData.error ?? 'UNKNOWN_ERROR',
    errorData.message ?? 'An unexpected error occurred',
    response.status,
    errorData.details
  );
}
```

Update `ApiError` class to include optional `details`:
```typescript
export class ApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

Since the BE returns data directly (not wrapped in `{ data: ... }`), update return type:
The request method should return `T` directly, not `ApiResponse<T>`.

```typescript
private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  // ... fetch ...
  if (!response.ok) { /* throw ApiError */ }
  return (await response.json()) as T;
}
```

Update all public methods to return `Promise<T>`.

**Step 3: Verify**

Run: `npx tsc --noEmit src/client/api/client.ts`
Expected: No errors from this file (ignore others)

**Step 4: Commit**

```bash
git add src/client/api/client.ts
git commit -m "feat(fe): adapt API client for cookie auth and BE error envelope"
```

---

## Task 3: Simplify Auth Context for Admin-Only App

**Files:**
- Modify: `src/client/lib/auth-context.tsx`

**Step 1: Rewrite auth context**

Remove: `register`, `organizationId`, `setOrganizationId`, `clearPermissions` import
Keep: `login`, `logout`, `refreshUser`, `user`, `isAuthenticated`, `isLoading`

The BE `GET /api/auth/me` returns: `{ id, email, name, role }` (AdminProfile shape).
The BE `POST /api/auth/login` returns: `{ admin: { id, email, name, role } }`.

Updated types:
```typescript
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

Update `refreshUser`:
```typescript
const refreshUser = useCallback(async () => {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setUser(data as AdminUser);
    } else {
      setUser(null);
    }
  } catch {
    setUser(null);
  } finally {
    setIsLoading(false);
  }
}, []);
```

Update `login`:
```typescript
const login = useCallback(async (email: string, password: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setUser(data.admin as AdminUser);
      return { success: true };
    }
    const errorData = await response.json();
    return { success: false, error: errorData.message ?? 'Login failed' };
  } catch {
    return { success: false, error: 'Network error' };
  }
}, []);
```

Remove `register` method entirely.
Remove `clearPermissions` import and all calls to it.
Remove `organizationId` state and setter.

**Step 2: Update providers**

`src/app/providers.tsx` — no changes needed (already imports AuthProvider).

**Step 3: Verify**

Run: `npx tsc --noEmit src/client/lib/auth-context.tsx`

**Step 4: Commit**

```bash
git add src/client/lib/auth-context.tsx
git commit -m "feat(fe): simplify auth context for admin session-based auth"
```

---

## Task 4: Create Simple Auth Guard for Admin Routes

**Files:**
- Create: `src/client/components/auth/AdminGuard.tsx`
- Modify: `src/client/components/auth/index.ts`

**Step 1: Write AdminGuard**

This replaces the complex RouteGuard. For this single-role admin app, auth guard just checks if user is logged in via `useAuth()`. No permission/role matrix needed.

```typescript
'use client';

/**
 * @purpose Protects admin routes by checking session authentication
 * @inputs children: ReactNode, fallbackUrl?: string
 * @outputs Renders children if authenticated, redirects to login if not
 * @sideEffects Triggers redirect via Next.js router on auth failure
 * @errors None thrown — redirects on failure
 */

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/client/lib/auth-context';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e5e5', borderTopColor: '#0070f3', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

**Step 2: Create PublicAuthRedirect for login page**

When already authenticated admin visits /admin/login, redirect to dashboard:

```typescript
'use client';

/**
 * @purpose Redirects authenticated users away from auth pages (login, forgot-password)
 * @inputs children: ReactNode
 * @outputs Renders children if not authenticated, redirects to dashboard if authenticated
 */

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/client/lib/auth-context';

interface AuthRedirectProps {
  children: ReactNode;
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

Put `AuthRedirect` in the same file or a separate `AuthRedirect.tsx`.

**Step 3: Update index.ts**

```typescript
export { AdminGuard } from './AdminGuard';
export { AuthRedirect } from './AuthRedirect';
// Keep legacy exports temporarily if needed
export { PermissionGate } from './PermissionGate';
export { RoleGate } from './RoleGate';
```

**Step 4: Commit**

```bash
git add src/client/components/auth/
git commit -m "feat(fe): add AdminGuard and AuthRedirect for session-based auth"
```

---

## Task 5: Create Screen State Components

**Files:**
- Create: `src/client/components/ui/ScreenStates.tsx`
- Modify: `src/client/components/ui/index.ts`

**Step 1: Build all 5 standard screen states**

These are reusable across all module pages: loading, empty, error, success, no-permission.

```typescript
'use client';

/**
 * @purpose Standard screen state components for consistent UX across all pages
 * @inputs Various props per component (message, onRetry, etc.)
 * @outputs Visual state indicators with appropriate actions
 */

import { Box, Flex, Heading, Text, Button as ChakraButton, Spinner } from '@chakra-ui/react';
import { AlertCircle, CheckCircle, FileQuestion, ShieldX } from 'lucide-react';
import type { ReactNode } from 'react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap={4}>
      <Spinner size="lg" color="blue.500" />
      <Text color="gray.500">{message}</Text>
    </Flex>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title = 'No data',
  message = 'There are no items to display.',
  action,
  icon,
}: EmptyStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap={3} py={10}>
      {icon ?? <FileQuestion size={48} color="#a0aec0" />}
      <Heading size="md" color="gray.600">{title}</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
      {action}
    </Flex>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap={3} py={10}>
      <AlertCircle size={48} color="#e53e3e" />
      <Heading size="md" color="red.600">{title}</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
      {onRetry && (
        <ChakraButton onClick={onRetry} colorScheme="blue" size="sm" mt={2}>
          Try again
        </ChakraButton>
      )}
    </Flex>
  );
}

interface SuccessStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function SuccessState({
  title = 'Success',
  message = 'The operation completed successfully.',
  action,
}: SuccessStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap={3} py={10}>
      <CheckCircle size={48} color="#38a169" />
      <Heading size="md" color="green.600">{title}</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
      {action}
    </Flex>
  );
}

interface NoPermissionStateProps {
  message?: string;
}

export function NoPermissionState({
  message = 'You do not have permission to access this resource.',
}: NoPermissionStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap={3} py={10}>
      <ShieldX size={48} color="#e53e3e" />
      <Heading size="md" color="red.600">Access Denied</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
    </Flex>
  );
}
```

**Step 2: Update ui/index.ts**

```typescript
export { Button } from './Button';
export { LoadingState, EmptyState, ErrorState, SuccessState, NoPermissionState } from './ScreenStates';
```

**Step 3: Verify**

Run: `npx tsc --noEmit src/client/components/ui/ScreenStates.tsx`

**Step 4: Commit**

```bash
git add src/client/components/ui/
git commit -m "feat(fe): add screen state components (loading, empty, error, success, no-permission)"
```

---

## Task 6: Create Admin Sidebar Navigation

**Files:**
- Create: `src/client/components/admin/Sidebar.tsx`

**Step 1: Build sidebar matching global_navigation.json**

Reference: `architect_output/global_navigation.json` sidebar sections.

Navigation items (in order):
1. Dashboard — `/admin/dashboard` — LayoutDashboard icon
2. Leads — `/admin/leads` — Users icon
3. Programs — `/admin/programs` — BookOpen icon (children: All Programs, Coupons)
4. Enrollments — `/admin/enrollments` — ClipboardCheck icon
5. Calendar — `/admin/calendar` — Calendar icon
6. Payments — `/admin/payments` — CreditCard icon
7. Communications — `/admin/communications/templates` — Mail icon (children: Templates, Automations, Log)
8. Settings — `/admin/settings` — Settings icon (children: General, Staff & Roles stub)

```typescript
'use client';

/**
 * @purpose Admin sidebar navigation matching architect_output/global_navigation.json
 * @inputs collapsed: boolean, onToggle: () => void
 * @outputs Sidebar with navigation items, active state based on current route
 * @sideEffects None — purely presentational with Link navigation
 */

import { Box, Flex, Text, IconButton } from '@chakra-ui/react';
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck,
  Calendar, CreditCard, Mail, Settings,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

interface NavChild {
  id: string;
  label: string;
  route: string;
  disabled?: boolean;
  stubMessage?: string;
}

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: ReactNode;
  children?: NavChild[];
}

const MAIN_NAV: NavItem[] = [
  { id: 'nav_dashboard', label: 'Dashboard', route: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'nav_leads', label: 'Leads', route: '/admin/leads', icon: <Users size={20} /> },
  {
    id: 'nav_programs', label: 'Programs', route: '/admin/programs', icon: <BookOpen size={20} />,
    children: [
      { id: 'nav_programs_list', label: 'All Programs', route: '/admin/programs' },
      { id: 'nav_programs_coupons', label: 'Coupons', route: '/admin/programs/coupons' },
    ],
  },
  { id: 'nav_enrollments', label: 'Enrollments', route: '/admin/enrollments', icon: <ClipboardCheck size={20} /> },
  { id: 'nav_calendar', label: 'Calendar', route: '/admin/calendar', icon: <Calendar size={20} /> },
  { id: 'nav_payments', label: 'Payments', route: '/admin/payments', icon: <CreditCard size={20} /> },
  {
    id: 'nav_communications', label: 'Communications', route: '/admin/communications/templates', icon: <Mail size={20} />,
    children: [
      { id: 'nav_comm_templates', label: 'Templates', route: '/admin/communications/templates' },
      { id: 'nav_comm_automations', label: 'Automations', route: '/admin/communications/automations' },
      { id: 'nav_comm_log', label: 'Log', route: '/admin/communications/log' },
    ],
  },
];

const SYSTEM_NAV: NavItem[] = [
  {
    id: 'nav_settings', label: 'Settings', route: '/admin/settings', icon: <Settings size={20} />,
    children: [
      { id: 'nav_settings_general', label: 'General', route: '/admin/settings' },
      { id: 'nav_settings_staff', label: 'Staff & Roles', route: '/admin/settings/staff', disabled: false, stubMessage: 'Staff & Roles management coming in Phase 2' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <Box
      as="nav"
      w={collapsed ? '64px' : '240px'}
      minH="100vh"
      bg="gray.50"
      borderRight="1px solid"
      borderColor="gray.200"
      transition="width 0.2s"
      position="fixed"
      left={0}
      top={0}
      zIndex={10}
      overflowY="auto"
      overflowX="hidden"
    >
      {/* Logo / Brand */}
      <Flex align="center" justify={collapsed ? 'center' : 'space-between'} px={collapsed ? 2 : 4} py={4} borderBottom="1px solid" borderColor="gray.200">
        {!collapsed && (
          <Link href="/admin/dashboard">
            <Text fontWeight="bold" fontSize="lg" color="blue.600">Admin</Text>
          </Link>
        )}
        <IconButton
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          size="sm"
          variant="ghost"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </IconButton>
      </Flex>

      {/* Main Navigation */}
      <Box px={2} py={3}>
        {!collapsed && <Text fontSize="xs" fontWeight="semibold" color="gray.400" px={2} mb={2} textTransform="uppercase">Main</Text>}
        {MAIN_NAV.map((item) => (
          <SidebarItem key={item.id} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </Box>

      {/* System Navigation */}
      <Box px={2} py={3} borderTop="1px solid" borderColor="gray.200">
        {!collapsed && <Text fontSize="xs" fontWeight="semibold" color="gray.400" px={2} mb={2} textTransform="uppercase">System</Text>}
        {SYSTEM_NAV.map((item) => (
          <SidebarItem key={item.id} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </Box>
    </Box>
  );
}

function SidebarItem({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const isActive = pathname === item.route || pathname.startsWith(item.route + '/');
  const hasChildren = item.children && item.children.length > 0;
  const [expanded, setExpanded] = useState(isActive);

  return (
    <Box mb={1}>
      <Flex
        as={hasChildren ? 'button' : Link}
        href={hasChildren ? undefined : item.route}
        onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
        align="center"
        gap={3}
        px={collapsed ? 0 : 3}
        py={2}
        borderRadius="md"
        bg={isActive ? 'blue.50' : 'transparent'}
        color={isActive ? 'blue.700' : 'gray.700'}
        _hover={{ bg: isActive ? 'blue.50' : 'gray.100' }}
        cursor="pointer"
        w="100%"
        justify={collapsed ? 'center' : 'flex-start'}
        textDecoration="none"
      >
        <Box flexShrink={0}>{item.icon}</Box>
        {!collapsed && (
          <>
            <Text fontSize="sm" fontWeight={isActive ? '600' : '400'} flex={1} textAlign="left">{item.label}</Text>
            {hasChildren && (expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </>
        )}
      </Flex>

      {/* Children */}
      {hasChildren && expanded && !collapsed && (
        <Box pl={10} mt={1}>
          {item.children!.map((child) => {
            const childActive = pathname === child.route;
            return (
              <Link key={child.id} href={child.disabled ? '#' : child.route} style={{ textDecoration: 'none' }}>
                <Text
                  fontSize="sm"
                  py={1.5}
                  px={2}
                  borderRadius="md"
                  color={child.disabled ? 'gray.400' : childActive ? 'blue.700' : 'gray.600'}
                  bg={childActive ? 'blue.50' : 'transparent'}
                  fontWeight={childActive ? '600' : '400'}
                  _hover={{ bg: child.disabled ? 'transparent' : 'gray.100' }}
                  cursor={child.disabled ? 'not-allowed' : 'pointer'}
                  title={child.stubMessage}
                >
                  {child.label}
                </Text>
              </Link>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add src/client/components/admin/Sidebar.tsx
git commit -m "feat(fe): add admin sidebar navigation"
```

---

## Task 7: Create Admin Header

**Files:**
- Create: `src/client/components/admin/Header.tsx`

**Step 1: Build header with user menu**

Reference: `architect_output/global_navigation.json` header.admin

```typescript
'use client';

/**
 * @purpose Admin header with user menu (settings, logout)
 * @inputs sidebarCollapsed: boolean (for left offset)
 * @outputs Header bar with user dropdown menu
 * @sideEffects Logout triggers auth context logout + redirect
 */

import { Box, Flex, Text, Menu, MenuButton, MenuItem, MenuList, IconButton } from '@chakra-ui/react';
import { Settings, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/client/lib/auth-context';

interface HeaderProps {
  sidebarWidth: number;
}

export function Header({ sidebarWidth }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={`${sidebarWidth}px`}
      right={0}
      h="56px"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      zIndex={9}
      px={6}
    >
      <Flex align="center" justify="flex-end" h="100%">
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton
              aria-label="User menu"
              variant="ghost"
              size="sm"
            >
              <User size={20} />
            </IconButton>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content minW="180px">
              {user && (
                <Box px={3} py={2} borderBottom="1px solid" borderColor="gray.100">
                  <Text fontSize="sm" fontWeight="600">{user.name}</Text>
                  <Text fontSize="xs" color="gray.500">{user.email}</Text>
                </Box>
              )}
              <Menu.Item value="settings" onClick={() => router.push('/admin/settings')}>
                <Settings size={16} />
                <Text ml={2}>Settings</Text>
              </Menu.Item>
              <Menu.Item value="logout" onClick={handleLogout} color="red.500">
                <LogOut size={16} />
                <Text ml={2}>Logout</Text>
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </Flex>
    </Box>
  );
}
```

> **Note:** Chakra UI v3 Menu API may differ slightly. Adjust imports if needed during implementation. The key structure is: trigger button on right side of header, dropdown with user info + settings link + logout.

**Step 2: Commit**

```bash
git add src/client/components/admin/Header.tsx
git commit -m "feat(fe): add admin header with user menu"
```

---

## Task 8: Create Breadcrumbs Component

**Files:**
- Create: `src/client/components/admin/Breadcrumbs.tsx`

**Step 1: Build breadcrumbs from route mapping**

Reference: `architect_output/global_navigation.json` breadcrumbs section.

```typescript
'use client';

/**
 * @purpose Dynamic breadcrumbs based on current route, matching global_navigation.json mappings
 * @inputs None (reads pathname from Next.js router)
 * @outputs Breadcrumb trail with links to parent routes
 * @sideEffects None
 */

import { Flex, Text } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbMapping {
  pattern: string;
  crumbs: { label: string; href?: string }[];
}

const BREADCRUMB_MAP: BreadcrumbMapping[] = [
  { pattern: '/admin/dashboard', crumbs: [{ label: 'Dashboard' }] },
  { pattern: '/admin/leads/:id', crumbs: [{ label: 'Leads', href: '/admin/leads' }, { label: 'Lead Detail' }] },
  { pattern: '/admin/leads', crumbs: [{ label: 'Leads' }] },
  { pattern: '/admin/programs/coupons', crumbs: [{ label: 'Programs', href: '/admin/programs' }, { label: 'Coupons' }] },
  { pattern: '/admin/programs/:id', crumbs: [{ label: 'Programs', href: '/admin/programs' }, { label: 'Program Setup' }] },
  { pattern: '/admin/programs', crumbs: [{ label: 'Programs' }] },
  { pattern: '/admin/enrollments/:id', crumbs: [{ label: 'Enrollments', href: '/admin/enrollments' }, { label: 'Enrollment Detail' }] },
  { pattern: '/admin/enrollments', crumbs: [{ label: 'Enrollments' }] },
  { pattern: '/admin/calendar', crumbs: [{ label: 'Calendar' }] },
  { pattern: '/admin/payments/:id', crumbs: [{ label: 'Payments', href: '/admin/payments' }, { label: 'Payment Detail' }] },
  { pattern: '/admin/payments', crumbs: [{ label: 'Payments' }] },
  { pattern: '/admin/communications/templates', crumbs: [{ label: 'Communications' }, { label: 'Templates' }] },
  { pattern: '/admin/communications/automations', crumbs: [{ label: 'Communications' }, { label: 'Automations' }] },
  { pattern: '/admin/communications/log', crumbs: [{ label: 'Communications' }, { label: 'Log' }] },
  { pattern: '/admin/settings/staff', crumbs: [{ label: 'Settings' }, { label: 'Staff & Roles' }] },
  { pattern: '/admin/settings', crumbs: [{ label: 'Settings' }, { label: 'General' }] },
];

function matchRoute(pathname: string): BreadcrumbMapping | undefined {
  return BREADCRUMB_MAP.find(({ pattern }) => {
    const regex = new RegExp('^' + pattern.replace(/:[\w]+/g, '[^/]+') + '$');
    return regex.test(pathname);
  });
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const match = matchRoute(pathname);

  if (!match) return null;

  return (
    <Flex align="center" gap={1} fontSize="sm" color="gray.500" mb={4}>
      {match.crumbs.map((crumb, i) => (
        <Flex key={i} align="center" gap={1}>
          {i > 0 && <ChevronRight size={14} />}
          {crumb.href ? (
            <Link href={crumb.href} style={{ color: 'inherit', textDecoration: 'none' }}>
              <Text _hover={{ color: 'blue.600' }}>{crumb.label}</Text>
            </Link>
          ) : (
            <Text color="gray.700" fontWeight="500">{crumb.label}</Text>
          )}
        </Flex>
      ))}
    </Flex>
  );
}
```

**Step 2: Commit**

```bash
git add src/client/components/admin/Breadcrumbs.tsx
git commit -m "feat(fe): add breadcrumbs component"
```

---

## Task 9: Create Admin Layout

**Files:**
- Create: `src/client/components/admin/AdminLayout.tsx`
- Create: `src/client/components/admin/index.ts`

**Step 1: Build admin layout shell**

Combines sidebar + header + breadcrumbs + main content. Wrapped with AdminGuard.

```typescript
'use client';

/**
 * @purpose Admin layout shell with sidebar, header, breadcrumbs, and content area
 * @inputs children: ReactNode
 * @outputs Full admin layout with responsive sidebar
 * @sideEffects Stores sidebar collapsed state in localStorage
 * @cleanup None
 */

import { Box } from '@chakra-ui/react';
import { useState, useEffect, type ReactNode } from 'react';

import { AdminGuard } from '@/client/components/auth/AdminGuard';

import { Breadcrumbs } from './Breadcrumbs';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const HEADER_HEIGHT = 56;

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <AdminGuard>
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <Header sidebarWidth={sidebarWidth} />
      <Box
        ml={`${sidebarWidth}px`}
        mt={`${HEADER_HEIGHT}px`}
        p={6}
        minH={`calc(100vh - ${HEADER_HEIGHT}px)`}
        transition="margin-left 0.2s"
      >
        <Breadcrumbs />
        {children}
      </Box>
    </AdminGuard>
  );
}
```

**Step 2: Create index.ts barrel**

```typescript
export { AdminLayout } from './AdminLayout';
export { Sidebar } from './Sidebar';
export { Header } from './Header';
export { Breadcrumbs } from './Breadcrumbs';
```

**Step 3: Commit**

```bash
git add src/client/components/admin/
git commit -m "feat(fe): add admin layout shell with sidebar, header, and breadcrumbs"
```

---

## Task 10: Create Auth & Public Layouts

**Files:**
- Create: `src/client/components/layouts/AuthLayout.tsx`
- Create: `src/client/components/layouts/PublicLayout.tsx`
- Create: `src/client/components/layouts/index.ts`

**Step 1: Auth layout (centered form container)**

```typescript
'use client';

/**
 * @purpose Centered layout for auth pages (login, forgot-password, reset-password)
 * @inputs children: ReactNode
 * @outputs Minimal centered layout with no sidebar/header
 */

import { Box, Flex } from '@chakra-ui/react';
import type { ReactNode } from 'react';

import { AuthRedirect } from '@/client/components/auth/AuthRedirect';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthRedirect>
      <Flex minH="100vh" align="center" justify="center" bg="gray.50">
        <Box w="100%" maxW="400px" p={8} bg="white" borderRadius="lg" boxShadow="md">
          {children}
        </Box>
      </Flex>
    </AuthRedirect>
  );
}
```

**Step 2: Public layout (minimal header + content)**

```typescript
'use client';

/**
 * @purpose Public layout for parent-facing pages (programs, booking, enrollment)
 * @inputs children: ReactNode
 * @outputs Minimal layout with logo header and content area
 */

import { Box, Flex, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <Box minH="100vh">
      {/* Public Header */}
      <Flex
        as="header"
        align="center"
        h="56px"
        px={6}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <Link href="/programs" style={{ textDecoration: 'none' }}>
          <Text fontWeight="bold" fontSize="lg" color="blue.600">Programs</Text>
        </Link>
      </Flex>

      {/* Content */}
      <Box maxW="960px" mx="auto" px={4} py={8}>
        {children}
      </Box>
    </Box>
  );
}
```

**Step 3: Create index.ts**

```typescript
export { AuthLayout } from './AuthLayout';
export { PublicLayout } from './PublicLayout';
```

**Step 4: Commit**

```bash
git add src/client/components/layouts/
git commit -m "feat(fe): add auth and public layout shells"
```

---

## Task 11: Setup Route Structure with Next.js Route Groups

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/forgot-password/page.tsx`
- Create: `src/app/admin/reset-password/[token]/page.tsx`
- Create: `src/app/programs/page.tsx`
- Create: `src/app/programs/[programId]/book-trial/page.tsx`
- Create: `src/app/programs/[programId]/enroll/page.tsx`
- Create: `src/app/programs/[programId]/trial-dates/page.tsx`
- Create: `src/app/enrollment/[enrollmentId]/confirmation/page.tsx`
- Create: `src/app/enrollment/[enrollmentId]/pay/page.tsx`
- Create placeholder pages for all other admin routes
- Modify: `src/app/page.tsx` (redirect to /programs)
- Modify: `src/app/layout.tsx` (add spin animation)

### Step 1: Admin layout (applies AdminLayout to all /admin/* except login/auth pages)

`src/app/admin/layout.tsx`:
```typescript
import type { ReactNode } from 'react';

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

We need auth pages under `/admin/` but WITHOUT the admin sidebar. Non-auth admin pages SHOULD have the sidebar. Strategy:
- Auth pages (`/admin/login`, `/admin/forgot-password`, `/admin/reset-password/[token]`) use AuthLayout directly in their page.
- All other admin pages use a route group `(dashboard)` with AdminLayout.

Create: `src/app/admin/(dashboard)/layout.tsx`:
```typescript
import { AdminLayout } from '@/client/components/admin';
import type { ReactNode } from 'react';

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
```

### Step 2: Create admin auth pages (no sidebar)

`src/app/admin/login/page.tsx`:
```typescript
'use client';

import { AuthLayout } from '@/client/components/layouts';

export default function LoginPage() {
  return (
    <AuthLayout>
      <h2>Admin Login</h2>
      <p>Login form will be implemented in auth_accounts module.</p>
    </AuthLayout>
  );
}
```

`src/app/admin/forgot-password/page.tsx`:
```typescript
'use client';

import { AuthLayout } from '@/client/components/layouts';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <h2>Forgot Password</h2>
      <p>Password reset form will be implemented in auth_accounts module.</p>
    </AuthLayout>
  );
}
```

`src/app/admin/reset-password/[token]/page.tsx`:
```typescript
'use client';

import { AuthLayout } from '@/client/components/layouts';

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <h2>Reset Password</h2>
      <p>Password reset form will be implemented in auth_accounts module.</p>
    </AuthLayout>
  );
}
```

### Step 3: Create admin dashboard pages (with sidebar)

`src/app/admin/(dashboard)/dashboard/page.tsx`:
```typescript
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Dashboard will be implemented in admin_dashboard module.</p>
    </div>
  );
}
```

Create similar stubs for all admin pages under `(dashboard)`:

- `src/app/admin/(dashboard)/leads/page.tsx` — Lead List
- `src/app/admin/(dashboard)/leads/[leadId]/page.tsx` — Lead Detail
- `src/app/admin/(dashboard)/programs/page.tsx` — Program List
- `src/app/admin/(dashboard)/programs/[programId]/page.tsx` — Program Setup
- `src/app/admin/(dashboard)/programs/coupons/page.tsx` — Coupon Management
- `src/app/admin/(dashboard)/enrollments/page.tsx` — Enrollment List
- `src/app/admin/(dashboard)/enrollments/[enrollmentId]/page.tsx` — Enrollment Detail
- `src/app/admin/(dashboard)/calendar/page.tsx` — Calendar Management
- `src/app/admin/(dashboard)/payments/page.tsx` — Payment Dashboard
- `src/app/admin/(dashboard)/payments/[paymentId]/page.tsx` — Payment Detail
- `src/app/admin/(dashboard)/communications/templates/page.tsx` — Template Manager
- `src/app/admin/(dashboard)/communications/automations/page.tsx` — Automation Rules
- `src/app/admin/(dashboard)/communications/log/page.tsx` — Communications Log
- `src/app/admin/(dashboard)/settings/page.tsx` — General Settings
- `src/app/admin/(dashboard)/settings/staff/page.tsx` — Staff & Roles (Phase 2 stub)

Each stub follows same pattern:
```typescript
export default function XxxPage() {
  return (
    <div>
      <h1>[Page Title]</h1>
      <p>[Description] will be implemented in [module] module.</p>
    </div>
  );
}
```

### Step 4: Create public pages

`src/app/programs/layout.tsx`:
```typescript
import { PublicLayout } from '@/client/components/layouts';
import type { ReactNode } from 'react';

export default function ProgramsLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
```

Create stubs:
- `src/app/programs/page.tsx` — Program Discovery
- `src/app/programs/[programId]/book-trial/page.tsx` — Trial Booking
- `src/app/programs/[programId]/enroll/page.tsx` — Enrollment Form
- `src/app/programs/[programId]/trial-dates/page.tsx` — Trial Date Selection

`src/app/enrollment/layout.tsx`:
```typescript
import { PublicLayout } from '@/client/components/layouts';
import type { ReactNode } from 'react';

export default function EnrollmentLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
```

Create stubs:
- `src/app/enrollment/[enrollmentId]/confirmation/page.tsx` — Enrollment Confirmation
- `src/app/enrollment/[enrollmentId]/pay/page.tsx` — Zelle Payment Instructions

### Step 5: Update root page redirect

`src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/programs');
}
```

### Step 6: Add spin keyframe to globals.css

Append to `src/app/globals.css`:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Step 7: Commit

```bash
git add src/app/
git commit -m "feat(fe): setup route structure with admin, public, and auth layouts"
```

---

## Task 12: Remove Legacy FE Files

**Files:**
- Delete: `src/app/(auth)/` directory (login, register pages)
- Delete: `src/app/(protected)/` directory (dashboard page)
- Delete: `src/app/unauthorized/page.tsx`
- Delete: `src/client/lib/permission-service.ts`
- Delete: `src/client/hooks/use-permissions.ts`
- Delete: `src/lib/permissions/` directory (matcher, resolver, route-matcher, types)
- Delete: `src/config/route-permissions.ts`
- Delete: `src/client/components/auth/RouteGuard.tsx`
- Delete: `src/client/components/auth/PermissionGate.tsx`
- Delete: `src/client/components/auth/RoleGate.tsx`

**Step 1: Remove legacy files**

```bash
rm -rf src/app/\(auth\)/
rm -rf src/app/\(protected\)/
rm -f src/app/unauthorized/page.tsx
rm -f src/client/lib/permission-service.ts
rm -f src/client/hooks/use-permissions.ts
rm -rf src/lib/permissions/
rm -f src/config/route-permissions.ts
rm -f src/client/components/auth/RouteGuard.tsx
rm -f src/client/components/auth/PermissionGate.tsx
rm -f src/client/components/auth/RoleGate.tsx
```

**Step 2: Clean up barrel exports**

Update `src/client/components/auth/index.ts`:
```typescript
export { AdminGuard } from './AdminGuard';
export { AuthRedirect } from './AuthRedirect';
```

Update `src/client/hooks/index.ts`:
```typescript
// Legacy permission hooks removed — admin-only app uses session auth via useAuth()
// Module-specific hooks will be added during module FE implementation
```

Update `src/client/lib/index.ts`:
```typescript
export { AuthProvider, useAuth } from './auth-context';
```

Update `src/client/components/index.ts`:
```typescript
export * from './ui';
export * from './auth';
export * from './admin';
export * from './layouts';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(fe): remove legacy RBAC permission system and old route structure"
```

---

## Task 13: Testing & Verification

**Step 1: TypeScript compilation check**

Run: `npx tsc --noEmit`

Resolve any errors in new FE code. Known legacy BE errors (29 from RF-003) are expected and should be ignored for this phase.

**Step 2: ESLint check**

Run: `npx eslint src/client/ src/app/ --ext .ts,.tsx`

Fix any lint errors.

**Step 3: Build check**

Run: `npm run build`

Verify Next.js builds without errors for the new route structure.

**Step 4: Manual smoke verification checklist**

- [ ] Admin routes (dashboard, leads, programs, etc.) all render with sidebar + header
- [ ] Auth routes (login, forgot-password) render centered without sidebar
- [ ] Public routes (programs) render with minimal header
- [ ] Root `/` redirects to `/programs`
- [ ] Unauthenticated access to `/admin/dashboard` redirects to `/admin/login`
- [ ] Sidebar navigation links work and highlight active route
- [ ] Sidebar collapses and expands
- [ ] Breadcrumbs show correct path
- [ ] Screen state components render (can test by temporarily placing them in a page)

**Step 5: Record testing results**

Document pass/fail for each check.

**Step 6: Commit test fixes if any**

```bash
git add -A
git commit -m "fix(fe): resolve type and build issues in global FE foundation"
```

---

## Task 14: Update Status JSON & Commit/Push

**Step 1: Update implementation_status.json**

Set:
- `current.activeAgent = "fe"`
- `current.activeModule = "global"`
- `current.phase = "global_foundation"`
- `globalPhases.fe.status = "completed"` (or `"blocked"` if issues)
- `globalPhases.fe.startedAt` = current timestamp
- `globalPhases.fe.completedAt` = current timestamp
- `globalPhases.fe.testing.status = "passed"` (or result)
- `globalPhases.fe.testing.results` = array of test results
- `globalPhases.fe.git` = branch, parentBranch, delivery info
- `globalPhases.fe.notes` = summary of what was built
- Append history entry
- Update resumeHints

**Step 2: Stage, commit, and request push approval**

```bash
git add implementation_output/implementation_status.json
git add -A  # any remaining files
git commit -m "feat(fe-agent): global | parent=main | status=completed | tests=passed

Scope: global
Branch: impl/global/fe
Parent-Branch: main
Changes: Global FE foundation — admin layout (sidebar+header+breadcrumbs), auth layout, public layout, auth guard, screen states, API client adaptation, route structure (26 routes), legacy cleanup
UX States: loading/empty/error/no-permission components created
Testing: tsc --noEmit + eslint + next build = passed
Risks: none"
```

Request user approval before push.

---

## Dependency Note

After this global FE foundation is complete, module FE implementation follows the build sequence:
1. settings
2. auth_accounts
3. communication
4. enrollment_trial
5. program_pricing
6. calendar_scheduling
7. admin_dashboard
8. lead_management
9. payment_tracking

Each module replaces its stub page with full implementation.
