'use client';

/**
 * @purpose Admin header bar with user menu dropdown (profile, settings, logout)
 * @inputs sidebarWidth: number
 * @outputs Fixed header bar positioned right of sidebar
 */

import { Box, Flex, Text } from '@chakra-ui/react';
import { User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

import { useAuth } from '@/client/lib/auth-context';

interface HeaderProps {
  sidebarWidth: number;
}

export function Header({ sidebarWidth }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) {return;}

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    void logout().then(() => {
      router.push('/admin/login');
    });
  };

  return (
    <Box
      as="header"
      position="fixed"
      top="0"
      left={`${sidebarWidth}px`}
      right="0"
      h="56px"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      zIndex="999"
      transition="left 0.2s"
    >
      <Flex align="center" justify="flex-end" h="100%" px="4">
        {/* User Menu */}
        <Box ref={menuRef} position="relative">
          <Flex
            as="button"
            align="center"
            gap="2"
            px="3"
            py="1.5"
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'gray.100' }}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Box
              w="32px"
              h="32px"
              borderRadius="full"
              bg="gray.200"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <User size={18} color="#4a5568" />
            </Box>
            {user && (
              <Text fontSize="sm" color="gray.700" display={{ base: 'none', md: 'block' }}>
                {user.name}
              </Text>
            )}
          </Flex>

          {/* Dropdown Menu */}
          {menuOpen && (
            <Box
              position="absolute"
              top="100%"
              right="0"
              mt="1"
              w="220px"
              bg="white"
              borderRadius="md"
              boxShadow="lg"
              border="1px solid"
              borderColor="gray.200"
              py="1"
              zIndex="1001"
            >
              {/* User Info */}
              {user && (
                <Box px="3" py="2" borderBottom="1px solid" borderColor="gray.100">
                  <Text fontSize="sm" fontWeight="600" color="gray.800">
                    {user.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {user.email}
                  </Text>
                </Box>
              )}

              {/* Settings Link */}
              <Link href="/admin/settings" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                <Flex
                  align="center"
                  gap="2"
                  px="3"
                  py="2"
                  cursor="pointer"
                  _hover={{ bg: 'gray.50' }}
                  color="gray.700"
                >
                  <Settings size={16} />
                  <Text fontSize="sm">Settings</Text>
                </Flex>
              </Link>

              {/* Logout */}
              <Flex
                as="button"
                align="center"
                gap="2"
                px="3"
                py="2"
                w="100%"
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                color="red.600"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <Text fontSize="sm">Logout</Text>
              </Flex>
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
