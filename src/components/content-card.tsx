

'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Content } from '@/lib/definitions';
import { Card, CardContent } from './ui/card';
import { PlayCircle, Pencil, Star, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { ContentFormDialog } from './content-form-dialog';
import { Button } from './ui/button';
import { slugify } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ContentCardProps {
  content: Content;
  priority?: boolean;
  showAdminControls?: boolean;
  onEditSuccess?: () => void;
  onDeleteSuccess?: () => void;
  currentUser?: { username: string; role: string };
  className?: string;
  variant?: 'grid' | 'list';
}

export function ContentCard({
  content,
  priority = false,
  showAdminControls,
  onEditSuccess,
  onDeleteSuccess,
  currentUser,
  className,
  variant = 'grid'
}: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMouseMoving, setIsMouseMoving] = useState(false);
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* Helper to optimize TMDB images manually by requesting smaller size */
  const getOptimizedPoster = (url: string, size: string = 'w342') => {
    if (url.includes('image.tmdb.org')) {
      // Replace typical sizes (original, w500) with the specified size
      return url.replace(/\/w\d+\//, `/${size}/`).replace('/original/', `/${size}/`);
    }
    return url;
  };

  const optimizedPoster = getOptimizedPoster(content.posterPath);

  const watchUrl = content.slug ? `/watch/${content.slug}` : `/watch/${content.id}-${slugify(content.title)}`;

  const adminControls = showAdminControls && (
    <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <ContentFormDialog contentToEdit={content} onSave={onEditSuccess} currentUser={currentUser}>
        <Button variant="secondary" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Content</span>
        </Button>
      </ContentFormDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete Content</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{content.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteSuccess}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (variant === 'list') {
    return (
      <div className={cn("group relative flex gap-3 sm:gap-4 p-2.5 sm:p-3 border border-border/60 rounded-xl bg-card hover:bg-muted/50 transition-all duration-200 shadow-sm", className)}>
        <Link href={watchUrl} className="relative w-20 sm:w-28 md:w-32 aspect-[2/3] flex-shrink-0 rounded-lg overflow-hidden bg-muted group/thumb">
          <Image
            src={optimizedPoster}
            alt={content.title}
            fill
            className="object-cover transition-transform duration-300 group-hover/thumb:scale-105"
            sizes="(max-width: 640px) 80px, 128px"
            unoptimized
            priority={priority}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
            <PlayCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
          </div>
          <div className="absolute top-1 left-1 z-10 flex flex-wrap gap-0.5 items-start">
            {content.quality?.slice(0, 1).map(q => (
              <Badge key={q} variant="secondary" className="text-[8px] px-1 h-3.5 py-0 leading-none">{q}</Badge>
            ))}
          </div>
        </Link>

        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <Link href={watchUrl} className="hover:underline min-w-0">
                <h3 className="font-bold text-sm sm:text-base md:text-lg truncate text-foreground">{content.title}</h3>
              </Link>
              <div className="flex items-center gap-1 shrink-0 text-xs sm:text-sm bg-yellow-400/10 text-yellow-500 px-1.5 py-0.5 rounded font-medium">
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-yellow-400 text-yellow-400" />
                <span>{content.rating?.toFixed(1) || '0.0'}</span>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{content.releaseDate ? content.releaseDate.split('-')[0] : 'N/A'}</span>
              <span className="capitalize px-1.5 py-0.2 rounded bg-muted text-[10px] text-foreground/80">{content.type === 'tv' ? 'TV Series' : 'Movie'}</span>
              {content.runtime ? <span>{Math.floor(content.runtime / 60)}h {content.runtime % 60}m</span> : null}
              {content.numberOfSeasons ? <span>{content.numberOfSeasons} {content.numberOfSeasons === 1 ? 'Season' : 'Seasons'}</span> : null}
            </div>

            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {content.description || 'No description available.'}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {content.genres?.slice(0, 3).map(g => (
                <Badge key={g} variant="outline" className="text-[10px] sm:text-xs px-2 py-0 h-5 font-normal">{g}</Badge>
              ))}
              {content.isHindiDubbed && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-0 h-5">Hindi Dubbed</Badge>
              )}
            </div>

            <Button asChild size="sm" className="h-7 sm:h-8 text-xs px-2.5 sm:px-3">
              <Link href={watchUrl}>
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Watch Now
              </Link>
            </Button>
          </div>
        </div>

        {adminControls}
      </div>
    );
  }

  return (
    <div className="group relative">
      <Link href={watchUrl} className="block">
        <Card className="overflow-hidden border-0 bg-transparent">
          <CardContent className="p-0">
            <div className="relative aspect-[2/3] w-full">
              <Image
                src={optimizedPoster}
                alt={content.title}
                fill
                className="object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                unoptimized
                priority={priority}
              />
              <div className="absolute top-1 left-1 z-10 flex flex-wrap gap-0.5 items-start max-w-[92%]">
                {content.quality?.map(q => (
                  <Badge key={q} variant="secondary" className="text-[8px] sm:text-[9px] px-1 h-3.5 sm:h-4 py-0 leading-none">{q}</Badge>
                ))}
                {content.languages?.map(lang => (
                  <Badge key={lang} variant="default" className="text-[8px] sm:text-[9px] px-1 h-3.5 sm:h-4 py-0 leading-none">{lang}</Badge>
                ))}
                {!content.languages?.length && content.isHindiDubbed && (
                  <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 h-3.5 sm:h-4 py-0 leading-none">Hindi Dubbed</Badge>
                )}
              </div>
              <div className="absolute bottom-1 right-1 z-10">
                {content.type === 'tv' && content.numberOfSeasons && (
                  <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 h-3.5 sm:h-4 bg-black/70 text-white border-0 backdrop-blur-sm py-0 leading-none">
                    {content.numberOfSeasons} {content.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
                  </Badge>
                )}
                {content.type === 'movie' && content.runtime && (
                  <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 h-3.5 sm:h-4 bg-black/70 text-white border-0 backdrop-blur-sm py-0 leading-none">
                    {Math.floor(content.runtime / 60)}h {content.runtime % 60}m
                  </Badge>
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {adminControls}

      <div className="mt-1 sm:mt-1.5 space-y-0.5">
        <h3 className="font-semibold text-[11px] sm:text-xs md:text-sm truncate leading-tight">{content.title}</h3>
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>{content.releaseDate ? content.releaseDate.split('-')[0] : ''}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400 fill-yellow-400" />
            <span>{content.rating?.toFixed(1) || '0.0'}</span>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground/80 truncate">{content.genres?.[0] || 'N/A'}</p>
      </div>
    </div>
  );
}
