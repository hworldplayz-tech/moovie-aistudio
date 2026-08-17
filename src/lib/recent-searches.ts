'use client';

import { useState, useEffect, useCallback } from 'react';

const RECENT_SEARCHES_KEY = 'moovie_recent_searches';
const MAX_RECENT_SEARCHES = 10;
const EVENT_NAME = 'moovie:recent-searches-updated';

export function getStoredRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, MAX_RECENT_SEARCHES);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveRecentSearchQuery(query: string): string[] {
  if (typeof window === 'undefined') return [];
  const clean = query.trim();
  if (!clean || clean.length < 1) return getStoredRecentSearches();

  try {
    const current = getStoredRecentSearches();
    // Remove if already exists (case-insensitive) to move it to the top
    const filtered = current.filter(item => item.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearchQuery(query: string): string[] {
  if (typeof window === 'undefined') return [];
  const clean = query.trim();
  try {
    const current = getStoredRecentSearches();
    const updated = current.filter(item => item.toLowerCase() !== clean.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    return updated;
  } catch {
    return [];
  }
}

export function clearAllRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: [] }));
  } catch {}
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(getStoredRecentSearches());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setRecentSearches(customEvent.detail);
      } else {
        setRecentSearches(getStoredRecentSearches());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addSearch = useCallback((query: string) => {
    const updated = saveRecentSearchQuery(query);
    setRecentSearches(updated);
  }, []);

  const removeSearch = useCallback((query: string) => {
    const updated = removeRecentSearchQuery(query);
    setRecentSearches(updated);
  }, []);

  const clearSearches = useCallback(() => {
    clearAllRecentSearches();
    setRecentSearches([]);
  }, []);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearSearches
  };
}
