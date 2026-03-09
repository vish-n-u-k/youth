import { PublicLayout } from '@/client/components/layouts';

import type { ReactNode } from 'react';


export default function ProgramsLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
