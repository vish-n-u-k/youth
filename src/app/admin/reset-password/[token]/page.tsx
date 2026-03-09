'use client';

import { Box, Button, Flex, Heading, Input, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { api, ApiError } from '@/client/api/client';
import { AuthLayout } from '@/client/components/layouts';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void doSubmit();
  }

  async function doSubmit() {
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/api/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <Heading as="h2" size="lg" mb="6" textAlign="center">
        Reset Password
      </Heading>

      {success ? (
        <Flex direction="column" gap="4">
          <Text fontSize="sm" color="green.600" textAlign="center">
            Password reset successful! Redirecting to login...
          </Text>
          <Text textAlign="center" fontSize="sm">
            <Link href="/admin/login" style={{ color: '#3182ce' }}>
              Go to Login
            </Link>
          </Text>
        </Flex>
      ) : (
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Box>
              <Text mb="1" fontWeight="medium" fontSize="sm">
                New Password
              </Text>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Box>

            <Box>
              <Text mb="1" fontWeight="medium" fontSize="sm">
                Confirm Password
              </Text>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>

            <Text textAlign="center" fontSize="sm">
              <Link href="/admin/login" style={{ color: '#3182ce' }}>
                Back to Login
              </Link>
            </Text>
          </Flex>
        </form>
      )}
    </AuthLayout>
  );
}
