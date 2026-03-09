'use client';

/**
 * @purpose Main admin layout shell combining Sidebar, Header, Breadcrumbs, and AdminGuard
 * @inputs children: ReactNode
 * @outputs Full admin layout with auth protection, collapsible sidebar, header, and breadcrumbs
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
const STORAGE_KEY = 'sidebar_collapsed';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Read initial collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setCollapsed(true);
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, etc.)
    }
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <AdminGuard>
      <Box minH="100vh" bg="gray.50">
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
        <Header sidebarWidth={sidebarWidth} />

        {/* Main Content Area */}
        <Box
          ml={`${sidebarWidth}px`}
          mt={`${HEADER_HEIGHT}px`}
          transition="margin-left 0.2s"
          minH={`calc(100vh - ${HEADER_HEIGHT}px)`}
        >
          <Box px="6" py="4" maxW="1400px" mx="auto">
            <Breadcrumbs />
            <Box>{children}</Box>
          </Box>
        </Box>
      </Box>
    </AdminGuard>
  );
}
