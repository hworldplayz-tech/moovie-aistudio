'use client';

import { ContentCard } from "@/components/content-card";
import { ContentCarousel } from "@/components/content-carousel";
import { LayoutGrid, List, Search } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";
import { HeroCarousel } from "@/components/hero-carousel";
import RecommendedContent from "@/components/recommended-content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPaginationLimit, getSecureDownloadSettings } from "@/app/admin/actions";
import { Loader2, ChevronDown } from "lucide-react";
import { LiveTvCarousel } from "@/components/live-tv-carousel";
import { getLiveChannels } from "@/lib/firestore";
import type { Content, LiveChannel } from "@/lib/definitions";
import { getManuallyAddedContent, getTrending } from "@/lib/tmdb";
import BannerAd from "@/components/ads/banner-ad";
import NativeAd from "@/components/ads/native-ad";
import PopupHandler from "@/components/ads/popup-handler";

interface BrowseClientProps {
    initialContent: Content[];
    initialFeaturedContent: Content[];
    initialHero: Content[];
    initialLiveChannels: LiveChannel[];
    initialPaginationLimit: number;
    featuredLayout?: 'slider' | 'grid' | 'list';
}

export default function BrowseClient({
    initialContent,
    initialFeaturedContent,
    initialHero,
    initialLiveChannels,
    initialPaginationLimit,
    featuredLayout = 'slider'
}: BrowseClientProps) {
    const searchParams = useSearchParams();
    const q = searchParams.get('q');
    const type = searchParams.get('type') as 'movie' | 'tv' | null;
    const genre = searchParams.get('genre');
    const region = searchParams.get('region');
    const year = searchParams.get('year');
    const hindiDubbed = searchParams.get('hindi_dubbed');

    const [content, setContent] = useState<Content[]>(initialContent);
    const [heroContent, setHeroContent] = useState<Content[]>(initialHero);
    const [liveChannels, setLiveChannels] = useState<LiveChannel[]>(initialLiveChannels);
    const [isLoading, setIsLoading] = useState(false); // Initial load is done server-side
    const [isHeroLoading, setIsHeroLoading] = useState(false);
    const [view, setView] = useState<'grid' | 'list'>('grid');

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(initialPaginationLimit);
    const [loadLimit, setLoadLimit] = useState(initialPaginationLimit);

    const isFilteredView = q || type || genre || region || year || hindiDubbed;

    // Re-fetch only if filters change (Client-side filtering)
    useEffect(() => {
        // If we have filters, we might need to re-filter content or fetch if it wasn't passed initially in a filtered state?
        // Current architecture fetches everything then filters locally for manual content?
        // Actually, page.tsx original logic did fetch local content and filter it.
        // If we are server-side fetching, we passed initialContent.
        // If user changes filters, we need to apply them.

        // If initial load, we skip because initialContent is already correct?
        // Wait, initialContent passed from server should be "all local content" or "filtered content"?
        // Best practice: Pass all local content if dataset small, or fetched filtered.
        // Assuming `initialContent` is ALL content for now if we want to keep client-side filtering logic simple without server actions for everything.
        // OR we re-implement the fetch logic here for client navigation.

        // For now, let's keep the existing logic:
        // If it's a filtered view (via search params), we need to derive the displayed content.

        const applyFilters = async () => {
            setIsLoading(true);
            try {
                const localContent = await getManuallyAddedContent();
                const filteredLocalContent = localContent.filter(item => {
                    if (type && item.type !== type) return false;
                    if (genre && !item.genres?.some(g => String(g) === genre || g.toLowerCase() === genre.toLowerCase())) return false;
                    if (year) {
                        const releaseYear = item.releaseDate ? item.releaseDate.split('-')[0] : '';
                        const airYear = item.lastAirDate ? item.lastAirDate.split('-')[0] : ''; // Approximation
                        if (releaseYear !== year && airYear !== year) return false;
                    }
                    if (region && item.country !== region) return false;
                    if (q && !item.title.toLowerCase().includes(q.toLowerCase())) return false;
                    if (hindiDubbed && !item.isHindiDubbed) return false;
                    return true;
                });
                setContent(filteredLocalContent);
            } catch (e) { console.error(e); }
            setIsLoading(false);
        };

        if (isFilteredView) {
            applyFilters();
        } else {
            // If clear, reset to initial? Or re-fetch all? 
            // If we navigated back to home, `initialContent` prop is from Server Request.
            // But `useEffect` runs on mount. 
            // We can just use `initialContent` if no params, but we need to ensure `content` state is updated when params change back to empty.
            setContent(initialContent);
        }
    }, [q, type, genre, region, year, hindiDubbed, initialContent, isFilteredView]);


    const handleLoadMore = () => {
        setVisibleCount(prev => prev + loadLimit);
    };

    if (isLoading && isFilteredView) {
        // Only show skeleton if we are actively re-fetching due to filters.
        // Initial load (server) should show data immediately.
        return (
            <div className="container mx-auto p-4 md:p-8 space-y-8">
                <Skeleton className="w-full aspect-[21/9] rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-full overflow-hidden container mx-auto p-3 sm:p-4 md:p-8 space-y-8 transition-opacity duration-500 ease-in-out">
            {/* Hero Carousel - Only show on main browse page, not searches */}
            {(!isFilteredView && heroContent.length > 0) && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <HeroCarousel content={heroContent} />
                </section>
            )}

            {/* Hero Banner Ad - Below Hero Carousel */}
            {!isFilteredView && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75">
                    <BannerAd size="728x90" position="homepage_hero" />
                </section>
            )}

            {/* Live TV Carousel */}
            {(!isFilteredView && liveChannels.length > 0) && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <LiveTvCarousel channels={liveChannels} />
                </section>
            )}

            {/* Featured Content Section */}
            {(!isFilteredView && initialFeaturedContent.length > 0) && (
                <section className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-150 mb-8">
                    {featuredLayout === 'slider' ? (
                        <ContentCarousel title="Featured Movies & TV" content={initialFeaturedContent} />
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold">Featured Movies & TV</h2>
                            {featuredLayout === 'grid' ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4">
                                    {initialFeaturedContent.map((item) => (
                                        <ContentCard key={item.id} content={item} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-3 sm:space-y-4">
                                    {initialFeaturedContent.map((item) => (
                                        <div key={item.id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="w-[80px] sm:w-[100px] flex-shrink-0">
                                                <ContentCard content={item} className="h-full aspect-[2/3]" />
                                            </div>
                                            <div className="flex-1 py-1 sm:py-2">
                                                <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2 line-clamp-1">{item.title}</h3>
                                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-4">{item.description}</p>
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                    {item.genres.slice(0, 3).map(g => (
                                                        <span key={g} className="text-[10px] sm:text-xs px-2 py-0.5 bg-secondary rounded-full">{g}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Main Content Grid */}
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {isFilteredView ? (
                            q ? `Search: ${q}` : 'Filtered Results'
                        ) : (
                            <>
                                <LayoutGrid className="w-6 h-6 text-primary" />
                                Latest Movies & TV Shows
                            </>
                        )}
                    </h2>
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                        <Button
                            variant={view === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setView('grid')}
                            className="h-8 w-8"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={view === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setView('list')}
                            className="h-8 w-8"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {content.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No content found matching your criteria.</p>
                        {isFilteredView && (
                            <Button variant="link" onClick={() => window.location.href = '/'}>Clear Filters</Button>
                        )}
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-2 sm:gap-4",
                        view === 'grid'
                            ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
                            : "grid-cols-1"
                    )}>
                        {content.slice(0, visibleCount).map((item, index) => (
                            <Fragment key={item.id}>
                                <ContentCard
                                    content={item}
                                    priority={index < 8} // Prioritize first 8 images
                                />
                                {/* In-Feed Native Ad every 12 items */}
                                {!isFilteredView && (index + 1) % 12 === 0 && (
                                    <NativeAd
                                        key={`ad-${index}`}
                                        position={`homepage_feed_${Math.floor(index / 12)}`}
                                        className="col-span-full my-4"
                                    />
                                )}
                            </Fragment>
                        ))}
                    </div>
                )}

                {/* Load More */}
                {content.length > visibleCount && (
                    <div className="flex justify-center pt-8">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleLoadMore}
                            className="min-w-[200px]"
                        >
                            Load More <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </section>

            {/* Recommended Section at bottom */}
            {!isFilteredView && (
                <RecommendedContent />
            )}

            {/* Popup Handler - Shows after 30 seconds */}
            {!isFilteredView && <PopupHandler trigger="time" delay={30} position="homepage_popup" />}
        </div>
    );
}
