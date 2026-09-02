
import type { Content, CastMember } from './definitions';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "46d13701165988b5bb5fb4d123c0447e";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280";
const TMDB_PROFILE_BASE_URL = "https://image.tmdb.org/t/p/w185";

type TmdbContent = {
    id: number;
    title?: string; // Movies have title
    name?: string; // TV shows have name
    overview: string;
    poster_path: string;
    backdrop_path: string;
    genre_ids: number[];
    release_date?: string; // Movies
    first_air_date?: string; // TV
    vote_average: number;
    media_type?: 'movie' | 'tv';
    runtime?: number;
    number_of_seasons?: number;
    last_air_date?: string;
    next_episode_to_air?: { air_date: string };
};

type Genre = {
    id: number | string;
    name: string;
};

type TmdbCredit = {
    id: number;
    name: string;
    character: string;
    profile_path: string;
}

const DEFAULT_GENRES: Genre[] = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 10770, name: "TV Movie" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" },
    { id: 10759, name: "Action & Adventure" },
    { id: 10762, name: "Kids" },
    { id: 10763, name: "News" },
    { id: 10764, name: "Reality" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 10766, name: "Soap" },
    { id: 10767, name: "Talk" },
    { id: 10768, name: "War & Politics" },
];

let genreMap: Map<number | string, string> = new Map(DEFAULT_GENRES.map(g => [g.id, g.name]));
let genreList: Genre[] = DEFAULT_GENRES;

// Caches for lightning-fast lookups
const searchCache = new Map<string, { data: Content[]; timestamp: number }>();
const contentDetailCache = new Map<string, { data: Content | null; timestamp: number }>();
const browseCache = new Map<string, { data: Content[]; timestamp: number }>();
let trendingCache: { data: Content[]; timestamp: number } | null = null;

const CACHE_TTL_SHORT = 10 * 60 * 1000; // 10 minutes
const CACHE_TTL_LONG = 60 * 60 * 1000;  // 1 hour

// Helper to fetch safely without throwing unhandled abort errors
async function fetchSafe(url: string, options: RequestInit = {}): Promise<Response> {
    try {
        const res = await fetch(url, {
            ...options,
            // Use 8s timeout via AbortSignal if available, else standard fetch
            signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? (AbortSignal as any).timeout(8000) : undefined,
        });
        return res;
    } catch (e: any) {
        // Log cleanly without tripping critical unhandled exceptions
        throw new Error(`Fetch failed for ${url}: ${e?.message || 'network error'}`);
    }
}

async function fetchGenres() {
    if (genreMap && genreMap.size > 0 && genreList && genreList.length > 0) {
        return { genreMap, genreList };
    }
    try {
        const [movieResponse, tvResponse] = await Promise.all([
            fetchSafe(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`, { next: { revalidate: 86400 } } as any),
            fetchSafe(`${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}`, { next: { revalidate: 86400 } } as any)
        ]);
        const movieData = await movieResponse.json();
        const tvData = await tvResponse.json();

        const allGenres: Genre[] = [...(movieData.genres || []), ...(tvData.genres || [])];
        const uniqueGenres = Array.from(new Map(allGenres.map(g => [g.id, g])).values());

        if (uniqueGenres.length > 0) {
            genreList = uniqueGenres;
            genreMap = new Map();
            uniqueGenres.forEach(genre => {
                genreMap.set(genre.id, genre.name);
            });
        }
        return { genreMap, genreList };
    } catch {
        return { genreMap, genreList };
    }
}

// ... (existing code intermediate skipped for brevity if not changing, but here I am modifying types so I should be careful)
// Actually I need to replace the TYPE definition at top too.

// Let's replace the whole top section first?
// Or just the chunks.

// I'll replace the Genre type definition first.



function tmdbContentToContent(item: TmdbContent, type: 'movie' | 'tv', allGenres: Map<number | string, string>): Content | null {
    const itemType = item.media_type || type;

    return {
        id: String(item.id),
        title: item.title || item.name || 'No Title',
        description: item.overview,
        posterPath: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : 'https://picsum.photos/seed/poster-placeholder/500/750',
        backdropPath: item.backdrop_path ? `${TMDB_BACKDROP_BASE_URL}${item.backdrop_path}` : 'https://picsum.photos/seed/backdrop-placeholder/1280/720',
        genres: item.genre_ids ? item.genre_ids.map(id => allGenres.get(id) || 'Unknown').filter(g => g !== 'Unknown') : [],
        releaseDate: item.release_date || item.first_air_date || 'N/A',
        rating: item.vote_average,
        type: itemType,
        lastAirDate: item.last_air_date,
    };
}

async function fetchAndTransformContent(url: string, type: 'movie' | 'tv' = 'movie') {
    const { genreMap: allGenres } = await fetchGenres();
    try {
        const response = await fetchSafe(url, { next: { revalidate: 3600 } } as any);
        const data = await response.json();
        const results = (data.results || [data]) as TmdbContent[];

        return results
            .map(item => tmdbContentToContent(item, item.media_type || type, allGenres))
            .filter((item): item is Content => item !== null);
    } catch (error: any) {
        console.warn(`TMDB fetch note from ${url}:`, error?.message || error);
        return [];
    }
}

async function fetchAndTransformSingleContent(url: string, type: 'movie' | 'tv') {
    const { genreMap: allGenres } = await fetchGenres();
    try {
        const response = await fetchSafe(url, { next: { revalidate: 3600 } } as any);
        if (!response.ok) return null;
        const data = await response.json() as TmdbContent & { genres: Genre[], videos: { results: { type: string, key: string, site: string }[] }, credits: { cast: TmdbCredit[] } };

        const trailer = data.videos?.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        const cast: CastMember[] = data.credits?.cast.slice(0, 10).map(c => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profilePath: c.profile_path ? `${TMDB_PROFILE_BASE_URL}${c.profile_path}` : `https://picsum.photos/seed/${c.id}/185/278`,
        })) || [];

        const title = data.title || data.name || 'No Title';
        const { slugify } = await import('./utils');
        const slug = `download-${slugify(title)}`;

        return {
            id: String(data.id),
            title,
            description: data.overview,
            posterPath: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : 'https://picsum.photos/seed/poster-placeholder/500/750',
            backdropPath: data.backdrop_path ? `${TMDB_BACKDROP_BASE_URL}${data.backdrop_path}` : 'https://picsum.photos/seed/backdrop-placeholder/1280/720',
            genres: data.genres ? data.genres.map(g => g.name) : [],
            releaseDate: data.release_date || data.first_air_date || 'N/A',
            rating: data.vote_average,
            type: type,
            youtubeTrailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined,
            cast: cast,
            runtime: data.runtime,
            numberOfSeasons: data.number_of_seasons,
            lastAirDate: data.next_episode_to_air?.air_date || data.last_air_date,
            slug,
        };
    } catch (error: any) {
        console.warn(`TMDB single content fetch note from ${url}:`, error?.message || error);
        return null;
    }
}


export async function getFeatured(): Promise<Content | null> {
    const content = await getTrending();
    return content[0] || null;
}

export async function getTrending(): Promise<Content[]> {
    const now = Date.now();
    if (trendingCache && (now - trendingCache.timestamp < CACHE_TTL_SHORT)) {
        return trendingCache.data;
    }
    const url = `${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}`;
    const result = (await fetchAndTransformContent(url, 'movie')).slice(0, 12);
    if (result.length > 0) {
        trendingCache = { data: result, timestamp: now };
    }
    return result;
}

export async function getPopular(): Promise<Content[]> {
    const url = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`;
    return (await fetchAndTransformContent(url, 'movie')).slice(0, 12);
}

export async function getNewReleases(): Promise<Content[]> {
    const url = `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}`;
    return (await fetchAndTransformContent(url, 'movie')).slice(0, 12);
}

export async function getContentById(id: string, type?: 'movie' | 'tv', expectedKeywords?: string): Promise<Content | null> {
    const cacheKey = `${id}-${type || 'any'}-${expectedKeywords || ''}`;
    const now = Date.now();
    const cached = contentDetailCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL_LONG)) {
        return cached.data;
    }

    const manuallyAdded = await getManuallyAddedContent();
    const manualItem = manuallyAdded.find(c => String(c.id) === id);

    let apiContent: Content | null = null;

    if (type === 'tv') {
        apiContent = await fetchAndTransformSingleContent(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`, 'tv');
    } else if (type === 'movie') {
        apiContent = await fetchAndTransformSingleContent(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`, 'movie');
    } else {
        if (manualItem && manualItem.type) {
            apiContent = await fetchAndTransformSingleContent(`${TMDB_BASE_URL}/${manualItem.type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`, manualItem.type);
        } else {
            const [movieContent, tvContent] = await Promise.all([
                fetchAndTransformSingleContent(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`, 'movie'),
                fetchAndTransformSingleContent(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`, 'tv')
            ]);

            if (movieContent && tvContent && expectedKeywords) {
                const keywords = expectedKeywords.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2);
                const movieTitleLower = (movieContent.title || '').toLowerCase();
                const tvTitleLower = (tvContent.title || '').toLowerCase();

                const movieScore = keywords.reduce((acc, k) => acc + (movieTitleLower.includes(k) ? 1 : 0), 0);
                const tvScore = keywords.reduce((acc, k) => acc + (tvTitleLower.includes(k) ? 1 : 0), 0);

                if (tvScore > movieScore) {
                    apiContent = tvContent;
                } else if (movieScore > tvScore) {
                    apiContent = movieContent;
                } else {
                    apiContent = movieContent || tvContent;
                }
            } else {
                apiContent = movieContent || tvContent;
            }
        }
    }

    let finalResult: Content | null = null;
    if (manualItem) {
        finalResult = {
            ...(apiContent || {} as Content), // Base TMDB data
            ...manualItem, // Override with manual data
            id: manualItem.id, // Ensure manual ID is kept
            title: manualItem.title || apiContent?.title || 'No Title',
            description: manualItem.description || apiContent?.description || '',
            posterPath: manualItem.posterPath || apiContent?.posterPath || '',
            backdropPath: manualItem.backdropPath || apiContent?.backdropPath || '',
            genres: manualItem.genres?.length ? manualItem.genres : apiContent?.genres || [],
            releaseDate: manualItem.releaseDate || apiContent?.releaseDate || 'N/A',
            rating: manualItem.rating || apiContent?.rating || 0,
            type: manualItem.type || apiContent?.type || 'movie',
            runtime: manualItem.runtime || apiContent?.runtime,
            numberOfSeasons: manualItem.numberOfSeasons || apiContent?.numberOfSeasons,
            youtubeTrailerUrl: apiContent?.youtubeTrailerUrl, // Keep the TMDB trailer if manual doesn't provide one
            cast: apiContent?.cast || [],
            lastAirDate: apiContent?.lastAirDate,
        };
    } else {
        finalResult = apiContent;
    }

    contentDetailCache.set(cacheKey, { data: finalResult, timestamp: now });
    return finalResult;
}

export async function getContentByIds(ids: string[]): Promise<Content[]> {
    const contentPromises = ids.map(id => getContentById(id));
    const results = await Promise.all(contentPromises);
    return results.filter((item): item is Content => item !== null);
}

export async function searchContent(query: string): Promise<Content[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const now = Date.now();
    const cached = searchCache.get(normalizedQuery);
    if (cached && (now - cached.timestamp < CACHE_TTL_SHORT)) {
        return cached.data;
    }

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
    const results = await fetchAndTransformContent(url, 'movie');
    searchCache.set(normalizedQuery, { data: results, timestamp: now });
    return results;
}

export async function getBrowseContent({ genre, type, region, year }: { genre?: string; type?: 'movie' | 'tv'; region?: string; year?: string }): Promise<Content[]> {
    const cacheKey = `browse-${genre || ''}-${type || ''}-${region || ''}-${year || ''}`;
    const now = Date.now();
    const cached = browseCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL_SHORT)) {
        return cached.data;
    }

    const resolvedType = type || 'movie';
    let url = new URL(`${TMDB_BASE_URL}/discover/${resolvedType}`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    if (genre) {
        let genreId = genre;
        if (isNaN(Number(genre))) {
            const { genreList } = await fetchGenres();
            const found = genreList?.find(g => g.name.toLowerCase() === genre.toLowerCase());
            if (found) {
                genreId = String(found.id);
            }
        }
        if (!isNaN(Number(genreId))) {
            url.searchParams.append('with_genres', genreId);
        }
    }
    if (region) {
        url.searchParams.append('with_origin_country', region);
    }
    if (year) {
        if (resolvedType === 'movie') {
            url.searchParams.append('primary_release_year', year);
        } else {
            url.searchParams.append('first_air_date_year', year);
        }
    }

    url.searchParams.append('sort_by', 'popularity.desc');

    const results = await fetchAndTransformContent(url.toString(), resolvedType);
    browseCache.set(cacheKey, { data: results, timestamp: now });
    return results;
}

export async function getManuallyAddedContent(): Promise<Content[]> {
    try {
        // Import dynamically to avoid issues with server/client
        const { getContentFromFirestore } = await import('@/lib/firestore');
        return await getContentFromFirestore();
    } catch (error) {
        console.error('Failed to fetch manually added content:', error);
        return [];
    }
}

export async function getAllGenres(): Promise<Genre[]> {
    const { genreList: tmdbGenres } = await fetchGenres();
    const manualContent = await getManuallyAddedContent();

    // Extract unique genres from manual content
    const manualGenresSet = new Set<string>();
    manualContent.forEach(item => {
        item.genres?.forEach(g => {
            if (g && typeof g === 'string' && g.trim()) {
                manualGenresSet.add(g.trim());
            }
        });
    });

    const tmdbGenreNames = new Set(tmdbGenres?.map(g => g.name.toLowerCase()));

    // Create Genre objects for custom genres that are NOT in TMDB list
    const customGenres: Genre[] = [];
    manualGenresSet.forEach(gName => {
        if (!tmdbGenreNames.has(gName.toLowerCase())) {
            customGenres.push({ id: gName, name: gName });
        }
    });

    // Combine and deduplicate by name
    const seen = new Set<string>();
    const all: Genre[] = [];
    for (const g of [...(tmdbGenres || []), ...customGenres]) {
        const key = (g.name || '').toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            all.push(g);
        }
    }
    return all.sort((a, b) => a.name.localeCompare(b.name));
}
