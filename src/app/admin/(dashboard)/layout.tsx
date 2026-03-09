import { AdminLayout } from '@/client/components/admin';

import type { ReactNode } from 'react';


export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
