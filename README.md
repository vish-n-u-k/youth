# Next.js Starter with Configurable Security

A production-ready Next.js starter with **built-in authentication, RBAC, and configurable security features**.

## Features

### Authentication & Authorization
- **JWT Authentication**: Register, login, logout with secure sessions
- **Role-Based Access Control**: Roles with permission arrays
- **Permission System**: Fine-grained permissions with wildcard support
- **Route Protection**: Backend middleware + frontend route guards
- **UI Gates**: `<PermissionGate>` and `<RoleGate>` components

### Configurable Security (opt-in)
- **Rate Limiting**: Prevent brute force attacks
- **Account Lockout**: Lock accounts after failed attempts
- **Password Rules**: Configurable complexity requirements
- **Audit Logging**: Track security events to database or console
- **Session Management**: Concurrent session limits, invalidation on password change

All security features are **disabled by default** and can be enabled via `src/config/security.ts`.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
JWT_SECRET="your-secret-key-min-32-chars-long"
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

### 3. Setup Database

```bash
npm run setup:quick
```

This runs: `npm install` → `db:generate` → `db:push` → `db:seed`

### 4. Start Development

```bash
npm run dev
```

Visit http://localhost:3000

---

## Security Configuration

All security features are configured in `src/config/security.ts`:

```typescript
export const security = {
  // Rate Limiting - prevent brute force attacks
  rateLimit: {
    enabled: false,
    login: { maxAttempts: 5, windowMs: 60_000 },
    api: { maxAttempts: 100, windowMs: 60_000 },
  },

  // Account Lockout - lock after failed attempts
  lockout: {
    enabled: false,
    maxFailedAttempts: 5,
    lockoutDurationMs: 15 * 60_000,  // 15 minutes
    showRemainingAttempts: true,
  },

  // Password Rules - complexity requirements
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSymbols: false,
  },

  // Session Security
  session: {
    invalidateOnPasswordChange: false,
    maxConcurrentSessions: null,  // null = unlimited
  },

  // Audit Logging - track security events
  audit: {
    enabled: false,
    storage: 'database',  // or 'console'
    events: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER', ...],
    retentionDays: 90,
  },
};
```

### Enabling Features

Edit `src/config/security.ts` and set `enabled: true` for the features you want:

```typescript
rateLimit: {
  enabled: true,  // ← Enable rate limiting
  // ...
},
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/                # Auth endpoints
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── me/route.ts
│   │   │   └── permissions/route.ts
│   │   ├── roles/route.ts       # Role management
│   │   └── health/route.ts
│   ├── (auth)/                  # Public auth pages
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (protected)/             # Protected pages
│   │   └── dashboard/page.tsx
│   └── unauthorized/page.tsx
│
├── config/
│   ├── security.ts              # ← SECURITY SETTINGS
│   ├── route-permissions.ts     # ← ROUTE PERMISSIONS
│   └── env.ts
│
├── lib/
│   └── permissions/             # Permission system core
│       ├── types.ts
│       ├── matcher.ts
│       ├── resolver.ts
│       └── route-matcher.ts
│
├── server/
│   ├── auth/                    # Auth middleware, JWT, passwords
│   │   ├── middleware.ts
│   │   ├── jwt.ts
│   │   └── password.ts
│   ├── security/                # Security modules
│   │   ├── rate-limit.ts
│   │   ├── lockout.ts
│   │   ├── password-rules.ts
│   │   └── audit.ts
│   ├── db/
│   └── services/
│
└── client/
    ├── components/auth/         # Auth UI components
    │   ├── PermissionGate.tsx
    │   ├── RoleGate.tsx
    │   └── RouteGuard.tsx
    ├── hooks/
    │   └── use-permissions.ts
    └── lib/
        ├── auth-context.tsx
        └── permission-service.ts
```

---

## Usage Guide

### 1. Protecting API Routes

Use the `withAuth` middleware:

```typescript
// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/server/auth';

async function handler(request: AuthenticatedRequest) {
  const { auth } = request;
  // auth: { userId, email, roles, permissions, organizationId }

  return NextResponse.json({ data: 'protected' });
}

export const GET = withAuth(handler);
```

### 2. Registering Route Permissions

Edit `src/config/route-permissions.ts`:

```typescript
export const ROUTE_PERMISSIONS: RoutePermissionEntry[] = [
  // Public
  { method: 'GET', path: '/api/health', permission: null },

  // Any logged-in user
  { method: 'GET', path: '/api/profile', permission: 'authenticated' },

  // Specific permission
  { method: 'GET', path: '/api/projects', permission: 'projects:read:all' },

  // ANY of these permissions
  { method: 'GET', path: '/api/users', permission: { any: ['users:read:all', 'admin:access:all'] } },

  // ALL of these permissions
  { method: 'DELETE', path: '/api/admin/purge', permission: { all: ['admin:access:all', 'system:admin:all'] } },
];
```

### 3. Protecting Pages

Use `RouteGuard`:

```tsx
import { RouteGuard } from '@/client/components/auth';

export default function AdminPage() {
  return (
    <RouteGuard permission="admin:access:all">
      <AdminDashboard />
    </RouteGuard>
  );
}

// Or role-based:
export default function SettingsPage() {
  return (
    <RouteGuard role="Admin">
      <Settings />
    </RouteGuard>
  );
}
```

### 4. Conditional UI Rendering

**Permission-based:**

```tsx
import { PermissionGate } from '@/client/components/auth';

<PermissionGate require="projects:create:all">
  <button>Create Project</button>
</PermissionGate>

<PermissionGate
  requireAny={['billing:read:all', 'admin:access:all']}
  fallback={<p>No access</p>}
>
  <BillingPanel />
</PermissionGate>
```

**Role-based:**

```tsx
import { RoleGate } from '@/client/components/auth';

<RoleGate require="Admin">
  <AdminPanel />
</RoleGate>

<RoleGate requireAny={['Admin', 'Developer']}>
  <DevTools />
</RoleGate>
```

### 5. Using Hooks

```tsx
import { useCheckPermission, useCheckRole } from '@/client/hooks';

function MyComponent() {
  const { allowed: canCreate } = useCheckPermission('projects:create:all');
  const { allowed: isAdmin } = useCheckRole('Admin');

  return (
    <div>
      {canCreate && <button>Create</button>}
      {isAdmin && <button>Admin Action</button>}
    </div>
  );
}
```

---

## Permission Format

Permissions follow: `resource:action:scope`

Examples:
- `projects:read:all` - Read all projects
- `users:manage:all` - Manage all users
- `admin:access:all` - Access admin panel

### Wildcards

- `*` - Full access
- `projects:*:all` - All actions on projects
- `*:read:all` - Read access to everything

---

## Default Roles (after seed)

| Role | Permissions |
|------|-------------|
| Platform Admin | `*` (full access) |
| Admin | projects, users, settings, admin |
| Developer | projects (CRUD), users (read) |
| Viewer | projects (read), users (read) |
| User | projects (read) |

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run setup:quick` | Full setup (install, generate, push, seed) |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed roles and permissions |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database |
| `npm run lint` | ESLint validation |
| `npm run typecheck` | TypeScript validation |
| `npm run arch:validate` | Architecture validation |
| `npm run validate` | All validations + tests |

---

## Auth Flow

```
Backend:
1. Request → withAuth middleware
2. Find route in ROUTE_PERMISSIONS
3. Validate JWT token
4. Resolve permissions (roles + direct grants)
5. Check requirement → allow or 403
6. Attach auth context → handler

Frontend:
1. Login → session token stored in cookie
2. AuthProvider fetches user
3. usePermissions fetches permission JWT
4. RouteGuard/Gates use permissions for UI
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `NODE_ENV` | development / production | No |
| `NEXT_PUBLIC_API_URL` | API base URL | No |

---

## Tech Stack

- **Next.js** ^14.2 - React framework with App Router
- **Prisma** ^5.22 - Database ORM
- **Jose** ^5.2 - JWT handling
- **Zod** ^3.23 - Schema validation
- **TypeScript** ^5.5 - Type safety
- **Vitest** ^1.6 - Testing framework
- **dependency-cruiser** ^16 - Architecture enforcement

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate and set a secure `JWT_SECRET`
- [ ] Enable security features in `src/config/security.ts`
- [ ] Configure proper CORS if needed
- [ ] Set up database connection pooling
- [ ] Set up monitoring and logging
- [ ] Deploy to Vercel, Railway, or similar

---

## License

MIT
