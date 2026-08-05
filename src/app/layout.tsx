import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import MainLayout from '@/components/main-layout';
import { ThemeProvider } from '@/providers/theme-provider';
import { ScrollToTop } from '@/components/scroll-to-top';
import { getSiteConfigFromFirestore, getAdSettings } from '@/lib/firestore';

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
      <head>
        {/* Inject Global Header Scripts */}
        {settings.headerScripts && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  var tempDiv = document.createElement('div');
                  tempDiv.innerHTML = \`${settings.headerScripts.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`;
                  Array.from(tempDiv.childNodes).forEach(node => {
                    if (node.tagName === 'SCRIPT') {
                      var script = document.createElement('script');
                      Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
                      script.appendChild(document.createTextNode(node.innerHTML));
                      document.head.appendChild(script);
                    } else if (node.nodeType === 1) {
                        // Append other elements like meta, link, etc.
                        document.head.appendChild(node.cloneNode(true));
                    }
                  });
                } catch(e) {}
              `
            }}
          />
        )}
        {/*
           Directly injecting raw HTML string into head in Next.js App Router is tricky.
           We'll use a hidden div for meta tags if possible, or assume user puts scripts.
           If we put raw HTML in head tag:
        */}
        {settings.headerScripts && (
          <div dangerouslySetInnerHTML={{ __html: settings.headerScripts }} style={{ display: 'none' }} />
        )}
      </head>
      <body className={`${inter.variable} font-body antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <MainLayout>{children}</MainLayout>
            <Toaster />
            <ScrollToTop />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
