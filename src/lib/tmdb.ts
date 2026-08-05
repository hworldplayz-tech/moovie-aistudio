
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

let genreMap: Map<number | string, string> | null = null;
let genreList: Genre[] | null = null;

async function fetchGenres() {
    if (genreMap) return { genreMap, genreList };
    try {
        const movieResponse = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`);
        const tvResponse = await fetch(`${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}`);
        const movieData = await movieResponse.json();
        const tvData = await tvResponse.json();

        const allGenres: Genre[] = [...movieData.genres, ...tvData.genres];
        const uniqueGenres = Array.from(new Map(allGenres.map(g => [g.id, g])).values());

        genreList = uniqueGenres;
        genreMap = new Map();
        uniqueGenres.forEach(genre => {
            genreMap!.set(genre.id, genre.name);
        });
        return { genreMap, genreList };
    } catch (error) {
        console.error('Failed to fetch genres:', error);
        return { genreMap: new Map(), genreList: [] };
    }
}

// ... (existing code intermediate skipped for brevity if not changing, but here I am modifying types so I should be careful)
// Actually I need to replace the TYPE definition at top too.

// Let's replace the whole top section first?
// Or just the chunks.

// I'll replace the Genre type definition first.



function tmdbContentToContent(item: TmdbContent, type: 'movie' | 'tv' | 'person', allGenres: Map<number, string>): Content | null {
    if (type === 'person') return null;
    const itemType = item.media_type || type;
    if (itemType === 'person') return null;

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

async function fetchAndTransformContent(url: string, type: 'movie' | 'tv' | 'person' = 'movie') {
    const { genreMap: allGenres } = await fetchGenres();
    try {
        const response = await fetch(url);
        const data = await response.json();
        const results = (data.results || [data]) as TmdbContent[];

        return results
            .map(item => tmdbContentToContent(item, item.media_type || type, allGenres))
            .filter((item): item is Content => item !== null);
    } catch (error) {
        console.error(`Failed to fetch from ${url}:`, error);
        return [];
    }
}

async function fetchAndTransformSingleContent(url: string, type: 'movie' | 'tv') {
    const { genreMap: allGenres } = await fetchGenres();
    try {
        const response = await fetch(url);
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
    } catch (error) {
        console.error(`Failed to fetch from ${url}:`, error);
        return null;
    }
}


export async function getFeatured(): Promise<Content | null> {
    const content = await getTrending();
    return content[0] || null;
}

export async function getTrending(): Promise<Content[]> {
    const url = `${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}`;
    return (await fetchAndTransformContent(url, 'movie')).slice(0, 12);
}

export async function getPopular(): Promise<Content[]> {
    const url = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`;
    return (await fetchAndTransformContent(url, 'movie')).slice(0, 12);
}

export async function getNewReleases(): Promise<Content[]> {
    const url = `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}`;
    return (await fetchAndTransformContent(url, 'movie')).slice(0, 12);
}

export async function getContentById(id: string, type?: 'movie' | 'tv'): Promise<Content | null> {
    const manuallyAdded = await getManuallyAddedContent();
    const manualItem = manuallyAdded.find(c => String(c.id) === id);

    let apiContent: Content | null = null;

    if (type === 'movie' || !type) {
        let movieContent = await fetchAndTransformSingleContent(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`, 'movie');
        if (movieContent) {
            apiContent = movieContent;
        }
    }

    // If explicit type is tv, OR if (no type was specified AND we didn't find a movie), try TV
    if (!apiContent && (type === 'tv' || !type)) {
        let tvContent = await fetchAndTransformSingleContent(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`, 'tv');
        if (tvContent) {
            apiContent = tvContent;
        }
    }

    if (manualItem) {
        return {
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
    }

    return apiContent;
}

export async function getContentByIds(ids: string[]): Promise<Content[]> {
    const contentPromises = ids.map(id => getContentById(id));
    const results = await Promise.all(contentPromises);
    return results.filter((item): item is Content => item !== null);
}

export async function searchContent(query: string): Promise<Content[]> {
    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
    return await fetchAndTransformContent(url, 'movie');
}

export async function getBrowseContent({ genre, type, region, year }: { genre?: string; type?: 'movie' | 'tv'; region?: string; year?: string }): Promise<Content[]> {
    const resolvedType = type || 'movie';
    let url = new URL(`${TMDB_BASE_URL}/discover/${resolvedType}`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    if (genre) {
        // Resolve genre name to ID if possible
        let genreId = genre;
        // If genre is not a number, try to find ID from name
        if (isNaN(Number(genre))) {
            const { genreList } = await fetchGenres();
            const found = genreList?.find(g => g.name.toLowerCase() === genre.toLowerCase());
            if (found) {
                genreId = String(found.id);
            }
        }

        // If we found an ID (or it was already an ID), use it. 
        // If it's a custom genre (no ID found), we can't filter via TMDB API 'with_genres' easily unless we send nothing and filter locally (which is what page.tsx does for manual).
        // However, if we don't send 'with_genres', we get ALL results.
        // It's better to NOT send with_genres if it's a custom genre, and rely on local filtering (but local filtering only filters MANUAL content).
        // TMDB discover API doesn't support "custom tags".
        // So for custom genres, we probably shouldn't fetch from TMDB discover at all?
        // But getBrowseContent is for TMDB content.
        // If genreId is strictly numeric (standard TMDB genre), we append it.
        // If it's not numeric (custom), we append nothing (so we fetch basic popular/discover) OR we return empty?

        // Current behavior: if we pass "Pakistani Drama" to TMDB with_genres, it might error or ignore.
        // Let's only append if it's numeric/resolved.
        if (!isNaN(Number(genreId))) {
            url.searchParams.append('with_genres', genreId);
        }
    }
    if (region) {
        // Use with_origin_country for filtering by country of production
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

    return await fetchAndTransformContent(url.toString(), resolvedType);
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
        item.genres?.forEach(g => manualGenresSet.add(g));
    });

    const tmdbGenreNames = new Set(tmdbGenres?.map(g => g.name.toLowerCase()));

    // Create Genre objects for custom genres that are NOT in TMDB list
    const customGenres: Genre[] = [];
    manualGenresSet.forEach(gName => {
        if (!tmdbGenreNames.has(gName.toLowerCase())) {
            // Check if it's not already in customGenres (set handles unique strings, but case sensitivity...)
            // Just use the name as ID for custom genres
            customGenres.push({ id: gName, name: gName });
        }
    });

    // Combine and sort
    const all = [...(tmdbGenres || []), ...customGenres];
    return all.sort((a, b) => a.name.localeCompare(b.name));
}
