import { Suspense } from 'react';
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
import TopLoadingBar from '@/components/top-loading-bar';

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
    description: 'Download and stream free HD Movies, Web Series, Dual Audio Hindi Dubbed Movies in 480p, 720p & 1080p with fast direct links.',
    keywords: ['movies', 'download movies', 'hindi dubbed', 'dual audio', '720p movies', '1080p web series', 'free streaming', 'watch online'],
    openGraph: {
      title: SITE_TITLE,
      description: 'Download and stream free HD Movies, Web Series, Dual Audio Hindi Dubbed Movies in 480p, 720p & 1080p with fast direct links.',
      type: 'website',
      siteName: 'Moovie',
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_TITLE,
      description: 'Download and stream free HD Movies, Web Series, Dual Audio Hindi Dubbed Movies in 480p, 720p & 1080p with fast direct links.',
    },
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
            <Suspense fallback={null}>
              <TopLoadingBar />
            </Suspense>
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
