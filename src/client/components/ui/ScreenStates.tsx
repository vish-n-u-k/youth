'use client';

/**
 * @purpose Standard screen state components for consistent UX across all pages
 * @inputs Various props per component (message, onRetry, icon, action)
 * @outputs Visual state indicators with appropriate actions
 */

import { Flex, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { AlertCircle, CheckCircle, FileQuestion, ShieldX } from 'lucide-react';

import type { ReactNode } from 'react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap="4">
      <Spinner size="lg" color="blue.500" />
      <Text color="gray.500">{message}</Text>
    </Flex>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title = 'No data',
  message = 'There are no items to display.',
  action,
  icon,
}: EmptyStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap="3" py="10">
      {icon ?? <FileQuestion size={48} color="#a0aec0" />}
      <Heading size="md" color="gray.600">{title}</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
      {action}
    </Flex>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap="3" py="10">
      <AlertCircle size={48} color="#e53e3e" />
      <Heading size="md" color="red.600">{title}</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
      {onRetry && (
        <Button onClick={onRetry} colorPalette="blue" size="sm" mt="2">
          Try again
        </Button>
      )}
    </Flex>
  );
}

interface SuccessStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function SuccessState({
  title = 'Success',
  message = 'The operation completed successfully.',
  action,
}: SuccessStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap="3" py="10">
      <CheckCircle size={48} color="#38a169" />
      <Heading size="md" color="green.600">{title}</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
      {action}
    </Flex>
  );
}

interface NoPermissionStateProps {
  message?: string;
}

export function NoPermissionState({
  message = 'You do not have permission to access this resource.',
}: NoPermissionStateProps) {
  return (
    <Flex direction="column" align="center" justify="center" minH="200px" gap="3" py="10">
      <ShieldX size={48} color="#e53e3e" />
      <Heading size="md" color="red.600">Access Denied</Heading>
      <Text color="gray.500" textAlign="center" maxW="400px">{message}</Text>
    </Flex>
  );
}
