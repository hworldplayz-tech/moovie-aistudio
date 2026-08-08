import { getContentById } from '@/lib/tmdb';
import { getSiteConfigFromFirestore, getContentBySlug } from '@/lib/firestore';
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


import type { Metadata } from 'next';

type WatchPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function resolveContentFromSlug(slug: string) {
  let manualItem = await getContentBySlug(slug);
  if (manualItem) {
    return { content: manualItem, manualItem };
  }

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

  const content = await getContentById(contentId, typeOverride, expectedKeywords);
  return { content, manualItem: null };
}

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
  const { content, manualItem } = await resolveContentFromSlug(slug);

  if (!content) {
    notFound();
  }

  const isTmdbOnly = !manualItem;

  // Combine tags
  const allTags = [
    ...(content.genres || []),
    ...(content.customTags || [])
  ];

  // The primary video source is the custom trailerUrl. If not present, fallback to youtube trailer.
  const primaryVideoSrc = content.trailerUrl || content.youtubeTrailerUrl;

  // Fetch secure download settings
  const { enabled: secureEnabled, globalEnabled } = await getSecureDownloadSettings();

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
                Content Request
              </Badge>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                "{content.title}" is available on request!
              </h2>
              <p className="text-sm text-muted-foreground">
                This title hasn't been uploaded to our library yet. Send an upload request to notify our team!
              </p>
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
              {content.languages?.map(lang => (
                <Badge key={lang} variant="secondary">{lang}</Badge>
              ))}
              {content.quality?.map(q => (
                <Badge key={q} variant="outline" className="border-primary/50">{q}</Badge>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
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

              {/* Request to Upload / Add Button placed right after Play Now / Watch Trailer */}
              <RequestUploadButton
                tmdbId={content.id}
                title={content.title}
                posterPath={content.posterPath}
                backdropPath={content.backdropPath}
                type={content.type}
                releaseDate={content.releaseDate}
                size="lg"
                variant={isTmdbOnly ? "default" : "outline"}
                className={isTmdbOnly ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium" : ""}
              />

              {/* Download Button Logic */
                (!isTmdbOnly && globalEnabled) && (
                  content.downloadLinks && content.downloadLinks.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="lg" variant="outline">
                          <Download className="mr-2 h-5 w-5" />
                          Download
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {content.downloadLinks.map((link, index) => {
                          const downloadHref = secureEnabled
                            ? `/download?id=${content.id}&index=${index}`
                            : link.url;
                          return (
                            <DropdownMenuItem key={index} asChild>
                              <Link href={downloadHref} target={secureEnabled ? "_self" : "_blank"} rel="noopener noreferrer" className="cursor-pointer font-medium">
                                {link.label || `Link ${index + 1}`}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    (content.downloadLink || (content.downloadLinks && content.downloadLinks.length === 1)) && (
                      <Button asChild size="lg" variant="outline">
                        <Link
                          href={secureEnabled
                            ? `/download?id=${content.id}`
                            : (content.downloadLink || (content.downloadLinks ? content.downloadLinks[0].url : '#'))}
                          target={secureEnabled ? "_self" : "_blank"}
                          rel="noopener noreferrer"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Download
                        </Link>
                      </Button>
                    )
                  ))
              }
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
      <CommentSection contentId={String(content.id)} />

      {/* Native Ad Below Content */}
      <div className="p-4 md:p-6 lg:p-8">
        <NativeAd position="watch_below_content" />
      </div>

      {/* Popup Handler - Shows after 30 seconds */}
      <PopupHandler trigger="time" delay={30} position="watch_popup" />
    </div >
  );
}
