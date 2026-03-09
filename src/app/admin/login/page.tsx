'use client';
import { AuthLayout } from '@/client/components/layouts';
export default function LoginPage() {
  return (
    <AuthLayout>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Admin Login</h2>
      <p style={{ color: '#718096' }}>Login form will be implemented in auth_accounts module.</p>
    </AuthLayout>
  );
}
