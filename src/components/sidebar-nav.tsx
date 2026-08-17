
'use client';

import { useState, useEffect } from 'react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Home, Clapperboard, Tv, Film, ShieldAlert, Mail, Globe, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getSiteLanguages } from '@/app/admin/actions';
import { DEFAULT_SITE_LANGUAGES } from '@/lib/firestore';

const navItems = [
  { href: '/', label: 'Browse All', icon: Home, type: null, genre: null, region: null },
  { href: '/live-tv', label: 'Live TV', icon: Tv, type: null, genre: null, region: null },
  { href: '/?type=movie', label: 'Movies', icon: Clapperboard, type: 'movie', genre: null, region: null },
  { href: '/?type=tv', label: 'TV Shows', icon: Tv, type: 'tv', genre: null, region: null },
  { href: '/disclaimer', label: 'Disclaimer', icon: ShieldAlert, type: null, genre: null, region: null },
  { href: 'https://www.linkshare.online/contact', label: 'Contact', icon: Mail, type: null, genre: null, region: null },
];

const categories = [
  { href: '/?genre=28', label: 'Action', genre: '28' },
  { href: '/?genre=53', label: 'Thriller', genre: '53' },
  { href: '/?genre=27', label: 'Horror', genre: '27' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  const [availableLanguages, setAvailableLanguages] = useState<string[]>(DEFAULT_SITE_LANGUAGES);

  useEffect(() => {
    getSiteLanguages().then(langs => {
      if (langs && langs.length > 0) {
        setAvailableLanguages(langs);
      }
    }).catch(err => console.error('Failed to load languages in sidebar:', err));
  }, []);

  const currentType = searchParams?.get('type');
  const currentGenre = searchParams?.get('genre');
  const currentRegion = searchParams?.get('region');
  const isHindiDubbed = searchParams?.get('hindi_dubbed') === 'true';

  const currentLanguageValue = isHindiDubbed ? 'hindi_dubbed' : currentRegion || '';

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.href === '/') {
      return pathname === '/' && !currentType && !currentGenre && !currentRegion;
    }
    return pathname === '/' && currentType === item.type;
  }

  const isCategoryActive = (item: typeof categories[0]) => {
    return pathname === '/' && currentGenre === item.genre;
  }

  const handleLanguageChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams?.toString() || '');

    if (value === '') {
      newParams.delete('region');
      newParams.delete('hindi_dubbed');
    } else if (value.toLowerCase() === 'hindi_dubbed' || value.toLowerCase() === 'hindi dubbed') {
      newParams.set('hindi_dubbed', 'true');
      newParams.delete('region');
    } else {
      newParams.set('region', value);
      newParams.delete('hindi_dubbed');
    }

    if (isMobile) {
      setOpenMobile(false);
    }
    router.push(`/?${newParams.toString()}`);
  };

  return (
    <SidebarMenu>
      {navItems.slice(0, -2).map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item)}
            tooltip={item.label}
            onClick={handleLinkClick}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}

      {/* Language Collapsible */}
      <Collapsible asChild className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Language">
              <Globe />
              <span>Language</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  isActive={currentLanguageValue === ""}
                  onClick={() => handleLanguageChange("")}
                  className="cursor-pointer"
                >
                  <span>All Languages</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              {availableLanguages.map((lang) => {
                const isDubbed = lang.toLowerCase() === 'hindi dubbed';
                const isSelected = isDubbed ? isHindiDubbed : currentRegion?.toLowerCase() === lang.toLowerCase();
                return (
                  <SidebarMenuSubItem key={lang}>
                    <SidebarMenuSubButton
                      isActive={isSelected}
                      onClick={() => handleLanguageChange(lang)}
                      className="cursor-pointer"
                    >
                      <span>{lang}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      {/* Remaining nav items (Disclaimer, Contact) */}
      {navItems.slice(-2).map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item)}
            tooltip={item.label}
            onClick={handleLinkClick}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
