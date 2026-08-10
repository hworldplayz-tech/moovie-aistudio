
'use client';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const languages = [
  { value: 'US', label: 'English (US)' },
  { value: 'IN', label: 'Hindi (India)' },
  { value: 'PK', label: 'Urdu (Pakistan)' },
  { value: 'GB', label: 'English (UK)' },
  { value: 'PB', label: 'Punjabi' },
  { value: 'KR', label: 'Korean' },
  { value: 'CN', label: 'Chinese' },
  { value: 'ML', label: 'Malayalam' },
  { value: 'TR', label: 'Turkish' },
  { value: 'TH', label: 'Thai' },
  { value: 'JA', label: 'Japanese' },
  { value: 'ES', label: 'Spanish' },
  { value: 'FR', label: 'French' },
  { value: 'DE', label: 'German' },
  { value: 'IT', label: 'Italian' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

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
    } else if (value === 'hindi_dubbed') {
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
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  isActive={currentLanguageValue === "hindi_dubbed"}
                  onClick={() => handleLanguageChange("hindi_dubbed")}
                  className="cursor-pointer"
                >
                  <span>Hindi Dubbed</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              {languages.map((lang) => (
                <SidebarMenuSubItem key={lang.value}>
                  <SidebarMenuSubButton
                    isActive={currentLanguageValue === lang.value}
                    onClick={() => handleLanguageChange(lang.value)}
                    className="cursor-pointer"
                  >
                    <span>{lang.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
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
