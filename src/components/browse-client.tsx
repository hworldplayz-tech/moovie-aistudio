'use client';

import { ContentCard } from "@/components/content-card";
import { ContentCarousel } from "@/components/content-carousel";
import { LayoutGrid, List, Search, Film, Tv, Loader2, ChevronDown, History, X } from "lucide-react";
import { Fragment, useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, useRouter } from "next/navigation";
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
import { useRecentSearches } from "@/lib/recent-searches";

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const { recentSearches, addSearch, removeSearch } = useRecentSearches();

    const q = searchParams?.get('q') || null;
    const type = (searchParams?.get('type') || null) as 'movie' | 'tv' | null;
    const genre = searchParams?.get('genre') || null;
    const region = searchParams?.get('region') || null;
    const year = searchParams?.get('year') || null;
    const hindiDubbed = searchParams?.get('hindi_dubbed') || null;

    const [content, setContent] = useState<Content[]>(initialContent);
    const [heroContent, setHeroContent] = useState<Content[]>(initialHero);
    const [liveChannels, setLiveChannels] = useState<LiveChannel[]>(initialLiveChannels);
    const [isLoading, setIsLoading] = useState(false);
    const [isHeroLoading, setIsHeroLoading] = useState(false);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [searchCategoryTab, setSearchCategoryTab] = useState<'all' | 'movie' | 'tv'>('all');

    // Automatically record search query in recent searches
    useEffect(() => {
        if (q && q.trim().length > 0) {
            addSearch(q.trim());
        }
    }, [q, addSearch]);

    // Pagination State - batch size 24 for lightning fast rendering
    const [visibleCount, setVisibleCount] = useState(Math.max(24, initialPaginationLimit || 24));
    const loadLimit = Math.max(24, initialPaginationLimit || 24);
    const observerSentinelRef = useRef<HTMLDivElement | null>(null);

    const isFilteredView = q || type || genre || region || year || hindiDubbed;

    // Instant Client-side filtering and fast background TMDB search
    useEffect(() => {
        if (!isFilteredView) {
            setContent(initialContent);
            setIsLoading(false);
            return;
        }

        // Helper to filter local array in memory (takes < 1ms)
        const filterLocal = (list: Content[]) => {
            return list.filter(item => {
                if (type && item.type !== type) return false;
                if (genre && !item.genres?.some(g => String(g) === genre || (typeof g === 'string' && g.toLowerCase() === genre.toLowerCase()))) return false;
                if (year) {
                    const releaseYear = item.releaseDate ? item.releaseDate.split('-')[0] : '';
                    const airYear = item.lastAirDate ? item.lastAirDate.split('-')[0] : '';
                    if (releaseYear !== year && airYear !== year) return false;
                }
                if (region) {
                    const regionLower = region.toLowerCase();
                    const matchLang = item.languages?.some(l => 
                        l.toLowerCase() === regionLower || 
                        l.toLowerCase().includes(regionLower)
                    );
                    const matchCountry = (item.country || '').toLowerCase() === regionLower;
                    const matchOriginalLang = (item.originalLanguage || '').toLowerCase() === regionLower;
                    if (!matchLang && !matchCountry && !matchOriginalLang) return false;
                }
                if (q && !(item.title || '').toLowerCase().includes(q.toLowerCase().trim())) return false;
                if (hindiDubbed) {
                    const isHindi = item.isHindiDubbed || item.languages?.some(l => l.toLowerCase().includes('hindi'));
                    if (!isHindi) return false;
                }
                return true;
            }).map(item => ({ ...item, inLibrary: true }));
        };

        // 1. Instantly display local matches from memory without waiting
        const instantFiltered = filterLocal(initialContent);
        setContent(instantFiltered);

        // 2. If searching with query `q`, asynchronously fetch & merge TMDB results
        let isCancelled = false;
        if (q && q.trim().length > 0) {
            const queryTrimmed = q.trim();
            const fetchTmdb = async () => {
                try {
                    const { searchContent } = await import('@/lib/tmdb');
                    const tmdbResults = await searchContent(queryTrimmed);
                    if (isCancelled) return;

                    const localIds = new Set(initialContent.map(c => String(c.id)));
                    const localTitles = new Set(initialContent.map(c => (c.title || '').toLowerCase().trim()));

                    const uniqueTmdbItems = tmdbResults
                        .filter(item => {
                            if (type && item.type !== type) return false;
                            if (genre && !item.genres?.some(g => String(g) === genre || (typeof g === 'string' && g.toLowerCase() === genre.toLowerCase()))) return false;
                            if (year) {
                                const releaseYear = item.releaseDate ? item.releaseDate.split('-')[0] : '';
                                if (releaseYear !== year) return false;
                            }
                            return !localIds.has(String(item.id)) && !localTitles.has((item.title || '').toLowerCase().trim());
                        })
                        .map(item => ({
                            ...item,
                            inLibrary: false,
                            isTmdbOnly: true,
                            slug: `${item.type || 'movie'}-${item.id}-${slugify(item.title)}`
                        }));

                    setContent([...instantFiltered, ...uniqueTmdbItems]);
                } catch (err) {
                    console.error('TMDB search error:', err);
                }
            };

            const timer = setTimeout(fetchTmdb, 100);
            return () => {
                isCancelled = true;
                clearTimeout(timer);
            };
        }
    }, [q, type, genre, region, year, hindiDubbed, initialContent, isFilteredView]);

    // Filtered by category tab (All / Movies / TV Series)
    const displayedContent = useMemo(() => {
        return content.filter(item => {
            if (searchCategoryTab === 'movie' && item.type !== 'movie') return false;
            if (searchCategoryTab === 'tv' && item.type !== 'tv') return false;
            return true;
        });
    }, [content, searchCategoryTab]);

    const moviesCount = useMemo(() => content.filter(c => c.type === 'movie').length, [content]);
    const tvCount = useMemo(() => content.filter(c => c.type === 'tv').length, [content]);

    const handleLoadMore = useCallback(() => {
        setVisibleCount(prev => prev + loadLimit);
    }, [loadLimit]);

    // IntersectionObserver for auto seamless infinite scrolling
    useEffect(() => {
        const sentinel = observerSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => {
                    if (prev < displayedContent.length) {
                        return prev + loadLimit;
                    }
                    return prev;
                });
            }
        }, { rootMargin: '400px' });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [displayedContent.length, loadLimit]);


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
                    <div className="space-y-2.5">
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

                        {recentSearches.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap px-1 text-xs">
                                <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px] shrink-0 mr-1">
                                    <History className="h-3 w-3 text-primary" /> Recent Searches:
                                </span>
                                {recentSearches.slice(0, 6).map((term) => (
                                    <div
                                        key={term}
                                        className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none",
                                            q?.toLowerCase() === term.toLowerCase()
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/50 hover:bg-muted text-foreground/85 border-muted-foreground/20 hover:border-primary/40"
                                        )}
                                        onClick={() => {
                                            const newParams = new URLSearchParams(searchParams?.toString() || '');
                                            newParams.set('q', term);
                                            router.push(`/?${newParams.toString()}`);
                                        }}
                                    >
                                        <span>{term}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeSearch(term);
                                            }}
                                            className="p-0.5 rounded-full opacity-60 hover:opacity-100 hover:text-destructive"
                                            title="Remove from history"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {displayedContent.length === 0 ? (
                    <div className="text-center py-16 px-4 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed space-y-4">
                        <Search className="w-12 h-12 mx-auto opacity-40 text-muted-foreground" />
                        <div className="space-y-1">
                            <p className="text-lg font-medium text-foreground">
                                {q ? `No content found matching "${q}"` : 'No content found matching your criteria.'}
                            </p>
                            <p className="text-sm text-muted-foreground">Try searching with a different movie title, series name, or genre keyword.</p>
                        </div>
                        {recentSearches.length > 0 && (
                            <div className="pt-2 max-w-md mx-auto">
                                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
                                    <History className="h-3.5 w-3.5 text-primary" /> Or try one of your recent searches:
                                </p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {recentSearches.slice(0, 6).map((term) => (
                                        <button
                                            key={term}
                                            type="button"
                                            onClick={() => {
                                                const newParams = new URLSearchParams(searchParams?.toString() || '');
                                                newParams.set('q', term);
                                                router.push(`/?${newParams.toString()}`);
                                            }}
                                            className="px-3 py-1 bg-background hover:bg-muted text-xs font-medium rounded-full border border-muted-foreground/20 hover:border-primary transition-all text-foreground"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {isFilteredView && (
                            <div className="pt-2">
                                <Button variant="outline" size="sm" onClick={() => router.push('/')}>Clear All Filters</Button>
                            </div>
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
                                    priority={index < 4}
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

                {/* Auto-loader sentinel element for infinite scrolling */}
                {displayedContent.length > visibleCount && (
                    <div ref={observerSentinelRef} className="w-full h-10 flex items-center justify-center pt-4">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleLoadMore}
                            className="min-w-[200px]"
                        >
                            Load More ({displayedContent.length - visibleCount} remaining) <ChevronDown className="ml-2 h-4 w-4" />
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
