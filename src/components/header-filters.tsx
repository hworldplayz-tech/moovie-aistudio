'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Film, Globe, Calendar, ChevronDown } from 'lucide-react';
import { getAllGenres } from '@/lib/tmdb';
import { getSiteLanguages } from '@/app/admin/actions';
import { DEFAULT_SITE_LANGUAGES } from '@/lib/firestore';

type Genre = {
  id: number | string;
  name: string;
};

const years = Array.from({ length: 45 }, (_, i) => new Date().getFullYear() - i).map(String);

function FilterDropdown({
  label,
  icon: Icon,
  options,
  value,
  onValueChange,
  extraOptions
}: {
  label: string;
  icon: React.ElementType;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  extraOptions?: { value: string; label: string }[];
}) {
  const isActive = Boolean(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={isActive ? "secondary" : "ghost"} 
          size="sm"
          className="relative h-8 px-2 sm:px-2.5 text-xs text-muted-foreground shrink-0"
          title={label}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="ml-1.5 hidden md:inline">{value || label}</span>
          <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
          {extraOptions && extraOptions.map(opt => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
          {extraOptions && <DropdownMenuSeparator />}
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HeaderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(DEFAULT_SITE_LANGUAGES);

  useEffect(() => {
    getAllGenres().then(setGenres);
    getSiteLanguages().then(langs => {
      if (langs && langs.length > 0) {
        setAvailableLanguages(langs);
      }
    }).catch(err => console.error('Failed to load languages in header filters:', err));
  }, []);

  const genreOptions = genres.map(g => ({ value: g.name, label: g.name }));
  const yearOptions = years.map(y => ({ value: y, label: y }));
  const languageOptions = availableLanguages.map(l => ({
    value: l.toLowerCase() === 'hindi dubbed' ? 'hindi_dubbed' : l,
    label: l,
  }));

  const currentGenre = searchParams?.get('genre') || '';
  const currentYear = searchParams?.get('year') || '';
  const currentRegion = searchParams?.get('region') || '';
  const isHindiDubbed = searchParams?.get('hindi_dubbed') === 'true';

  const currentLanguageValue = isHindiDubbed ? 'hindi_dubbed' : currentRegion;

  const handleFilterChange = useCallback((key: 'genre' | 'year' | 'region' | 'hindi_dubbed', value: string) => {
    const newParams = new URLSearchParams(searchParams?.toString() || '');

    // Reset all filters when 'All' is selected
    if (value === '') {
      newParams.delete(key);
      if (key === 'region') {
        newParams.delete('hindi_dubbed');
      }
    } else {
      // Special handling for language/region filter
      if (key === 'region') {
        if (value === 'hindi_dubbed') {
          newParams.set('hindi_dubbed', 'true');
          newParams.delete('region');
        } else {
          newParams.set('region', value);
          newParams.delete('hindi_dubbed');
        }
      } else {
        newParams.set(key, value);
      }
    }

    router.push(`/?${newParams.toString()}`);
  },
    [router, searchParams]
  );

  return (
    <div className="flex items-center gap-1">
      <FilterDropdown
        label="Category"
        icon={Film}
        options={genreOptions}
        value={currentGenre}
        onValueChange={(value) => handleFilterChange('genre', value)}
      />
      <FilterDropdown
        label="Year"
        icon={Calendar}
        options={yearOptions}
        value={currentYear}
        onValueChange={(value) => handleFilterChange('year', value)}
      />
    </div>
  );
}
