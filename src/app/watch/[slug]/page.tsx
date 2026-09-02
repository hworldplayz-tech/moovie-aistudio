import { getContentById, getManuallyAddedContent } from '@/lib/tmdb';
import { getSiteConfigFromFirestore, getContentBySlug, resolveDownloadUrl } from '@/lib/firestore';
import { getSecureDownloadSettings } from '@/app/admin/actions';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VideoPlayer } from '@/components/video-player';
import { Badge } from '@/components/ui/badge';
import { Star, Play, Download, Youtube } from 'lucide-react';
import { CommentSection } from '@/components/comment-section';
import type { Content } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { CastSection } from '@/components/cast-section';
import { RelatedMoviesSection } from '@/components/related-movies-section';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { slugify } from "@/lib/utils";
import BannerAd from "@/components/ads/banner-ad";
import NativeAd from "@/components/ads/native-ad";
import PopupHandler from "@/components/ads/popup-handler";
import { RequestUploadButton } from "@/components/request-upload-button";
import { ViewCounter } from "@/components/view-counter";
import { SeriesEpisodeDownloads } from "@/components/series-episode-downloads";
import { cleanDownloadLabel } from "@/lib/harvester-utils";


import { cache } from 'react';
import type { Metadata } from 'next';

type WatchPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const resolveContentFromSlug = cache(async (slug: string) => {
  let typeOverride: 'movie' | 'tv' | undefined = undefined;
  let cleanSlug = slug;

  if (slug.startsWith('tv-')) {
    typeOverride = 'tv';
    cleanSlug = slug.slice(3);
  } else if (slug.startsWith('movie-')) {
    typeOverride = 'movie';
    cleanSlug = slug.slice(6);
  }

  const idMatch = cleanSlug.match(/^(\d+)/);
  const contentId = idMatch ? idMatch[1] : cleanSlug;
  const expectedKeywords = cleanSlug.replace(/^\d+[-_]?/, '');

  // 1. Instant check in memory cached manually added content (< 1ms)
  const manuallyAdded = await getManuallyAddedContent();

  const isMatch = (m: Content, targetId?: string, targetTitle?: string) => {
    if (!m) return false;
    const mId = String(m.id);
    const cleanMId = mId.replace(/^(movie|tv)-/, '');
    const cleanContentId = contentId.replace(/^(movie|tv)-/, '');
    
    if (
      mId === slug || 
      mId === cleanSlug || 
      mId === contentId || 
      cleanMId === cleanContentId ||
      (targetId && (mId === String(targetId) || cleanMId === String(targetId).replace(/^(movie|tv)-/, '')))
    ) {
      return true;
    }
    if (m.slug && (m.slug === slug || m.slug === cleanSlug)) {
      return true;
    }
    if (targetTitle && m.title && m.title.toLowerCase().trim() === targetTitle.toLowerCase().trim()) {
      return true;
    }
    return false;
  };

  let manualItem = manuallyAdded.find(c => isMatch(c)) || null;
  if (!manualItem) {
    manualItem = await getContentBySlug(slug);
  }

  let apiContent: Content | null = null;

  // 2. If manual item is already found with core data, only query TMDB with a non-blocking fast race
  if (manualItem && manualItem.title && manualItem.posterPath) {
    if (!manualItem.cast?.length || !manualItem.youtubeTrailerUrl) {
      try {
        // Fast non-blocking fetch with 1000ms max timeout
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
        apiContent = await Promise.race([
          getContentById(contentId, typeOverride || (manualItem.type as any), expectedKeywords),
          timeoutPromise
        ]);
      } catch {
        // Suppress timeout errors
      }
    }
  } else {
    // For TMDB-only items, fetch TMDB details
    apiContent = await getContentById(contentId, typeOverride, expectedKeywords);
    if (!manualItem && apiContent) {
      const apiItem = apiContent;
      manualItem = manuallyAdded.find(c => isMatch(c, String(apiItem.id), apiItem.title)) || null;
    }
  }

  let finalContent: Content | null = null;
  if (manualItem) {
    finalContent = {
      ...(apiContent || {} as Content),
      ...manualItem,
      id: manualItem.id || apiContent?.id || contentId,
      title: manualItem.title || apiContent?.title || 'Untitled',
      description: manualItem.description || apiContent?.description || '',
      posterPath: manualItem.posterPath || apiContent?.posterPath || '',
      backdropPath: manualItem.backdropPath || apiContent?.backdropPath || '',
      downloadLinks: (manualItem.downloadLinks && manualItem.downloadLinks.length > 0) 
        ? manualItem.downloadLinks 
        : (apiContent?.downloadLinks || []),
      seasons: (manualItem.seasons && manualItem.seasons.length > 0)
        ? manualItem.seasons
        : (apiContent?.seasons || []),
      downloadLink: manualItem.downloadLink || apiContent?.downloadLink,
      trailerUrl: manualItem.trailerUrl || apiContent?.trailerUrl,
      cast: (manualItem.cast && manualItem.cast.length > 0) ? manualItem.cast : (apiContent?.cast || []),
      inLibrary: true,
      isTmdbOnly: false,
    };
  } else if (apiContent) {
    finalContent = apiContent;
  }

  if (!finalContent) {
    return { content: null, manualItem: null, isTmdbOnly: true };
  }

  const hasDownloadLinks = !!(
    (finalContent.downloadLinks && finalContent.downloadLinks.length > 0) ||
    (finalContent.seasons && finalContent.seasons.length > 0) ||
    finalContent.downloadLink
  );

  const isInLibrary = !!(
    manualItem ||
    finalContent.inLibrary === true ||
    finalContent.isTmdbOnly === false ||
    hasDownloadLinks ||
    manuallyAdded.some(m => isMatch(m, String(finalContent.id), finalContent.title))
  );

  const isTmdbOnly = !isInLibrary;

  return { 
    content: finalContent, 
    manualItem: isInLibrary ? (manualItem || finalContent) : null,
    isTmdbOnly 
  };
});

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { content } = await resolveContentFromSlug(slug);
  const siteConfig = await getSiteConfigFromFirestore();

  if (!content) {
    return {
      title: 'Content Not Found',
    };
  }

  const siteTitle = siteConfig.siteTitle || 'Moovie';
  const keywords = siteConfig.titleSuffix || "Hindi Dubbed Dual Audio - 480p 720p 1080p";
  const seoTitle = `Watch or Download ${content.title} ${keywords} - ${siteTitle}`;
  const suffix = ` ${keywords}`;

  return {
    title: seoTitle,
    description: content.description,
    openGraph: {
      title: `${content.title}${suffix}`,
      description: content.description,
      images: [
        {
          url: content.posterPath,
          width: 500,
          height: 750,
          alt: content.title,
        },
        {
          url: content.backdropPath,
          width: 1280,
          height: 720,
          alt: content.title
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
      images: [content.posterPath],
    },
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { slug } = await params;
  const { content, isTmdbOnly } = await resolveContentFromSlug(slug);

  if (!content) {
    notFound();
  }

  // Combine and deduplicate tags
  const allTags = Array.from(new Set([
    ...(content.genres || []),
    ...(content.customTags || [])
  ]));

  // The primary video source is the custom trailerUrl. If not present, fallback to youtube trailer.
  const primaryVideoSrc = content.trailerUrl || content.youtubeTrailerUrl;

  // Fetch secure download settings
  const { enabled: secureEnabled, globalEnabled, filmyzillaLinksEnabled = true, mp4moviezLinksEnabled = true, activeMp4MoviezDomain = 'mp4moviez.trading' } = await getSecureDownloadSettings();

  // Helpers to check provider links
  const isFilmyzillaLink = (url?: string) => !!url && url.toLowerCase().includes('filmyzilla');
  const isMp4moviezLink = (url?: string) => !!url && (
    url.toLowerCase().includes('mp4moviez') ||
    (url.toLowerCase().includes('dl.php') && (url.toLowerCase().includes('id=') || url.toLowerCase().includes('jio=')))
  );

  // Filter and resolve download links if Filmyzilla or Mp4Moviez kill switch is OFF
  const rawDownloadLinks = content.downloadLinks || [];
  const activeDownloadLinks = rawDownloadLinks
    .filter(link => {
      if (!filmyzillaLinksEnabled && isFilmyzillaLink(link.url)) {
        return false;
      }
      if (!mp4moviezLinksEnabled && isMp4moviezLink(link.url)) {
        return false;
      }
      return true;
    })
    .map(link => ({
      ...link,
      url: resolveDownloadUrl(link.url, activeMp4MoviezDomain)
    }));

  let activeLegacyLink = content.downloadLink ? resolveDownloadUrl(content.downloadLink, activeMp4MoviezDomain) : undefined;
  if (!filmyzillaLinksEnabled && isFilmyzillaLink(activeLegacyLink)) {
    activeLegacyLink = undefined;
  }
  if (!mp4moviezLinksEnabled && isMp4moviezLink(activeLegacyLink)) {
    activeLegacyLink = undefined;
  }

  const hasDownloadButtons = activeDownloadLinks.length > 0 || !!activeLegacyLink;

  return (
    <div className="flex flex-col">
      {/* Banner Ad Above Player */}
      <BannerAd size="728x90" position="watch_above_player" className="mb-4" />

      <div id="player" className="relative w-full bg-black aspect-video flex items-center justify-center overflow-hidden">
        {primaryVideoSrc ? (
          <VideoPlayer src={primaryVideoSrc} />
        ) : (
          <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900/90 border border-amber-500/20">
            {content.backdropPath && (
              <div 
                className="absolute inset-0 opacity-25 bg-cover bg-center filter blur-sm"
                style={{ backgroundImage: `url(${content.backdropPath})` }}
              />
            )}
            <div className="relative z-10 max-w-lg space-y-3">
              <Badge variant="outline" className="border-amber-400/60 text-amber-400 bg-amber-400/10 px-3 py-1">
                {isTmdbOnly ? "Content Request" : "No Video Link"}
              </Badge>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {isTmdbOnly ? `"${content.title}" is available on request!` : content.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isTmdbOnly 
                  ? "This title hasn't been uploaded to our library yet. Send an upload request to notify our team!"
                  : "No video trailer link is available for this title."}
              </p>
              {isTmdbOnly && (
                <div className="pt-2">
                  <RequestUploadButton
                    tmdbId={content.id}
                    title={content.title}
                    posterPath={content.posterPath}
                    backdropPath={content.backdropPath}
                    type={content.type}
                    releaseDate={content.releaseDate}
                    size="lg"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 flex-wrap">
              <span>{content.title}</span>
              {isTmdbOnly && (
                <Badge variant="outline" className="border-amber-500 text-amber-500 text-xs">
                  Available on Request
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground text-sm flex-wrap">
              <span>{(content.releaseDate || 'N/A').split('-')[0]}</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span>{content.rating ? content.rating.toFixed(1) : 'N/A'}</span>
              </div>
              <Badge variant="outline" className="capitalize">{content.type}</Badge>
              {!content.languages?.length && content.isHindiDubbed && <Badge variant="secondary">Hindi Dubbed</Badge>}
              {content.languages?.map((lang, lIdx) => (
                <Badge key={`${lang}-${lIdx}`} variant="secondary">{lang}</Badge>
              ))}
              {content.quality?.map((q, qIdx) => (
                <Badge key={`${q}-${qIdx}`} variant="outline" className="border-primary/50">{q}</Badge>
              ))}
              <ViewCounter itemId={content.id} type={content.type} initialViews={content.viewsCount || 0} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {allTags.map((tag, tIdx) => (
                <Badge key={`${tag}-${tIdx}`} variant="secondary">{tag}</Badge>
              ))}
            </div>
            <p className="mt-6 text-foreground/80 leading-relaxed">
              {content.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:gap-4 items-center">
              {content.trailerUrl && (
                <Button asChild size="lg">
                  <Link href="#player">
                    <Play className="mr-2 h-5 w-5" />
                    Play Now
                  </Link>
                </Button>
              )}
              {!content.trailerUrl && content.youtubeTrailerUrl && (
                <Button asChild size="lg">
                  <Link href="#player">
                    <Youtube className="mr-2 h-5 w-5" />
                    Watch Trailer
                  </Link>
                </Button>
              )}

              {/* Request to Upload Button - ONLY for TMDB items NOT in library */}
              {isTmdbOnly && (
                <RequestUploadButton
                  tmdbId={content.id}
                  title={content.title}
                  posterPath={content.posterPath}
                  backdropPath={content.backdropPath}
                  type={content.type}
                  releaseDate={content.releaseDate}
                  size="lg"
                  variant="default"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium"
                />
              )}

              {/* Download Button Logic - FOR ITEMS IN LIBRARY */}
              {!isTmdbOnly && globalEnabled && (
                content.seasons && content.seasons.length > 0 ? (
                  <SeriesEpisodeDownloads
                    content={content}
                    secureEnabled={secureEnabled}
                    filmyzillaLinksEnabled={filmyzillaLinksEnabled}
                    mp4moviezLinksEnabled={mp4moviezLinksEnabled}
                  />
                ) : hasDownloadButtons ? (
                  activeDownloadLinks.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="lg" variant="outline" className="font-semibold">
                          <Download className="mr-2 h-5 w-5" />
                          Download
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {activeDownloadLinks.map((link, index) => {
                          const origIndex = content.downloadLinks?.findIndex(l => l.url === link.url) ?? index;
                          const downloadHref = secureEnabled
                            ? `/download?id=${content.id}&index=${origIndex >= 0 ? origIndex : index}`
                            : link.url;
                          return (
                            <DropdownMenuItem key={index} asChild>
                              <Link href={downloadHref} target={secureEnabled ? "_self" : "_blank"} rel="noopener noreferrer" className="cursor-pointer font-medium">
                                {cleanDownloadLabel(link.label) || `Download (${index + 1})`}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button asChild size="lg" variant="outline" className="font-semibold">
                      <Link
                        href={secureEnabled
                          ? `/download?id=${content.id}${activeDownloadLinks.length === 1 ? `&index=${content.downloadLinks?.findIndex(l => l.url === activeDownloadLinks[0].url) ?? 0}` : ''}`
                          : (activeLegacyLink || (activeDownloadLinks.length > 0 ? activeDownloadLinks[0].url : '#'))}
                        target={secureEnabled ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Download
                      </Link>
                    </Button>
                  )
                ) : (
                  <Button size="lg" variant="outline" disabled className="font-semibold opacity-80">
                    <Download className="mr-2 h-5 w-5" />
                    No Download Link
                  </Button>
                )
              )}
              <ShareButton title={content.title} url={`/watch/${slug}`} />
            </div>

            {/* Disclaimer Note */}
            <div className="mt-6 md:mt-8 p-4 bg-muted/50 rounded-lg border border-border/50 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Disclaimer:</strong> Moovie does not host any file on its servers. All files or contents hosted on third-party websites. Moovie accepts no responsibility for content hosted on third-party websites. We are just indexing those links which are already available on the internet.
              </p>
            </div>
          </div>

          <div className="w-full max-w-[200px] md:max-w-none mx-auto md:mx-0 order-first md:order-last">
            <Image
              src={content.posterPath}
              alt={content.title}
              width={500}
              height={750}
              className="rounded-lg shadow-lg w-auto h-auto"
              data-ai-hint="movie poster"
            />
          </div>
        </div>
      </div>


      {/* Disclaimer Note */}


      {
        content.cast && content.cast.length > 0 && (
          <>
            <Separator />
            <CastSection cast={content.cast} />
          </>
        )
      }

      <Separator />
      <RelatedMoviesSection currentContent={content} />

      <Separator />
      <CommentSection
        contentId={String(content.id)}
        contentTitle={content.title}
        contentType={content.type}
      />

      {/* Native Ad Below Content */}
      <div className="p-4 md:p-6 lg:p-8">
        <NativeAd position="watch_below_content" />
      </div>

      {/* JSON-LD Schema Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": content.type === 'tv' ? "TVSeries" : "Movie",
            "name": content.title,
            "description": content.description,
            "image": content.posterPath,
            "datePublished": content.releaseDate !== 'N/A' ? content.releaseDate : undefined,
            "aggregateRating": content.rating ? {
              "@type": "AggregateRating",
              "ratingValue": content.rating,
              "bestRating": "10",
              "worstRating": "1",
              "ratingCount": 100
            } : undefined,
            "genre": content.genres,
            "actor": content.cast?.map(c => ({
              "@type": "Person",
              "name": c.name
            }))
          })
        }}
      />

      {/* Popup Handler - Shows after 30 seconds */}
      <PopupHandler trigger="time" delay={30} position="watch_popup" />
    </div >
  );
}
