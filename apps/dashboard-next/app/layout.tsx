import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../studio/style.css';

export const metadata: Metadata = {
  title: 'Beacon of Hope · Studio',
  description: 'Beacon of Hope editorial studio',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Hope Studio' },
};

export const viewport: Viewport = {
  themeColor: '#173e35',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
