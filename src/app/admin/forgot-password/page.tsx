'use client';

import { Box, Button, Flex, Heading, Input, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { api, ApiError } from '@/client/api/client';
import { AuthLayout } from '@/client/components/layouts';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void doSubmit();
  }

  async function doSubmit() {
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
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
        Forgot Password
      </Heading>

      {submitted ? (
        <Flex direction="column" gap="4">
          <Text fontSize="sm" color="green.600" textAlign="center">
            If an account exists with that email, you&apos;ll receive a reset link.
          </Text>
          <Text textAlign="center" fontSize="sm">
            <Link href="/admin/login" style={{ color: '#3182ce' }}>
              Back to Login
            </Link>
          </Text>
        </Flex>
      ) : (
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
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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
