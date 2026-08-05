
import Link from "next/link";
import Image from "next/image";
import { promises as fs } from 'fs';
import path from 'path';

async function getLogoText() {
    try {
        const configPath = path.join(process.cwd(), 'src', 'lib', 'site-config.json');
        const file = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(file);
        return config.logoText || 'Moovie';
    } catch (error) {
        console.error('Could not read site config, using default logo text:', error);
        return 'Moovie';
    }
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoText = await getLogoText();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">
            {logoText}
          </h1>
        </Link>
      </div>
      {children}
    </div>
  );
}
