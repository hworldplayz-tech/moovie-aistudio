import type { Content } from '@/lib/definitions';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ContentCard } from './content-card';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface ContentCarouselProps {
  title: string;
  content: Content[];
}

export function ContentCarousel({ title, content }: ContentCarouselProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link href="/browse" className="text-sm text-primary hover:underline flex items-center gap-1">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <Carousel
        opts={{
          align: 'start',
          loop: content.length > 7, // Only loop if there are enough items to scroll
        }}
        className="w-full"
      >
        <CarouselContent>
          {content.map((item) => (
            <CarouselItem key={item.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 2xl:basis-1/7">
              <ContentCard content={item} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden lg:flex" />
        <CarouselNext className="hidden lg:flex" />
      </Carousel>
    </section>
  );
}
