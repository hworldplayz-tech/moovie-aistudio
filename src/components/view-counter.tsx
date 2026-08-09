'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewCounterProps {
  itemId: string | number;
  type?: 'movie' | 'tv' | 'channel';
  initialViews?: number;
  className?: string;
  forceShow?: boolean;
}

export function ViewCounter({
  itemId,
  type = 'movie',
  initialViews = 0,
  className,
  forceShow = false
}: ViewCounterProps) {
  const [viewsCount, setViewsCount] = useState<number>(initialViews);
  const [showPublicViews, setShowPublicViews] = useState<boolean>(true);

  useEffect(() => {
    if (!itemId) return;

    let isMounted = true;

    async function recordView() {
      try {
        const res = await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: String(itemId), type })
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setViewsCount(data.viewsCount || 0);
            if (typeof data.showPublicViews === 'boolean') {
              setShowPublicViews(data.showPublicViews);
            }
          }
        }
      } catch (err) {
        console.error('ViewCounter record view error:', err);
      }
    }

    recordView();

    return () => {
      isMounted = false;
    };
  }, [itemId, type]);

  if (!showPublicViews && !forceShow) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-xs font-medium border border-border/50 shadow-xs transition-colors",
        className
      )}
      title={`${viewsCount.toLocaleString()} views`}
    >
      <Eye className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
      <span className="font-semibold">{viewsCount.toLocaleString()}</span>
      <span className="text-muted-foreground">{viewsCount === 1 ? 'View' : 'Views'}</span>
    </span>
  );
}
