'use client';

/**
 * @purpose Redirects authenticated users away from auth pages to dashboard
 * @inputs children: ReactNode
 * @outputs Renders children if NOT authenticated, redirects to /admin/dashboard if authenticated
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
