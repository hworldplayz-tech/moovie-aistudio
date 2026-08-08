'use client';

import { ContentCard } from "@/components/content-card";
import { ContentCarousel } from "@/components/content-carousel";
import { LayoutGrid, List, Search, Film, Tv, Loader2, ChevronDown } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";
import { HeroCarousel } from "@/components/hero-carousel";
import RecommendedContent from "@/components/recommended-content";
import { Button } from "@/components/ui/button";
import { cn, slugify } from "@/lib/utils";
import { getPaginationLimit, getSecureDownloadSettings } from "@/app/admin/actions";
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
    const [searchCategoryTab, setSearchCategoryTab] = useState<'all' | 'movie' | 'tv'>('all');

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

                // If user is searching by query, fetch TMDB API results too
                let tmdbResults: Content[] = [];
                if (q && q.trim().length > 0) {
                    try {
                        const { searchContent } = await import('@/lib/tmdb');
                        tmdbResults = await searchContent(q.trim());
                    } catch (err) {
                        console.error('TMDB search error:', err);
                    }
                }

                // Filter uploaded local content
                const filteredLocalContent = localContent.filter(item => {
                    if (type && item.type !== type) return false;
                    if (genre && !item.genres?.some(g => String(g) === genre || g.toLowerCase() === genre.toLowerCase())) return false;
                    if (year) {
                        const releaseYear = item.releaseDate ? item.releaseDate.split('-')[0] : '';
                        const airYear = item.lastAirDate ? item.lastAirDate.split('-')[0] : '';
                        if (releaseYear !== year && airYear !== year) return false;
                    }
                    if (region && item.country !== region) return false;
                    if (q && !item.title.toLowerCase().includes(q.toLowerCase())) return false;
                    if (hindiDubbed && !item.isHindiDubbed) return false;
                    return true;
                }).map(item => ({ ...item, inLibrary: true }));

                if (q && q.trim().length > 0) {
                    const localIds = new Set(localContent.map(c => String(c.id)));
                    const localTitles = new Set(localContent.map(c => c.title.toLowerCase().trim()));

                    // Filter TMDB results to exclude items already uploaded
                    const uniqueTmdbItems = tmdbResults
                        .filter(item => {
                            if (type && item.type !== type) return false;
                            if (genre && !item.genres?.some(g => String(g) === genre || g.toLowerCase() === genre.toLowerCase())) return false;
                            if (year) {
                                const releaseYear = item.releaseDate ? item.releaseDate.split('-')[0] : '';
                                if (releaseYear !== year) return false;
                            }
                            return !localIds.has(String(item.id)) && !localTitles.has(item.title.toLowerCase().trim());
                        })
                        .map(item => ({
                            ...item,
                            inLibrary: false,
                            isTmdbOnly: true,
                            slug: `${item.type || 'movie'}-${item.id}-${slugify(item.title)}`
                        }));

                    setContent([...filteredLocalContent, ...uniqueTmdbItems]);
                } else {
                    setContent(filteredLocalContent);
                }
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
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                    {initialFeaturedContent.map((item) => (
                                        <ContentCard key={item.id} content={item} variant="list" />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Main Content Grid */}
            {(() => {
                const displayedContent = content.filter(item => {
                    if (searchCategoryTab === 'movie' && item.type !== 'movie') return false;
                    if (searchCategoryTab === 'tv' && item.type !== 'tv') return false;
                    return true;
                });
                const moviesCount = content.filter(c => c.type === 'movie').length;
                const tvCount = content.filter(c => c.type === 'tv').length;

                return (
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

                        {q && (
                            <div className="flex items-center gap-2 flex-wrap bg-muted/30 p-2 rounded-xl border border-muted-foreground/10">
                                <span className="text-xs font-semibold text-muted-foreground px-2 hidden sm:inline">Category:</span>
                                <Button
                                    variant={searchCategoryTab === 'all' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setSearchCategoryTab('all')}
                                    className="rounded-lg text-xs h-8 px-3 font-medium"
                                >
                                    All ({content.length})
                                </Button>
                                <Button
                                    variant={searchCategoryTab === 'movie' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setSearchCategoryTab('movie')}
                                    className="rounded-lg text-xs h-8 px-3 font-medium flex items-center gap-1.5"
                                >
                                    <Film className="h-3.5 w-3.5 text-primary" /> Movies ({moviesCount})
                                </Button>
                                <Button
                                    variant={searchCategoryTab === 'tv' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setSearchCategoryTab('tv')}
                                    className="rounded-lg text-xs h-8 px-3 font-medium flex items-center gap-1.5"
                                >
                                    <Tv className="h-3.5 w-3.5 text-amber-400" /> TV Series ({tvCount})
                                </Button>
                            </div>
                        )}

                        {displayedContent.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No content found matching your criteria.</p>
                                {isFilteredView && (
                                    <Button variant="link" onClick={() => window.location.href = '/'}>Clear Filters</Button>
                                )}
                            </div>
                        ) : (
                            <div className={cn(
                                "grid gap-2.5 sm:gap-4",
                                view === 'grid'
                                    ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
                                    : "grid-cols-1 xl:grid-cols-2 gap-3"
                            )}>
                                {displayedContent.slice(0, visibleCount).map((item, index) => (
                                    <Fragment key={item.id}>
                                        <ContentCard
                                            content={item}
                                            variant={view}
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
                        {displayedContent.length > visibleCount && (
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
                );
            })()}

            {/* Recommended Section at bottom */}
            {!isFilteredView && (
                <RecommendedContent />
            )}

            {/* Popup Handler - Shows after 30 seconds */}
            {!isFilteredView && <PopupHandler trigger="time" delay={30} position="homepage_popup" />}
        </div>
    );
}
