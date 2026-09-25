import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SiteNavigationControls } from '@/components/site-navigation-controls';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CV Tutorial 03 — Edges, Interest Points, Fitting & Registration',
  description: 'Interactive Computer Vision Tutorial 03 lab for edges, interest points, fitting, and registration.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<SiteNavigationControls /></body></html>;
}
