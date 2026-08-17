'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Search, History, X, Trash2, ArrowRight } from 'lucide-react';
import { Input } from './ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { HeaderFilters } from './header-filters';
import { FormEvent, useState, useRef, useEffect } from 'react';
import { useRecentSearches } from '@/lib/recent-searches';

export function AppHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches();

  const [searchVal, setSearchVal] = useState(searchParams?.get('q') || '');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync searchVal with URL params if changed externally
  useEffect(() => {
    setSearchVal(searchParams?.get('q') || '');
  }, [searchParams]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = (query: string) => {
    const trimmed = query.trim();
    if (trimmed) {
      addSearch(trimmed);
    }
    const newParams = new URLSearchParams(searchParams?.toString() || '');
    if (trimmed) {
      newParams.set('q', trimmed);
    } else {
      newParams.delete('q');
    }
    setIsFocused(false);
    router.push(`/?${newParams.toString()}`);
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    executeSearch(searchVal);
  };

  const handleSelectRecent = (term: string) => {
    setSearchVal(term);
    executeSearch(term);
  };

  const showDropdown = isFocused && recentSearches.length > 0;

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center gap-2 border-b bg-background/95 backdrop-blur-md px-3 sm:px-4 md:px-6 w-full max-w-full shrink-0 shadow-sm">
      <SidebarTrigger className="md:hidden shrink-0" />
      <div className="flex-1 min-w-0" ref={containerRef}>
        <div className="relative md:max-w-md lg:max-w-lg">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                name="search"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsFocused(false);
                  }
                }}
                placeholder="Search movies & shows..."
                className="w-full appearance-none bg-background pl-8 sm:pl-9 pr-8 h-8 sm:h-9 text-xs sm:text-sm shadow-none"
                autoComplete="off"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchVal('');
                    executeSearch('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Recent Searches Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover/95 backdrop-blur-md border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-3.5 py-2 border-b bg-muted/40 text-xs text-muted-foreground">
                <span className="font-semibold flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-primary" /> Recent Searches
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSearches();
                  }}
                  className="hover:text-destructive text-[11px] font-medium transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear All
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-muted/70 cursor-pointer group text-xs sm:text-sm transition-colors"
                    onClick={() => handleSelectRecent(term)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <History className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      <span className="truncate text-foreground/90 group-hover:text-foreground font-medium">{term}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSearch(term);
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove from history"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <HeaderFilters />
        <ThemeToggle />
      </div>
    </header>
  );
}

