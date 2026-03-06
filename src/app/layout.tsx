import { Providers } from './providers';

import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Next.js Starter with Security',
  description:
    'A full-stack Next.js starter template with TypeScript, Prisma, and built-in RBAC security',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
