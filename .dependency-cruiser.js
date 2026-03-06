/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    // ============================================
    // LAYER BOUNDARY RULES
    // ============================================
    {
      name: 'no-client-importing-server',
      comment: 'Client code cannot import server code (DB, services, server internals)',
      severity: 'error',
      from: { path: '^src/client' },
      to: { path: '^src/server' },
    },
    {
      name: 'no-server-importing-client',
      comment: 'Server code should not depend on client code',
      severity: 'error',
      from: { path: '^src/server' },
      to: { path: '^src/client' },
    },
    {
      name: 'schemas-must-be-pure',
      comment: 'Schemas should not import from client, server, or app (they are shared)',
      severity: 'error',
      from: { path: '^src/schemas' },
      to: { path: '^src/(client|server|app)' },
    },
    {
      name: 'shared-must-be-pure',
      comment: 'Shared utilities should not import from client, server, or app',
      severity: 'error',
      from: { path: '^src/shared' },
      to: { path: '^src/(client|server|app)' },
    },

    // ============================================
    // SERVER LAYER RULES
    // ============================================
    {
      name: 'services-dont-import-api-routes',
      comment: 'Services should not know about API routes',
      severity: 'error',
      from: { path: '^src/server/services' },
      to: { path: '^src/app/api' },
    },
    {
      name: 'db-layer-is-isolated',
      comment: 'DB layer should not import from other server layers',
      severity: 'error',
      from: { path: '^src/server/db' },
      to: { path: '^src/server/(services|errors)' },
    },

    // ============================================
    // CLIENT LAYER RULES
    // ============================================
    {
      name: 'client-components-dont-import-api-routes',
      comment: 'Client components should not import API route handlers directly',
      severity: 'error',
      from: { path: '^src/client/components' },
      to: { path: '^src/app/api' },
    },
    {
      name: 'client-hooks-dont-import-api-routes',
      comment: 'Client hooks should not import API route handlers directly',
      severity: 'error',
      from: { path: '^src/client/hooks' },
      to: { path: '^src/app/api' },
    },
    {
      name: 'components-dont-import-hooks-internals',
      comment: 'Components should use hooks via public API, not internals',
      severity: 'warn',
      from: { path: '^src/client/components' },
      to: { path: '^src/client/hooks/.*\\.internal\\.ts$' },
    },

    // ============================================
    // CIRCULAR DEPENDENCY RULES
    // ============================================
    {
      name: 'no-circular-dependencies',
      comment: 'Circular dependencies are forbidden',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-circular-at-module-level',
      comment: 'No circular dependencies between top-level modules',
      severity: 'error',
      from: { path: '^src/[^/]+' },
      to: {
        circular: true,
        path: '^src/[^/]+',
      },
    },

    // ============================================
    // DEPENDENCY HYGIENE
    // ============================================
    {
      name: 'no-orphan-modules',
      comment: 'Modules should be imported somewhere (except entry points)',
      severity: 'warn',
      from: { orphan: true, pathNot: [
        '\\.test\\.ts$',
        '\\.spec\\.ts$',
        'index\\.ts$',
        '^src/app/',
        'route\\.ts$',
        'page\\.tsx$',
        'layout\\.tsx$',
      ]},
      to: {},
    },
    {
      name: 'no-deprecated-modules',
      comment: 'Do not import from deprecated modules',
      severity: 'warn',
      from: {},
      to: { path: '\\.deprecated\\.' },
    },

    // ============================================
    // EXTERNAL DEPENDENCY RULES
    // ============================================
    {
      name: 'no-direct-prisma-in-client',
      comment: 'Client code should never import Prisma directly',
      severity: 'error',
      from: { path: '^src/client' },
      to: { path: '@prisma/client|prisma' },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
