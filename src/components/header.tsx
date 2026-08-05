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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 md:gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="w-full flex-1">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              key={searchParams.get('q')}
              type="search"
              name="search"
              defaultValue={searchParams.get('q') || ''}
              placeholder="Search movies & shows..."
              className="w-full appearance-none bg-background pl-9 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>
      <HeaderFilters />
      <ThemeToggle />
    </header>
  );
}
