'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { HeaderFilters } from './header-filters';
import { FormEvent } from 'react';

export function AppHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;

    const newParams = new URLSearchParams(searchParams.toString());
    if (query) {
      newParams.set('q', query);
    } else {
      newParams.delete('q');
    }
    router.push(`/?${newParams.toString()}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center gap-2 border-b bg-background/95 backdrop-blur-md px-3 sm:px-4 md:px-6 w-full max-w-full overflow-hidden shrink-0">
      <SidebarTrigger className="md:hidden shrink-0" />
      <div className="flex-1 min-w-0">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              key={searchParams.get('q')}
              type="search"
              name="search"
              defaultValue={searchParams.get('q') || ''}
              placeholder="Search movies & shows..."
              className="w-full appearance-none bg-background pl-8 sm:pl-9 h-8 sm:h-9 text-xs sm:text-sm shadow-none md:max-w-md lg:max-w-lg"
            />
          </div>
        </form>
      </div>
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <HeaderFilters />
      </div>
      <div className="shrink-0">
        <ThemeToggle />
      </div>
    </header>
  );
}
