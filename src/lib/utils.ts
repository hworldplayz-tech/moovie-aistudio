import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

/**
 * Safely extracts a 4-digit year (1900-2099) from an item's releaseDate, air dates, or title.
 * Returns null if no valid year can be found.
 */
export function extractContentYear(item?: {
  releaseDate?: string | null;
  firstAirDate?: string | null;
  lastAirDate?: string | null;
  title?: string | null;
} | null): number | null {
  if (!item) return null;

  // 1. Check releaseDate (ensure it is not 'N/A', empty, or stub)
  if (item.releaseDate && item.releaseDate !== 'N/A') {
    const match = item.releaseDate.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
      const y = parseInt(match[1], 10);
      if (y >= 1900 && y <= 2100) return y;
    }
  }

  // 2. Check firstAirDate or lastAirDate (for TV shows)
  const airDate = item.firstAirDate || item.lastAirDate;
  if (airDate && airDate !== 'N/A') {
    const match = airDate.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
      const y = parseInt(match[1], 10);
      if (y >= 1900 && y <= 2100) return y;
    }
  }

  // 3. Check title (e.g., "Rakshak Gunda 2021" or "Movie Title (2023)")
  if (item.title) {
    const match = item.title.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
      const y = parseInt(match[1], 10);
      if (y >= 1900 && y <= 2100) return y;
    }
  }

  return null;
}

/**
 * Sorts content array so that:
 * 1. Items WITH a valid year appear first, ordered newest release year to oldest.
 * 2. Items WITHOUT a year (N/A, missing, invalid) are placed at the very END (last).
 * 3. Stable tie-breaking using full releaseDate, rating, and createdAt.
 */
export function sortContentByLatest<T extends {
  releaseDate?: string | null;
  firstAirDate?: string | null;
  lastAirDate?: string | null;
  title?: string | null;
  createdAt?: string | null;
  rating?: number | null;
}>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];

  return [...items].sort((a, b) => {
    const yearA = extractContentYear(a);
    const yearB = extractContentYear(b);

    // Items with a valid year ALWAYS come before items without a year
    if (yearA !== null && yearB === null) return -1;
    if (yearA === null && yearB !== null) return 1;

    // Both items have a valid year: sort descending by year (newest first)
    if (yearA !== null && yearB !== null) {
      if (yearA !== yearB) {
        return yearB - yearA; // e.g., 2027, 2026, 2025...
      }

      // Same year: check if full YYYY-MM-DD release dates are present for finer ordering
      const dateStrA = (a.releaseDate && a.releaseDate !== 'N/A' && /^\d{4}-\d{2}/.test(a.releaseDate)) ? a.releaseDate : '';
      const dateStrB = (b.releaseDate && b.releaseDate !== 'N/A' && /^\d{4}-\d{2}/.test(b.releaseDate)) ? b.releaseDate : '';
      if (dateStrA && dateStrB && dateStrA !== dateStrB) {
        return dateStrB.localeCompare(dateStrA);
      }

      // Same date / year: sort by rating descending
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }

      // Fallback tie-breaker: createdAt desc, then title
      const createdA = a.createdAt || '';
      const createdB = b.createdAt || '';
      if (createdA && createdB && createdA !== createdB) {
        return createdB.localeCompare(createdA);
      }

      return (a.title || '').localeCompare(b.title || '');
    }

    // Neither item has a year (both at the end):
    // Order them cleanly among themselves by createdAt descending, fallback to title
    const createdA = a.createdAt || '';
    const createdB = b.createdAt || '';
    if (createdA && createdB && createdA !== createdB) {
      return createdB.localeCompare(createdA);
    }

    return (a.title || '').localeCompare(b.title || '');
  });
}
