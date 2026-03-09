'use client';

import { Box, Button, Flex, Heading, Input, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthLayout } from '@/client/components/layouts';
import { useAuth } from '@/client/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void doSubmit();
  }

  async function doSubmit() {
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/admin/dashboard');
      } else {
        setError(result.error ?? 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <Heading as="h2" size="lg" mb="6" textAlign="center">
        Admin Login
      </Heading>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <Box>
            <Text mb="1" fontWeight="medium" fontSize="sm">
              Email
            </Text>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Box>

          <Box>
            <Text mb="1" fontWeight="medium" fontSize="sm">
              Password
            </Text>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Box>

          {error && (
            <Text color="red.500" fontSize="sm">
              {error}
            </Text>
          )}

          <Button
            type="submit"
            colorPalette="blue"
            width="100%"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>

          <Text textAlign="center" fontSize="sm">
            <Link href="/admin/forgot-password" style={{ color: '#3182ce' }}>
              Forgot Password?
            </Link>
          </Text>
        </Flex>
      </form>
    </AuthLayout>
  );
}
