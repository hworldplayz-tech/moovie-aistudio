import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import MainLayout from '@/components/main-layout';
import { ThemeProvider } from '@/providers/theme-provider';
import { ScrollToTop } from '@/components/scroll-to-top';
import { getAdSettings } from '@/lib/firestore';
import GlobalHeaderScripts from '@/components/global-header-scripts';
import SocialBarAd from '@/components/ads/social-bar-ad';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_TITLE = "Watch and Download Hindi Dubbed Movies - Series Dual Audio - 480p 720p 1080p - at Moovie | Allmovieshub One CLick Download";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  // Using hardcoded title as requested by user
  return {
    title: SITE_TITLE,
    description: 'A modern video streaming platform.',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getAdSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-body antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <MainLayout>{children}</MainLayout>
            <SocialBarAd />
            <GlobalHeaderScripts scripts={settings.headerScripts} />
            <Toaster />
            <ScrollToTop />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
