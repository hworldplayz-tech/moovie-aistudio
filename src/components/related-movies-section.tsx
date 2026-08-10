'use client';

import { useState, useEffect } from 'react';
import type { Content } from '@/lib/definitions';
import { getManuallyAddedContent, getRelatedSettings } from '@/app/admin/actions';
import { ContentCard } from './content-card';
import { Button } from './ui/button';
import { Film, RefreshCw, ChevronDown, Sparkles } from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from './ui/skeleton';

interface RelatedMoviesSectionProps {
    currentContent: Content;
    initialLimit?: number;
    layoutMode?: 'grid' | 'slider';
}

function computeRelevanceScore(candidate: Content, target: Content): number {
    let score = 0;

    // 1. Same Type (movie vs tv)
    if (candidate.type === target.type) score += 10;

    // 2. Genre matching
    const targetGenres = new Set(target.genres || []);
    (candidate.genres || []).forEach(g => {
        if (targetGenres.has(g)) score += 8;
    });

    // 3. Custom Tags matching
    const targetTags = new Set(target.customTags || []);
    (candidate.customTags || []).forEach(t => {
        if (targetTags.has(t)) score += 5;
    });

    // 4. Language / Dubbing matching
    const targetLangs = new Set(target.languages || []);
    (candidate.languages || []).forEach(l => {
        if (targetLangs.has(l)) score += 6;
    });
    if (candidate.isHindiDubbed && target.isHindiDubbed) score += 6;

    // 5. Country matching
    if (candidate.country && target.country && candidate.country === target.country) score += 3;

    // 6. Title similarity / Franchise match
    const targetTitleWords = (target?.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const candTitle = (candidate?.title || '').toLowerCase();
    targetTitleWords.forEach(word => {
        if (candTitle.includes(word)) score += 12;
    });

    return score;
}

export function RelatedMoviesSection({
    currentContent,
    initialLimit: propLimit,
    layoutMode: propLayout
}: RelatedMoviesSectionProps) {
    const [allRelated, setAllRelated] = useState<Content[]>([]);
    const [visibleCount, setVisibleCount] = useState<number>(6);
    const [layout, setLayout] = useState<'grid' | 'slider'>('grid');
    const [stepSize, setStepSize] = useState<number>(6);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchAndCalculateRelated() {
            setLoading(true);
            try {
                const [allContent, settings] = await Promise.all([
                    getManuallyAddedContent(),
                    getRelatedSettings()
                ]);

                if (!isMounted) return;

                const countLimit = propLimit || settings.relatedItemsCount || 6;
                const layoutStyle = propLayout || settings.relatedLayout || 'grid';

                setVisibleCount(countLimit);
                setStepSize(countLimit);
                setLayout(layoutStyle);

                // Exclude current open item
                const candidates = allContent.filter(c => String(c.id) !== String(currentContent.id));

                // Score each candidate
                const scoredCandidates = candidates.map(candidate => ({
                    content: candidate,
                    score: computeRelevanceScore(candidate, currentContent)
                }));

                // Sort by score desc, then by releaseDate / createdAt
                scoredCandidates.sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    const dateA = a.content.releaseDate || a.content.createdAt || '';
                    const dateB = b.content.releaseDate || b.content.createdAt || '';
                    return dateB.localeCompare(dateA);
                });

                setAllRelated(scoredCandidates.map(sc => sc.content));
            } catch (err) {
                console.error('Failed to load related content:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchAndCalculateRelated();

        return () => {
            isMounted = false;
        };
    }, [currentContent.id, propLimit, propLayout]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + stepSize);
    };

    if (loading) {
        return (
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-7 w-48" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (allRelated.length === 0) {
        return null; // Nothing related available
    }

    const sectionTitle = currentContent.type === 'tv' ? 'Related TV Shows' : 'Related Movies';
    const displayedItems = allRelated.slice(0, visibleCount);
    const hasMore = visibleCount < allRelated.length;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Film className="h-6 w-6 text-primary" />
                    {sectionTitle}
                </h2>
                {hasMore && (
                    <span className="text-xs text-muted-foreground">
                        Showing {displayedItems.length} of {allRelated.length}
                    </span>
                )}
            </div>

            {layout === 'grid' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {displayedItems.map((item) => (
                            <ContentCard key={item.id} content={item} />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <Button
                                onClick={handleLoadMore}
                                variant="outline"
                                size="lg"
                                className="gap-2 rounded-full px-6 shadow-sm hover:border-primary transition-all"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Load More Related {currentContent.type === 'tv' ? 'Shows' : 'Movies'}
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <Carousel
                        opts={{
                            align: 'start',
                            loop: allRelated.length > 6,
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-2.5 sm:-ml-4">
                            {displayedItems.map((item) => (
                                <CarouselItem key={item.id} className="pl-2.5 sm:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                                    <ContentCard content={item} />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden md:flex -left-4" />
                        <CarouselNext className="hidden md:flex -right-4" />
                    </Carousel>

                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <Button
                                onClick={handleLoadMore}
                                variant="outline"
                                size="lg"
                                className="gap-2 rounded-full px-6 shadow-sm hover:border-primary transition-all"
                            >
                                <ChevronDown className="h-4 w-4" />
                                Load More Related {currentContent.type === 'tv' ? 'Shows' : 'Movies'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
