import { PrismaClient } from '@prisma/client';

// ============================================
// PRISMA CLIENT SINGLETON
// ============================================
// Prevents multiple instances in development
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export type { PrismaClient };
