'use client';

/**
 * @purpose Dynamic breadcrumb navigation based on current pathname
 * @inputs None (reads pathname from Next.js router)
 * @outputs Breadcrumb trail with links for all crumbs except the last
 */

import { Flex, Text } from '@chakra-ui/react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbMapping {
  pattern: RegExp;
  crumbs: { label: string; href?: string }[];
}

/**
 * Breadcrumb mappings ordered from most specific to least specific.
 * For items with multiple crumbs, all but the last have an href (are links).
 */
const BREADCRUMB_MAPPINGS: BreadcrumbMapping[] = [
  // Programs
  {
    pattern: /^\/admin\/programs\/coupons$/,
    crumbs: [
      { label: 'Programs', href: '/admin/programs' },
      { label: 'Coupons' },
    ],
  },
  {
    pattern: /^\/admin\/programs\/[^/]+$/,
    crumbs: [
      { label: 'Programs', href: '/admin/programs' },
      { label: 'Program Setup' },
    ],
  },
  {
    pattern: /^\/admin\/programs$/,
    crumbs: [{ label: 'Programs' }],
  },

  // Leads
  {
    pattern: /^\/admin\/leads\/[^/]+$/,
    crumbs: [
      { label: 'Leads', href: '/admin/leads' },
      { label: 'Lead Detail' },
    ],
  },
  {
    pattern: /^\/admin\/leads$/,
    crumbs: [{ label: 'Leads' }],
  },

  // Enrollments
  {
    pattern: /^\/admin\/enrollments\/[^/]+$/,
    crumbs: [
      { label: 'Enrollments', href: '/admin/enrollments' },
      { label: 'Enrollment Detail' },
    ],
  },
  {
    pattern: /^\/admin\/enrollments$/,
    crumbs: [{ label: 'Enrollments' }],
  },

  // Payments
  {
    pattern: /^\/admin\/payments\/[^/]+$/,
    crumbs: [
      { label: 'Payments', href: '/admin/payments' },
      { label: 'Payment Detail' },
    ],
  },
  {
    pattern: /^\/admin\/payments$/,
    crumbs: [{ label: 'Payments' }],
  },

  // Communications
  {
    pattern: /^\/admin\/communications\/templates$/,
    crumbs: [
      { label: 'Communications' },
      { label: 'Templates' },
    ],
  },
  {
    pattern: /^\/admin\/communications\/automations$/,
    crumbs: [
      { label: 'Communications' },
      { label: 'Automations' },
    ],
  },
  {
    pattern: /^\/admin\/communications\/log$/,
    crumbs: [
      { label: 'Communications' },
      { label: 'Log' },
    ],
  },

  // Settings
  {
    pattern: /^\/admin\/settings\/staff$/,
    crumbs: [
      { label: 'Settings' },
      { label: 'Staff & Roles' },
    ],
  },
  {
    pattern: /^\/admin\/settings$/,
    crumbs: [
      { label: 'Settings' },
      { label: 'General' },
    ],
  },

  // Calendar
  {
    pattern: /^\/admin\/calendar$/,
    crumbs: [{ label: 'Calendar' }],
  },

  // Dashboard
  {
    pattern: /^\/admin\/dashboard$/,
    crumbs: [{ label: 'Dashboard' }],
  },
];

function resolveBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  for (const mapping of BREADCRUMB_MAPPINGS) {
    if (mapping.pattern.test(pathname)) {
      return mapping.crumbs;
    }
  }
  // Fallback: no breadcrumbs
  return [];
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = resolveBreadcrumbs(pathname);

  if (crumbs.length === 0) {return null;}

  return (
    <Flex align="center" gap="1" py="2">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <Flex key={`${crumb.label}-${index}`} align="center" gap="1">
            {index > 0 && <ChevronRight size={14} color="#a0aec0" />}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} style={{ textDecoration: 'none' }}>
                <Text
                  fontSize="sm"
                  color="blue.500"
                  _hover={{ textDecoration: 'underline' }}
                >
                  {crumb.label}
                </Text>
              </Link>
            ) : (
              <Text
                fontSize="sm"
                color={isLast ? 'gray.800' : 'gray.500'}
                fontWeight={isLast ? '600' : '400'}
              >
                {crumb.label}
              </Text>
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}
