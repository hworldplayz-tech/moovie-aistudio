'use client';

import React, { memo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Content } from '@/lib/definitions';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PlayCircle, Star } from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';
import { slugify, extractContentYear } from '@/lib/utils';

interface HeroCarouselProps {
  content: Content[];
}

function HeroCarouselComponent({ content }: HeroCarouselProps) {
  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {content.map((item, index) => {
          const watchHref = item.slug
            ? `/watch/${item.slug}`
            : `/watch/${item.id}-${slugify(item.title || '')}`;

          return (
            <CarouselItem key={item.id} className="transform-gpu">
              <div className="relative h-[320px] sm:h-[420px] md:h-[65vh] lg:h-[75vh] w-full max-w-full overflow-hidden rounded-xl bg-muted/40">
                <Image
                  src={item.backdropPath || '/placeholder.png'}
                  alt={item.title || 'Movie'}
                  fill
                  className="object-cover object-top md:object-center"
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                  quality={75}
                  sizes="(max-width: 768px) 100vw, 85vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-10 lg:p-12 w-full md:w-3/4 lg:w-1/2 flex flex-col justify-end">
                  <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground drop-shadow-lg line-clamp-2">
                    {item.title || 'Untitled'}
                  </h1>
                  <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-xs sm:text-sm md:text-base">
                    <span>{extractContentYear(item) || 'N/A'}</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span>{(item.rating || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.genres?.slice(0, 3).map((genre, gIdx) => (
                        <Badge key={`${genre}-${gIdx}`} variant="secondary" className="text-[11px] sm:text-xs py-0 h-5">{genre}</Badge>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm md:text-base text-muted-foreground/90 max-w-xl line-clamp-2 sm:line-clamp-3">
                    {item.description || ''}
                  </p>
                  <div className="mt-3 sm:mt-5 flex items-center gap-3">
                    <Button asChild size="sm" className="sm:hidden">
                      <Link href={watchHref} prefetch={true}>
                        <PlayCircle className="mr-1.5 h-4 w-4" />
                        Play Now
                      </Link>
                    </Button>
                    <Button asChild size="lg" className="hidden sm:inline-flex">
                      <Link href={watchHref} prefetch={true}>
                        <PlayCircle className="mr-2 h-5 w-5" />
                        Play Now
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
      <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
    </Carousel>
  );
}

export const HeroCarousel = memo(HeroCarouselComponent);
