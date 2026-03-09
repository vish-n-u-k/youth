'use client';

/**
 * @purpose Collapsible admin sidebar navigation with expandable sub-items
 * @inputs collapsed: boolean, onToggle: () => void
 * @outputs Sidebar navigation component with active state highlighting
 */

import { Box, Flex, Text } from '@chakra-ui/react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  Calendar,
  CreditCard,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import type { LucideIcon } from 'lucide-react';

interface NavChild {
  label: string;
  route: string;
  phase?: number;
}

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
  children?: NavChild[];
  section: 'main' | 'system';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', route: '/admin/dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'leads', label: 'Leads', route: '/admin/leads', icon: Users, section: 'main' },
  {
    id: 'programs',
    label: 'Programs',
    route: '/admin/programs',
    icon: BookOpen,
    section: 'main',
    children: [
      { label: 'All Programs', route: '/admin/programs' },
      { label: 'Coupons', route: '/admin/programs/coupons' },
    ],
  },
  { id: 'enrollments', label: 'Enrollments', route: '/admin/enrollments', icon: ClipboardCheck, section: 'main' },
  { id: 'calendar', label: 'Calendar', route: '/admin/calendar', icon: Calendar, section: 'main' },
  { id: 'payments', label: 'Payments', route: '/admin/payments', icon: CreditCard, section: 'main' },
  {
    id: 'communications',
    label: 'Communications',
    route: '/admin/communications/templates',
    icon: Mail,
    section: 'main',
    children: [
      { label: 'Templates', route: '/admin/communications/templates' },
      { label: 'Automations', route: '/admin/communications/automations' },
      { label: 'Log', route: '/admin/communications/log' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    route: '/admin/settings',
    icon: Settings,
    section: 'system',
    children: [
      { label: 'General', route: '/admin/settings' },
      { label: 'Staff & Roles', route: '/admin/settings/staff', phase: 2 },
    ],
  },
];

function isRouteActive(pathname: string, route: string): boolean {
  if (pathname === route) {return true;}
  // For routes like /admin/programs, match /admin/programs/xyz but not /admin/programs-other
  if (pathname.startsWith(`${route  }/`)) {return true;}
  return false;
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (isRouteActive(pathname, item.route)) {return true;}
  if (item.children) {
    return item.children.some((child) => isRouteActive(pathname, child.route));
  }
  return false;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Auto-expand items whose children are active
  useEffect(() => {
    const newExpanded = new Set<string>();
    for (const item of NAV_ITEMS) {
      if (item.children && isItemActive(pathname, item)) {
        newExpanded.add(item.id);
      }
    }
    setExpandedItems((prev) => {
      // Merge: keep manually expanded, add auto-expanded
      const merged = new Set(prev);
      for (const id of newExpanded) {
        merged.add(id);
      }
      return merged;
    });
  }, [pathname]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sidebarWidth = collapsed ? 64 : 240;

  const mainItems = NAV_ITEMS.filter((item) => item.section === 'main');
  const systemItems = NAV_ITEMS.filter((item) => item.section === 'system');

  const renderNavItem = (item: NavItem) => {
    const active = isItemActive(pathname, item);
    const hasChildren = item.children && item.children.length > 0;
    const expanded = expandedItems.has(item.id);
    const Icon = item.icon;

    return (
      <Box key={item.id}>
        {hasChildren ? (
          <Flex
            as="button"
            onClick={() => toggleExpand(item.id)}
            align="center"
            gap="3"
            w="100%"
            px="3"
            py="2"
            borderRadius="md"
            cursor="pointer"
            bg={active ? 'blue.50' : 'transparent'}
            color={active ? 'blue.700' : 'gray.700'}
            _hover={{ bg: active ? 'blue.50' : 'gray.100' }}
            transition="all 0.15s"
            title={collapsed ? item.label : undefined}
          >
            <Icon size={20} />
            {!collapsed && (
              <>
                <Text flex="1" fontSize="sm" fontWeight={active ? '600' : '400'} textAlign="left">
                  {item.label}
                </Text>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </>
            )}
          </Flex>
        ) : (
          <Link href={item.route} style={{ textDecoration: 'none' }}>
            <Flex
              align="center"
              gap="3"
              px="3"
              py="2"
              borderRadius="md"
              bg={active ? 'blue.50' : 'transparent'}
              color={active ? 'blue.700' : 'gray.700'}
              _hover={{ bg: active ? 'blue.50' : 'gray.100' }}
              transition="all 0.15s"
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && (
                <Text fontSize="sm" fontWeight={active ? '600' : '400'}>
                  {item.label}
                </Text>
              )}
            </Flex>
          </Link>
        )}

        {/* Children */}
        {hasChildren && expanded && !collapsed && (
          <Box pl="8" mt="1">
            {(item.children ?? []).map((child) => {
              const childActive = pathname === child.route;
              return (
                <Link key={child.route} href={child.route} style={{ textDecoration: 'none' }}>
                  <Flex
                    align="center"
                    px="3"
                    py="1.5"
                    borderRadius="md"
                    bg={childActive ? 'blue.50' : 'transparent'}
                    color={childActive ? 'blue.700' : 'gray.600'}
                    _hover={{ bg: childActive ? 'blue.50' : 'gray.100' }}
                    transition="all 0.15s"
                  >
                    <Text fontSize="sm" fontWeight={childActive ? '600' : '400'}>
                      {child.label}
                    </Text>
                    {child.phase && child.phase > 1 && (
                      <Text fontSize="xs" color="gray.400" ml="2">
                        (Phase {child.phase})
                      </Text>
                    )}
                  </Flex>
                </Link>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      as="nav"
      position="fixed"
      left="0"
      top="0"
      h="100vh"
      w={`${sidebarWidth}px`}
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
      transition="width 0.2s"
      zIndex="1000"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      {/* Logo / Brand */}
      <Flex
        align="center"
        justify={collapsed ? 'center' : 'flex-start'}
        px={collapsed ? '0' : '4'}
        h="56px"
        borderBottom="1px solid"
        borderColor="gray.200"
        flexShrink={0}
      >
        <Link href="/admin/dashboard" style={{ textDecoration: 'none' }}>
          <Flex align="center" gap="2">
            <Box
              w="32px"
              h="32px"
              bg="blue.500"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="white" fontWeight="bold" fontSize="sm">
                A
              </Text>
            </Box>
            {!collapsed && (
              <Text fontWeight="bold" fontSize="md" color="gray.800">
                Admin
              </Text>
            )}
          </Flex>
        </Link>
      </Flex>

      {/* Nav Items */}
      <Box flex="1" overflowY="auto" py="3" px="2">
        {/* Main Section */}
        <Flex direction="column" gap="1">
          {!collapsed && (
            <Text fontSize="xs" fontWeight="600" color="gray.400" px="3" py="1" textTransform="uppercase">
              Main
            </Text>
          )}
          {mainItems.map(renderNavItem)}
        </Flex>

        {/* System Section */}
        <Box mt="4">
          <Flex direction="column" gap="1">
            {!collapsed && (
              <Text fontSize="xs" fontWeight="600" color="gray.400" px="3" py="1" textTransform="uppercase">
                System
              </Text>
            )}
            {systemItems.map(renderNavItem)}
          </Flex>
        </Box>
      </Box>

      {/* Toggle Button */}
      <Flex
        align="center"
        justify="center"
        h="48px"
        borderTop="1px solid"
        borderColor="gray.200"
        cursor="pointer"
        _hover={{ bg: 'gray.50' }}
        onClick={onToggle}
        flexShrink={0}
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </Flex>
    </Box>
  );
}
