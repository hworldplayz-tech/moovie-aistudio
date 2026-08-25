'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, ChevronDown } from 'lucide-react';
import type { Content, SeasonData, EpisodeDownload, DownloadLink } from '@/lib/definitions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SeriesEpisodeDownloadsProps {
  content: Content;
  secureEnabled?: boolean;
  filmyzillaLinksEnabled?: boolean;
  mp4moviezLinksEnabled?: boolean;
}

export function SeriesEpisodeDownloads({
  content,
  secureEnabled = true,
  filmyzillaLinksEnabled = true,
  mp4moviezLinksEnabled = true,
}: SeriesEpisodeDownloadsProps) {
  const seasons: SeasonData[] = content.seasons || [];

  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);
  // Default to -1 so no episode is pre-selected
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState<number>(-1);

  if (!seasons || seasons.length === 0) {
    return null;
  }

  const currentSeason: SeasonData | undefined = seasons[selectedSeasonIdx] || seasons[0];
  const episodes: EpisodeDownload[] = currentSeason?.episodes || [];
  const currentEpisode: EpisodeDownload | undefined =
    selectedEpisodeIdx >= 0 && selectedEpisodeIdx < episodes.length
      ? episodes[selectedEpisodeIdx]
      : undefined;

  // Helper to filter out killed links
  const isLinkActive = (url?: string) => {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    if (!filmyzillaLinksEnabled && urlLower.includes('filmyzilla')) return false;
    if (!mp4moviezLinksEnabled && (
      urlLower.includes('mp4moviez') ||
      (urlLower.includes('dl.php') && (urlLower.includes('id=') || urlLower.includes('jio=')))
    )) return false;
    return true;
  };

  // Get download links for current episode (if an episode is chosen)
  const rawEpisodeLinks: DownloadLink[] = currentEpisode
    ? (currentEpisode.downloadLinks && currentEpisode.downloadLinks.length > 0)
      ? currentEpisode.downloadLinks
      : (currentEpisode.downloadLink ? [{ label: 'Download', url: currentEpisode.downloadLink }] : [])
    : [];
  const activeEpisodeLinks = rawEpisodeLinks.filter(l => isLinkActive(l.url));

  // Get zip pack links for current season
  const rawZipLinks: DownloadLink[] = currentSeason?.zipPackLinks || [];
  const activeZipLinks = rawZipLinks.filter(l => isLinkActive(l.url));

  const getEpisodeHref = (linkIndex: number, linkUrl: string) => {
    if (secureEnabled && currentEpisode) {
      return `/download?id=${encodeURIComponent(content.id)}&type=series&season=${currentSeason.seasonNumber}&episode=${currentEpisode.episodeNumber}&linkIndex=${linkIndex}`;
    }
    return linkUrl || '#';
  };

  const getZipHref = (linkIndex: number, linkUrl: string) => {
    if (secureEnabled) {
      return `/download?id=${encodeURIComponent(content.id)}&type=zip&season=${currentSeason.seasonNumber}&linkIndex=${linkIndex}`;
    }
    return linkUrl || '#';
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* 1. Season Selector: If only 1 season, show a clean pill without dropdown arrow. If multiple, show dropdown */}
      {seasons.length > 1 ? (
        <div className="relative inline-block">
          <select
            id="season-selector"
            value={selectedSeasonIdx}
            onChange={(e) => {
              const nextIdx = parseInt(e.target.value, 10) || 0;
              setSelectedSeasonIdx(nextIdx);
              setSelectedEpisodeIdx(-1); // Reset episode selection on season change
            }}
            className="h-10 sm:h-11 pl-3.5 pr-9 rounded-lg border border-input bg-background/90 text-foreground font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer appearance-none"
          >
            {seasons.map((s, idx) => (
              <option key={idx} value={idx} className="bg-popover text-popover-foreground">
                {s.seasonTitle || `Season ${s.seasonNumber}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
        </div>
      ) : (
        <div className="h-10 sm:h-11 px-3.5 flex items-center rounded-lg border border-input bg-background/90 text-foreground font-semibold text-xs sm:text-sm shadow-sm select-none">
          {seasons[0].seasonTitle || `Season ${seasons[0].seasonNumber}`}
        </div>
      )}

      {/* 2. Episode Dropdown */}
      <div className="relative inline-block">
        <select
          id="episode-selector"
          value={selectedEpisodeIdx}
          onChange={(e) => setSelectedEpisodeIdx(parseInt(e.target.value, 10))}
          disabled={episodes.length === 0}
          className="h-10 sm:h-11 pl-3.5 pr-9 rounded-lg border border-input bg-background/90 text-foreground font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer appearance-none disabled:opacity-50"
        >
          <option value={-1} className="bg-popover text-popover-foreground">
            {episodes.length === 0 ? 'No Episodes Available' : 'Select Episode'}
          </option>
          {episodes.map((ep, idx) => (
            <option key={idx} value={idx} className="bg-popover text-popover-foreground">
              Episode {ep.episodeNumber}{ep.episodeTitle ? `: ${ep.episodeTitle}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
      </div>

      {/* 3. Episode Download Button(s) / Quality Options - ONLY SHOWN WHEN AN EPISODE IS SELECTED */}
      {selectedEpisodeIdx >= 0 && currentEpisode && (
        activeEpisodeLinks.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {activeEpisodeLinks.map((link, lIdx) => (
              <Button
                key={lIdx}
                asChild
                size="lg"
                variant="outline"
                className="h-10 sm:h-11 font-semibold text-xs sm:text-sm border-primary/40 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
              >
                <Link
                  href={getEpisodeHref(lIdx, link.url)}
                  target={secureEnabled ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  {link.label || `Download (${lIdx + 1})`}
                </Link>
              </Button>
            ))}
          </div>
        ) : activeEpisodeLinks.length === 1 ? (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-10 sm:h-11 font-semibold text-xs sm:text-sm border-primary/40 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
          >
            <Link
              href={getEpisodeHref(0, activeEpisodeLinks[0].url)}
              target={secureEnabled ? "_self" : "_blank"}
              rel="noopener noreferrer"
            >
              <Download className="mr-1.5 h-4 w-4" />
              {activeEpisodeLinks[0].label && activeEpisodeLinks[0].label !== 'Download'
                ? activeEpisodeLinks[0].label
                : `Download EP ${currentEpisode.episodeNumber}`}
            </Link>
          </Button>
        ) : (
          <Button size="lg" variant="outline" disabled className="h-10 sm:h-11 font-semibold text-xs sm:text-sm opacity-70">
            <Download className="mr-1.5 h-4 w-4" />
            No Link Available
          </Button>
        )
      )}

      {/* 4. Complete Season ZIP Pack (if configured for this season) */}
      {activeZipLinks.length > 0 && (
        activeZipLinks.length === 1 ? (
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-10 sm:h-11 font-semibold text-xs sm:text-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 shadow-sm"
          >
            <Link
              href={getZipHref(0, activeZipLinks[0].url)}
              target={secureEnabled ? "_self" : "_blank"}
              rel="noopener noreferrer"
            >
              <FileArchive className="mr-1.5 h-4 w-4" />
              {activeZipLinks[0].label || `Season ${currentSeason.seasonNumber} ZIP`}
            </Link>
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                variant="secondary"
                className="h-10 sm:h-11 font-semibold text-xs sm:text-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 shadow-sm"
              >
                <FileArchive className="mr-1.5 h-4 w-4" />
                <span>Season {currentSeason.seasonNumber} ZIP Pack</span>
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {activeZipLinks.map((zLink, zIdx) => (
                <DropdownMenuItem key={zIdx} asChild>
                  <Link
                    href={getZipHref(zIdx, zLink.url)}
                    target={secureEnabled ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    className="cursor-pointer font-medium text-xs sm:text-sm"
                  >
                    {zLink.label || `Complete Season ZIP (${zIdx + 1})`}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
    </div>
  );
}
