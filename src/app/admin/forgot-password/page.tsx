'use client';
import { AuthLayout } from '@/client/components/layouts';
export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Forgot Password</h2>
      <p style={{ color: '#718096' }}>Password reset request form will be implemented in auth_accounts module.</p>
    </AuthLayout>
  );
}
