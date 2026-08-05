
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppHeader } from '@/components/header';
import { SidebarNav } from '@/components/sidebar-nav';
import { UserNav } from '@/components/user-nav';
import { Separator } from './ui/separator';
import Image from 'next/image';
import Link from 'next/link';
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


export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const logoText = await getLogoText();

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r border-border/50">
        <SidebarHeader>
          <div className="flex items-center justify-center p-2 h-[64px]">
             <Link href="/">
                <div className="flex items-center justify-center h-full">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
                        {logoText}
                    </h1>
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent hidden group-data-[collapsible=icon]:block">
                        {logoText.charAt(0)}
                    </h1>
                </div>
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
            <UserNav />
            <Separator className="my-1" />
            <div className="p-2 hidden md:flex justify-end">
              <SidebarTrigger />
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

