'use client';

/**
 * @purpose Protects admin routes by checking session authentication
 * @inputs children: ReactNode
 * @outputs Renders children if authenticated, redirects to /admin/login if not
 * @sideEffects Triggers redirect via Next.js router on auth failure
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
        <div style={{
          width: 32, height: 32,
          border: '3px solid #e5e5e5',
          borderTopColor: '#0070f3',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
