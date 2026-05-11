import type { Metadata } from 'next';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '../components/service-worker-register';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans'
});

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-display'
});

export const metadata: Metadata = {
  title: 'PulsePOS',
  description: 'Multi-tenant POS SaaS with inventory, reports, and Lipana payments'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} bg-bg text-text antialiased`}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
