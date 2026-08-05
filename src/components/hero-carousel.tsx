'use client';

import React from 'react';
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
import { slugify } from '@/lib/utils';

interface HeroCarouselProps {
  content: Content[];
}

export function HeroCarousel({ content }: HeroCarouselProps) {
  const plugin = React.useRef(
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
        {content.map((item, index) => (
          <CarouselItem key={item.id}>
            <div className="relative h-[48vh] sm:h-[60vh] md:h-[80vh] w-full max-w-full overflow-hidden rounded-xl">
              <Image
                src={item.backdropPath}
                alt={item.title}
                fill
                className="object-cover"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                quality={85}
                data-ai-hint="dramatic landscape"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-3 sm:p-4 md:p-8 lg:p-12 w-full md:w-2/3 lg:w-1/2">
                <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-foreground drop-shadow-lg line-clamp-2">
                  {item.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm md:text-base">
                  <span>{(item.releaseDate || 'N/A').split('-')[0]}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.genres.slice(0, 3).map(genre => (
                      <Badge key={genre} variant="secondary" className="text-xs">{genre}</Badge>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl line-clamp-3">
                  {item.description}
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <Button asChild size="lg">
                    <Link href={`/watch/${item.id}-${slugify(item.title)}`}>
                      <PlayCircle className="mr-2" />
                      Play Now
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
      <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
    </Carousel>
  );
}
