// ============================================
// DATABASE SEED SCRIPT
// ============================================
// Run: npx prisma db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ═══════════════════════════════════════════════════════
  // PERMISSION DEFINITIONS (Reference catalog)
  // ═══════════════════════════════════════════════════════
  const permissionData = [
    // Projects
    { key: 'projects:read:all', name: 'View Projects', category: 'Projects' },
    { key: 'projects:create:all', name: 'Create Projects', category: 'Projects' },
    { key: 'projects:update:all', name: 'Update Projects', category: 'Projects' },
    { key: 'projects:delete:all', name: 'Delete Projects', category: 'Projects' },

    // Users
    { key: 'users:read:all', name: 'View Users', category: 'Users' },
    { key: 'users:manage:all', name: 'Manage Users', category: 'Users' },

    // Settings
    { key: 'settings:read:all', name: 'View Settings', category: 'Settings' },
    { key: 'settings:manage:all', name: 'Manage Settings', category: 'Settings' },

    // Admin
    { key: 'admin:access:all', name: 'Admin Access', category: 'Admin' },
    { key: 'system:admin:all', name: 'System Admin', category: 'Admin' },
  ];

  for (const perm of permissionData) {
    const existing = await prisma.permission.findFirst({
      where: { key: perm.key, organizationId: null },
    });
    if (!existing) {
      await prisma.permission.create({
        data: {
          key: perm.key,
          name: perm.name,
          category: perm.category,
          organizationId: null,
        },
      });
    }
  }

  console.log('Created permissions');

  // ═══════════════════════════════════════════════════════
  // GLOBAL ROLES (apply across all organizations)
  // ═══════════════════════════════════════════════════════
  const globalRoles = [
    {
      name: 'Platform Admin',
      description: 'Full platform access across all organizations',
      permissions: ['*'],
      isSystem: true,
    },
    {
      name: 'Platform Support',
      description: 'Read-only access for customer support',
      permissions: ['projects:read:all', 'users:read:all', 'settings:read:all'],
      isSystem: true,
    },
  ];

  for (const role of globalRoles) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, organizationId: null },
    });
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          description: role.description,
          permissions: role.permissions,
        },
      });
    } else {
      await prisma.role.create({
        data: {
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          organizationId: null,
          isSystem: role.isSystem,
        },
      });
    }
  }

  console.log('Created global roles');

  // ═══════════════════════════════════════════════════════
  // DEFAULT ORG ROLES (templates - created per organization)
  // These are "template" roles with null organizationId
  // In a real app, copy these when creating a new organization
  // ═══════════════════════════════════════════════════════
  const defaultOrgRoles = [
    {
      name: 'Admin',
      description: 'Organization administrator',
      permissions: [
        'projects:read:all',
        'projects:create:all',
        'projects:update:all',
        'projects:delete:all',
        'users:read:all',
        'users:manage:all',
        'settings:read:all',
        'settings:manage:all',
        'admin:access:all',
      ],
      isSystem: true,
    },
    {
      name: 'Developer',
      description: 'Development team member',
      permissions: [
        'projects:read:all',
        'projects:create:all',
        'projects:update:all',
        'users:read:all',
      ],
      isSystem: true,
    },
    {
      name: 'Viewer',
      description: 'Read-only access',
      permissions: ['projects:read:all', 'users:read:all'],
      isSystem: true,
    },
    {
      name: 'User',
      description: 'Default role for new users',
      permissions: ['projects:read:all'],
      isSystem: true,
    },
  ];

  for (const role of defaultOrgRoles) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, organizationId: null },
    });
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          description: role.description,
          permissions: role.permissions,
        },
      });
    } else {
      await prisma.role.create({
        data: {
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          organizationId: null,
          isSystem: role.isSystem,
        },
      });
    }
  }

  console.log('Created default org role templates');

  console.log('Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
