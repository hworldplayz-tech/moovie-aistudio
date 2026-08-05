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

type Genre = {
  id: number | string;
  name: string;
};

const languages = [
  { value: 'US', label: 'English (US)' },
  { value: 'IN', label: 'Hindi (India)' },
  { value: 'PK', label: 'Urdu (Pakistan)' },
  { value: 'GB', label: 'English (UK)' },
];

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-1.5 sm:px-2 lg:px-3 text-muted-foreground shrink-0">
          <Icon className="h-4 w-4" />
          <span className="ml-2 hidden lg:inline">{label}</span>
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
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

  useEffect(() => {
    getAllGenres().then(setGenres);
  }, []);

  const genreOptions = genres.map(g => ({ value: g.name, label: g.name }));
  const yearOptions = years.map(y => ({ value: y, label: y }));
  const languageOptions = languages;

  const currentGenre = searchParams.get('genre') || '';
  const currentYear = searchParams.get('year') || '';
  const currentRegion = searchParams.get('region') || '';
  const isHindiDubbed = searchParams.get('hindi_dubbed') === 'true';

  const currentLanguageValue = isHindiDubbed ? 'hindi_dubbed' : currentRegion;

  const handleFilterChange = useCallback((key: 'genre' | 'year' | 'region' | 'hindi_dubbed', value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());

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
