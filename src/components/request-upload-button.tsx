'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle2, Loader2, PlusCircle } from 'lucide-react';
import { submitContentRequestAction, getContentRequestByTmdbIdAction } from '@/app/admin/actions';

interface RequestUploadButtonProps {
  tmdbId: string;
  title: string;
  posterPath: string;
  backdropPath: string;
  type: 'movie' | 'tv';
  releaseDate?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function RequestUploadButton({
  tmdbId,
  title,
  posterPath,
  backdropPath,
  type,
  releaseDate,
  variant = 'default',
  size = 'default',
  className
}: RequestUploadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkExistingRequest() {
      if (!tmdbId) return;
      try {
        const req = await getContentRequestByTmdbIdAction(tmdbId);
        if (isMounted && req) {
          setCount(req.requestCount || 1);
          if (req.status === 'pending') {
            // Already requested
          }
        }
      } catch (err) {
        console.error('Error checking existing request:', err);
      }
    }
    checkExistingRequest();
    return () => { isMounted = false; };
  }, [tmdbId]);

  const handleRequest = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await submitContentRequestAction({
        tmdbId: String(tmdbId),
        title,
        posterPath: posterPath || '',
        backdropPath: backdropPath || '',
        type,
        releaseDate: releaseDate || ''
      });

      if (res.success) {
        setRequested(true);
        setCount(res.requestCount);
      }
    } catch (error) {
      console.error('Failed to submit upload request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (requested) {
    return (
      <Button variant="secondary" size={size} disabled className={className}>
        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
        Request Sent {count ? `(${count})` : ''}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRequest}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <PlusCircle className="mr-2 h-4 w-4 text-amber-400" />
      )}
      Request to Upload {count && count > 0 ? `(${count})` : ''}
    </Button>
  );
}
