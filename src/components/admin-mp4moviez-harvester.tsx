'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Download,
  FileJson,
  FileSpreadsheet,
  Film,
  Tv,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  Sparkles,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  Code,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import {
  harvestMp4moviezBatchAction,
  importHarvestedMovieAction,
  batchImportHarvestedMoviesAction,
  updateActiveMp4MoviezDomain,
  getSecureDownloadSettings,
  type HarvestedMovieGroup,
  type HarvestRawItem
} from '@/app/admin/actions';
import { cleanHarvesterTitle, cleanDownloadLabel } from '@/lib/harvester-utils';
import { HarvestedLibraryManager } from '@/components/harvested-library-manager';
import Image from 'next/image';

export default function AdminMp4moviezHarvester() {
  const { toast } = useToast();

  // Configuration State
  const [domain, setDomain] = useState<string>('mp4moviez.trading');
  const [isSavingDomain, setIsSavingDomain] = useState<boolean>(false);
  const [startId, setStartId] = useState<number>(59410);
  const [endId, setEndId] = useState<number>(59430);
  const [chunkSize, setChunkSize] = useState<number>(10);
  const [delayMs, setDelayMs] = useState<number>(400);
  const [enrichWithTmdb, setEnrichWithTmdb] = useState<boolean>(true);
  const [requireTmdbMatch, setRequireTmdbMatch] = useState<boolean>(true);

  // Execution State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentScanningId, setCurrentScanningId] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Data State
  const [rawLogs, setRawLogs] = useState<HarvestRawItem[]>([]);
  const [groupedMovies, setGroupedMovies] = useState<HarvestedMovieGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [importingMovieKey, setImportingMovieKey] = useState<string | null>(null);
  const [isBatchImporting, setIsBatchImporting] = useState<boolean>(false);
  const [libraryRefreshTrigger, setLibraryRefreshTrigger] = useState<number>(0);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    processed: number;
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const stopBatchImportRef = useRef<boolean>(false);

  // Pagination State (Prevents UI lockup on massive 3,000+ movie catalogs)
  const [moviePage, setMoviePage] = useState<number>(1);
  const [moviePageSize, setMoviePageSize] = useState<number>(24);
  const [rawLogsPage, setRawLogsPage] = useState<number>(1);
  const [rawLogsPageSize, setRawLogsPageSize] = useState<number>(50);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset page to 1 when search filter changes
  useEffect(() => {
    setMoviePage(1);
  }, [searchQuery]);

  // Load configured domain on mount
  useEffect(() => {
    getSecureDownloadSettings().then(cfg => {
      if (cfg.activeMp4MoviezDomain) {
        setDomain(cfg.activeMp4MoviezDomain);
      }
    }).catch(console.warn);
  }, []);

  const handleSaveActiveDomain = async () => {
    if (!domain.trim()) return;
    setIsSavingDomain(true);
    try {
      const res = await updateActiveMp4MoviezDomain(domain);
      if (res.success) {
        toast({
          title: 'Active Domain Saved!',
          description: `All Mp4Moviez download links are now dynamically mapped to "${domain}".`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Save Domain',
          description: res.error || 'Could not update active domain.'
        });
      }
    } finally {
      setIsSavingDomain(false);
    }
  };

  // Helper to parse scraped TXT format (PAGE TITLE : ... \n PAGE URL : ... \n - https://...)
  const parseScrapedTxtFormat = (txt: string): any[] => {
    const blocks = txt.split(/={10,}/);
    const results: any[] = [];

    for (const block of blocks) {
      const titleMatch = block.match(/PAGE TITLE\s*:\s*(.+)/i);
      const urlMatch = block.match(/PAGE URL\s*:\s*(.+)/i);
      const linkMatches = Array.from(block.matchAll(/\s*-\s*(https?:\/\/[^\s]+)/g)).map(m => m[1]);

      if (titleMatch || linkMatches.length > 0) {
        const title = titleMatch ? titleMatch[1].trim() : 'Unknown Movie';
        const pageUrl = urlMatch ? urlMatch[1].trim() : '';
        if (linkMatches.length > 0) {
          results.push({
            title,
            page_url: pageUrl,
            download_links: linkMatches
          });
        }
      }
    }
    return results;
  };

  // Handle Uploading JSON or TXT generated by the scraper tool
  const handleUploadJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawContent = (event.target?.result as string) || '';
        let moviesList: any[] = [];

        // Try JSON parsing first
        try {
          const parsed = JSON.parse(rawContent);
          if (Array.isArray(parsed)) {
            moviesList = parsed;
          } else if (parsed.movies && Array.isArray(parsed.movies)) {
            moviesList = parsed.movies;
          } else if (parsed.items && Array.isArray(parsed.items)) {
            moviesList = parsed.items;
          }
        } catch {
          // If not JSON, try parsing as TXT format
          moviesList = parseScrapedTxtFormat(rawContent);
        }

        if (moviesList.length === 0) {
          throw new Error('Could not find movie entries. Please upload a valid .json or .txt scraped catalog.');
        }

        // Merge duplicate titles and consolidate multi-quality links, seasons & episodes
        const groupMap = new Map<string, HarvestedMovieGroup>();

        for (let idx = 0; idx < moviesList.length; idx++) {
          const m = moviesList[idx];
          const rawTitle = m.title || m.cleanTitle || m.name || `Movie-${idx + 1}`;
          const { cleanTitle, year, languageTags, isTvSeries, seasonNumber, episodeNumber, isCompleteSeason } = cleanHarvesterTitle(rawTitle);
          const typePrefix = isTvSeries ? 'tv' : 'movie';
          const groupKey = `${typePrefix}_${cleanTitle.toLowerCase().trim()}_${year || 'na'}`;

          const rawLinks = m.download_links || m.downloadLinks || m.links || m.qualities || [];
          const links = rawLinks.map((l: any, lIdx: number) => {
            const urlStr = typeof l === 'string' ? l : (l.url || '');
            let quality = '720p';
            const qMatch = urlStr.match(/[?&]q=(\d+)/i);
            if (qMatch) {
              quality = `${qMatch[1]}p`;
            } else if (typeof l === 'object' && l.quality) {
              quality = l.quality;
            }

            const idMatch = urlStr.match(/[?&]id=(\d+)/i);
            const linkId = idMatch ? parseInt(idMatch[1], 10) : (50000 + idx * 10 + lIdx);
            const jioServer = urlStr.includes('jio=yes') ? 'yes' : undefined;

            return {
              id: linkId,
              quality,
              url: urlStr,
              rawTitle,
              jioServer
            };
          }).filter((l: any) => l.url);

          if (links.length === 0) continue;

          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              key: groupKey,
              cleanTitle,
              rawTitleSample: rawTitle,
              year,
              languageTags: [...languageTags],
              isTvSeries,
              links: [],
              seasons: isTvSeries ? [] : undefined,
              imported: false
            });
          }

          const existing = groupMap.get(groupKey)!;

          // Merge flat links
          for (const l of links) {
            if (!existing.links.some(el => el.url === l.url)) {
              existing.links.push(l);
            }
          }

          // Merge languages
          languageTags.forEach(t => {
            if (!existing.languageTags.includes(t)) existing.languageTags.push(t);
          });

          // TV Series: consolidate into seasons and episodes
          if (existing.isTvSeries) {
            if (!existing.seasons) existing.seasons = [];
            const sNum = seasonNumber || 1;
            let sObj = existing.seasons.find(s => s.seasonNumber === sNum);
            if (!sObj) {
              sObj = {
                seasonNumber: sNum,
                seasonTitle: `Season ${sNum}`,
                zipPackLinks: [],
                episodes: []
              };
              existing.seasons.push(sObj);
            }

            for (const l of links) {
              const cleanLabel = cleanDownloadLabel(l.quality);
              if (isCompleteSeason) {
                if (!sObj.zipPackLinks) sObj.zipPackLinks = [];
                if (!sObj.zipPackLinks.some(z => z.url === l.url)) {
                  sObj.zipPackLinks.push({ label: cleanLabel, url: l.url });
                }
              } else {
                const epNum = episodeNumber || 1;
                let epObj = sObj.episodes.find(e => e.episodeNumber === epNum);
                if (!epObj) {
                  epObj = {
                    episodeNumber: epNum,
                    episodeTitle: `Episode ${epNum}`,
                    downloadLinks: []
                  };
                  sObj.episodes.push(epObj);
                }
                if (!epObj.downloadLinks) epObj.downloadLinks = [];
                if (!epObj.downloadLinks.some(dl => dl.url === l.url)) {
                  epObj.downloadLinks.push({ label: cleanLabel, url: l.url });
                }
              }
            }
          }
        }

        // Post-sort seasons and episodes
        for (const group of groupMap.values()) {
          if (group.seasons) {
            group.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
            let totalEps = 0;
            for (const s of group.seasons) {
              s.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
              totalEps += s.episodes.length;
            }
            group.totalEpisodesCount = totalEps;
          }
        }

        const formattedGroups = Array.from(groupMap.values());

        if (formattedGroups.length === 0) {
          throw new Error('No valid movies with download links were found in the uploaded file.');
        }

        setGroupedMovies(formattedGroups);
        setMoviePage(1);
        toast({
          title: 'Scraped File Loaded Successfully!',
          description: `Consolidated ${formattedGroups.length} unique titles with ${formattedGroups.reduce((acc, m) => acc + m.links.length, 0)} download links from "${file.name}".`
        });
      } catch (err: any) {
        console.error('File upload error:', err);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: err?.message || 'Could not parse the file.'
        });
      }
    };

    reader.readAsText(file);
    // Reset file input so user can re-upload if needed
    e.target.value = '';
  };

  // Refs for worker loop control
  const stopRequestedRef = useRef<boolean>(false);
  const pauseRequestedRef = useRef<boolean>(false);
  const isScanningRef = useRef<boolean>(false);

  // Sync ref with state
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  const totalIdsToScan = useMemo(() => {
    return Math.max(1, endId - startId + 1);
  }, [startId, endId]);

  const stats = useMemo(() => {
    const totalScanned = rawLogs.length;
    const foundCount = rawLogs.filter(i => i.status === 'found').length;
    const deadCount = rawLogs.filter(i => i.status === 'not_found').length;
    const errorCount = rawLogs.filter(i => i.status === 'error').length;
    const totalLinks = groupedMovies.reduce((acc, m) => acc + m.links.length, 0);
    const importedCount = groupedMovies.filter(m => m.imported).length;

    return {
      totalScanned,
      foundCount,
      deadCount,
      errorCount,
      totalMovies: groupedMovies.length,
      totalLinks,
      importedCount
    };
  }, [rawLogs, groupedMovies]);

  // Filtered grouped movies for search
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return groupedMovies;
    const q = searchQuery.toLowerCase().trim();
    return groupedMovies.filter(m =>
      m.cleanTitle.toLowerCase().includes(q) ||
      m.rawTitleSample.toLowerCase().includes(q) ||
      (m.year && m.year.includes(q)) ||
      m.languageTags.some(t => t.toLowerCase().includes(q)) ||
      m.links.some(l => l.quality.toLowerCase().includes(q) || String(l.id).includes(q))
    );
  }, [groupedMovies, searchQuery]);

  // Quick range helpers
  const handleSetQuickRange = (count: number) => {
    setEndId(startId + count - 1);
  };

  const handleTestSingleId = (idNum: number) => {
    setStartId(idNum);
    setEndId(idNum);
  };

  // Main Harvester Loop
  const startHarvesting = async () => {
    if (startId > endId) {
      toast({
        variant: 'destructive',
        title: 'Invalid Range',
        description: 'Start ID cannot be greater than End ID.'
      });
      return;
    }

    stopRequestedRef.current = false;
    pauseRequestedRef.current = false;
    setIsScanning(true);
    setIsPaused(false);
    setProgressPercent(0);

    let currentCursor = startId;
    let localGroups: HarvestedMovieGroup[] = [...groupedMovies];
    let localLogs: HarvestRawItem[] = [...rawLogs];

    toast({
      title: 'Harvester Started',
      description: `Scanning Mp4Moviez IDs ${startId} to ${endId} from ${domain}...`
    });

    try {
      while (currentCursor <= endId && !stopRequestedRef.current) {
        // Handle Pause Loop
        while (pauseRequestedRef.current && !stopRequestedRef.current) {
          await new Promise(r => setTimeout(r, 300));
        }

        if (stopRequestedRef.current) break;

        const batchStart = currentCursor;
        const batchEnd = Math.min(endId, batchStart + chunkSize - 1);
        setCurrentScanningId(batchStart);

        // Fetch batch
        const response = await harvestMp4moviezBatchAction({
          domain,
          startId: batchStart,
          endId: batchEnd,
          enrichWithTmdb
        });

        if (response.success) {
          // Merge Raw Logs
          localLogs = [...localLogs, ...response.rawItems];
          setRawLogs([...localLogs]);

          // Merge Grouped Movies
          for (const newGroup of response.groupedMovies) {
            const existingIdx = localGroups.findIndex(g => g.key === newGroup.key);
            if (existingIdx >= 0) {
              const existing = localGroups[existingIdx];
              // Merge links
              const mergedLinks = [...existing.links];
              for (const l of newGroup.links) {
                if (!mergedLinks.some(ml => ml.id === l.id)) {
                  mergedLinks.push(l);
                }
              }
              // Merge tags
              const mergedTags = Array.from(new Set([...existing.languageTags, ...newGroup.languageTags]));
              localGroups[existingIdx] = {
                ...existing,
                links: mergedLinks,
                languageTags: mergedTags,
                tmdbMatch: existing.tmdbMatch || newGroup.tmdbMatch
              };
            } else {
              localGroups.push(newGroup);
            }
          }

          setGroupedMovies([...localGroups]);

          // Update Progress
          const scannedSoFar = Math.min(totalIdsToScan, batchEnd - startId + 1);
          const percent = Math.round((scannedSoFar / totalIdsToScan) * 100);
          setProgressPercent(percent);
        } else {
          toast({
            variant: 'destructive',
            title: `Batch Error (IDs ${batchStart}-${batchEnd})`,
            description: response.error || 'Failed to scan batch'
          });
        }

        currentCursor = batchEnd + 1;

        // Rate limit delay
        if (delayMs > 0 && currentCursor <= endId && !stopRequestedRef.current) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }

      if (stopRequestedRef.current) {
        toast({
          title: 'Harvester Stopped',
          description: `Stopped scanning. Processed ${localLogs.length} IDs.`
        });
      } else {
        setProgressPercent(100);
        toast({
          title: 'Harvesting Completed!',
          description: `Identified ${localGroups.length} movies with ${localLogs.filter(i => i.status === 'found').length} active download links.`
        });
      }
    } catch (err: any) {
      console.error('Harvester error:', err);
      toast({
        variant: 'destructive',
        title: 'Harvester Interrupted',
        description: err?.message || 'An unexpected error occurred during harvesting.'
      });
    } finally {
      setIsScanning(false);
      setIsPaused(false);
      setCurrentScanningId(null);
    }
  };

  const handlePauseToggle = () => {
    if (!isPaused) {
      pauseRequestedRef.current = true;
      setIsPaused(true);
      toast({ title: 'Harvester Paused' });
    } else {
      pauseRequestedRef.current = false;
      setIsPaused(false);
      toast({ title: 'Harvester Resumed' });
    }
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    pauseRequestedRef.current = false;
    setIsPaused(false);
    setIsScanning(false);
  };

  const handleClearAll = () => {
    if (isScanning) {
      handleStop();
    }
    setRawLogs([]);
    setGroupedMovies([]);
    setProgressPercent(0);
    toast({ title: 'Cleared All Harvester Data' });
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
    toast({ title: 'Copied to Clipboard', description: text });
  };

  // Import single movie to Firestore
  const handleImportSingle = async (movie: HarvestedMovieGroup) => {
    setImportingMovieKey(movie.key);
    try {
      const res = await importHarvestedMovieAction(movie, { requireTmdbMatch });
      if (res.success) {
        setGroupedMovies(prev =>
          prev.map(m => (m.key === movie.key ? { ...m, imported: true } : m))
        );
        setLibraryRefreshTrigger(t => t + 1);
        toast({
          title: 'Movie Imported!',
          description: `"${movie.cleanTitle}" (${movie.links.length} links) added to your Firestore library.`
        });
      } else if (res.skipped) {
        toast({
          title: 'Movie Skipped (Strict Mode)',
          description: res.error || `Skipped "${movie.cleanTitle}" because no TMDB ID was found.`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: res.error || 'Failed to import movie'
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Import Error',
        description: err?.message || 'Failed to import'
      });
    } finally {
      setImportingMovieKey(null);
    }
  };

  // Batch import all discovered movies in non-blocking asynchronous chunks
  const handleBatchImportAll = async () => {
    const unimported = groupedMovies.filter(m => !m.imported);
    if (unimported.length === 0) {
      toast({ title: 'All movies are already imported!' });
      return;
    }

    stopBatchImportRef.current = false;
    setIsBatchImporting(true);
    const CHUNK_SIZE = 20;
    const totalCount = unimported.length;
    
    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    setBatchProgress({
      total: totalCount,
      processed: 0,
      imported: 0,
      skipped: 0,
      failed: 0
    });

    toast({
      title: 'Batch Import Started',
      description: `Processing ${totalCount} movie(s) in safe chunks (${requireTmdbMatch ? 'Strict TMDB verification' : 'Standard import'})...`
    });

    try {
      for (let i = 0; i < totalCount; i += CHUNK_SIZE) {
        if (stopBatchImportRef.current) {
          toast({
            title: 'Batch Import Stopped',
            description: `Stopped by user. Imported ${totalImported} items so far.`
          });
          break;
        }

        const chunk = unimported.slice(i, i + CHUNK_SIZE);
        const chunkKeys = new Set(chunk.map(c => c.key));

        try {
          const res = await batchImportHarvestedMoviesAction(chunk, { requireTmdbMatch });
          totalImported += res.importedCount || 0;
          totalSkipped += res.skippedCount || 0;
          totalFailed += res.failedCount || 0;

          // Update imported flag for successfully processed items in UI state
          setGroupedMovies(prev =>
            prev.map(m => (chunkKeys.has(m.key) ? { ...m, imported: true } : m))
          );
        } catch (chunkErr) {
          console.error('Chunk import error:', chunkErr);
          totalFailed += chunk.length;
        }

        const processedSoFar = Math.min(totalCount, i + CHUNK_SIZE);
        setBatchProgress({
          total: totalCount,
          processed: processedSoFar,
          imported: totalImported,
          skipped: totalSkipped,
          failed: totalFailed
        });

        // Give breathing space to the UI thread
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setLibraryRefreshTrigger(t => t + 1);
      toast({
        title: 'Batch Import Finished!',
        description: `Imported: ${totalImported} | Skipped (No TMDB): ${totalSkipped} | Failed: ${totalFailed}`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Batch Import Error',
        description: err?.message || 'Failed during batch import'
      });
    } finally {
      setIsBatchImporting(false);
      setBatchProgress(null);
      setLibraryRefreshTrigger(t => t + 1);
    }
  };

  const handleStopBatchImport = () => {
    stopBatchImportRef.current = true;
  };

  // Export to JSON file
  const handleExportJson = () => {
    if (groupedMovies.length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }

    const exportData = {
      sourceDomain: domain,
      harvestTimestamp: new Date().toISOString(),
      scannedRange: { startId, endId },
      totalGroupedMovies: groupedMovies.length,
      totalLinks: stats.totalLinks,
      movies: groupedMovies.map((m, idx) => ({
        sequenceNumber: idx + 1,
        title: m.cleanTitle,
        year: m.year || null,
        languageTags: m.languageTags,
        isTvSeries: m.isTvSeries,
        tmdbInfo: m.tmdbMatch
          ? {
              tmdbId: m.tmdbMatch.id,
              title: m.tmdbMatch.title,
              rating: m.tmdbMatch.rating,
              releaseDate: m.tmdbMatch.releaseDate,
              posterPath: m.tmdbMatch.posterPath,
              backdropPath: m.tmdbMatch.backdropPath,
              genres: m.tmdbMatch.genres
            }
          : null,
        downloadLinks: m.links.map(l => ({
          id: l.id,
          quality: l.quality,
          url: l.url,
          rawTitle: l.rawTitle,
          jioServer: l.jioServer || null
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mp4moviez_harvested_${startId}_to_${endId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'JSON Exported!',
      description: `Downloaded mp4moviez_harvested_${startId}_to_${endId}.json`
    });
  };

  // Export to CSV file
  const handleExportCsv = () => {
    if (groupedMovies.length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }

    const headers = ['Movie Title', 'Year', 'Language Tags', 'Quality', 'Mp4Moviez ID', 'Direct Download URL'];
    const rows: string[][] = [];

    for (const m of groupedMovies) {
      for (const l of m.links) {
        rows.push([
          `"${m.cleanTitle.replace(/"/g, '""')}"`,
          `"${m.year || ''}"`,
          `"${m.languageTags.join(', ')}"`,
          `"${l.quality}"`,
          `"${l.id}"`,
          `"${l.url}"`
        ]);
      }
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mp4moviez_harvested_${startId}_to_${endId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV Exported!',
      description: `Downloaded mp4moviez_harvested_${startId}_to_${endId}.csv (${rows.length} rows)`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-r from-rose-50 via-pink-50/50 to-orange-50/40 dark:from-rose-950/40 dark:via-rose-900/20 dark:to-neutral-900/40 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30">
                🌾
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Mp4Moviez Batch ID Harvester
              </h2>
              <Badge variant="outline" className="bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800 text-[11px] font-semibold">
                Sequential Range Crawl
              </Badge>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-3xl leading-relaxed">
              Crawl any ID range (e.g. from <code className="bg-rose-200/60 dark:bg-rose-900/60 px-1 py-0.5 rounded font-mono text-xs">id=1</code> up to latest),
              resolve canonical parameter links (<code className="bg-rose-200/60 dark:bg-rose-900/60 px-1 py-0.5 rounded font-mono text-xs">dl.php?id=...&amp;q=720&amp;title=...</code>),
              automatically group multiple quality links (<code className="font-mono text-xs">480p</code>, <code className="font-mono text-xs">720p</code>, <code className="font-mono text-xs">1080p</code>) per movie, and export formatted JSON/CSV or 1-click import into Firestore.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-mono flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
              100% Isolated Tool
            </Badge>
          </div>
        </div>
      </div>

      {/* Harvester Configuration Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-rose-600" />
            Harvester Setup &amp; Range Controls
          </CardTitle>
          <CardDescription>
            Configure source domain, ID bounds, concurrency chunks, and TMDB auto-metadata enrichment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Domain with Quick Save */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="mp4Domain" className="text-xs font-semibold">
                  Mp4Moviez Target Domain
                </Label>
                <button
                  type="button"
                  onClick={handleSaveActiveDomain}
                  disabled={isSavingDomain || isScanning}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {isSavingDomain ? 'Saving...' : 'Save as Active'}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  id="mp4Domain"
                  value={domain}
                  disabled={isScanning}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="mp4moviez.trading"
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Domain changes dynamically reroute all links in the live player &amp; downloads.
              </p>
            </div>

            {/* Start ID */}
            <div className="space-y-1.5">
              <Label htmlFor="startId" className="text-xs font-semibold">
                Start ID
              </Label>
              <Input
                id="startId"
                type="number"
                min={1}
                disabled={isScanning}
                value={startId}
                onChange={e => setStartId(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="font-mono text-xs font-bold"
              />
            </div>

            {/* End ID */}
            <div className="space-y-1.5">
              <Label htmlFor="endId" className="text-xs font-semibold">
                End ID (Range Target)
              </Label>
              <Input
                id="endId"
                type="number"
                min={1}
                disabled={isScanning}
                value={endId}
                onChange={e => setEndId(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="font-mono text-xs font-bold"
              />
            </div>

            {/* Chunk Size / Concurrency */}
            <div className="space-y-1.5">
              <Label htmlFor="chunkSize" className="text-xs font-semibold">
                Batch Chunk Step ({chunkSize} IDs / req)
              </Label>
              <select
                id="chunkSize"
                disabled={isScanning}
                value={chunkSize}
                onChange={e => setChunkSize(parseInt(e.target.value, 10) || 10)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={5}>5 IDs per step (Gentlest)</option>
                <option value={10}>10 IDs per step (Recommended)</option>
                <option value={15}>15 IDs per step (Balanced)</option>
                <option value={20}>20 IDs per step (Fast)</option>
                <option value={30}>30 IDs per step (Ultra Fast)</option>
              </select>
            </div>
          </div>

          {/* Quick Range Presets & TMDB Switches */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/60">
            {/* Range Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium mr-1">Quick Range:</span>
              <Button
                variant="outline"
                size="sm"
                disabled={isScanning}
                onClick={() => handleSetQuickRange(10)}
                className="h-7 text-xs px-2.5"
              >
                +10 IDs
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isScanning}
                onClick={() => handleSetQuickRange(25)}
                className="h-7 text-xs px-2.5"
              >
                +25 IDs
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isScanning}
                onClick={() => handleSetQuickRange(50)}
                className="h-7 text-xs px-2.5"
              >
                +50 IDs
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isScanning}
                onClick={() => handleSetQuickRange(100)}
                className="h-7 text-xs px-2.5"
              >
                +100 IDs
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isScanning}
                onClick={() => handleTestSingleId(59420)}
                className="h-7 text-xs px-2.5 text-rose-600 border-rose-200 dark:border-rose-800"
              >
                Test Single ID 59420
              </Button>
            </div>

            {/* TMDB Switches */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enrichTmdb"
                  checked={enrichWithTmdb}
                  disabled={isScanning}
                  onCheckedChange={setEnrichWithTmdb}
                />
                <Label htmlFor="enrichTmdb" className="text-xs cursor-pointer flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Auto-Enrich with TMDB
                </Label>
              </div>

              <div className="flex items-center space-x-2 bg-emerald-50/60 dark:bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                <Switch
                  id="requireTmdb"
                  checked={requireTmdbMatch}
                  onCheckedChange={setRequireTmdbMatch}
                />
                <Label htmlFor="requireTmdb" className="text-xs cursor-pointer flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Strict Mode: Only Import TMDB-Verified Content
                </Label>
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {!isScanning ? (
                <Button
                  onClick={startHarvesting}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-medium px-5 shadow-sm shadow-rose-600/30"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Start Web Harvester (IDs {startId} ➔ {endId})
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handlePauseToggle}
                    variant={isPaused ? 'default' : 'secondary'}
                    className="gap-2 font-medium"
                  >
                    {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
                    {isPaused ? 'Resume Harvester' : 'Pause Harvester'}
                  </Button>

                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    className="gap-2 font-medium"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    Stop Harvester
                  </Button>
                </>
              )}

              {rawLogs.length > 0 && !isScanning && (
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Data
                </Button>
              )}
            </div>

            {/* Offline Script JSON / TXT Uploader */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,.txt"
                className="hidden"
                onChange={handleUploadJsonFile}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-xs font-semibold border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Download className="h-4 w-4 rotate-180 text-rose-600" />
                Upload Scraped File (.json / .txt)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standalone Node.js Script Helper Box */}
      <Card className="border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-neutral-900 text-emerald-400 font-mono text-xs font-bold">
                JS
              </span>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Recommended for Large ID Ranges: Standalone Node.js Script
                </h4>
                <p className="text-xs text-muted-foreground">
                  Run high-speed crawling from your own PC (bypasses Cloudflare bot checks &amp; Vercel serverless timeouts).
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono shrink-0">
              node mp4moviez_harvester.mjs
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-neutral-950 text-neutral-100 font-mono text-xs space-y-1.5 overflow-x-auto">
            <div className="text-muted-foreground text-[11px]">// 1. Run in terminal on your computer:</div>
            <div className="text-emerald-400 font-semibold selection:bg-emerald-800">
              node mp4moviez_harvester.mjs 50000 65000 mp4moviez.trading
            </div>
            <div className="text-muted-foreground text-[11px] pt-1">// 2. The script will save <code className="text-white">mp4moviez_catalog.json</code> on your PC.</div>
            <div className="text-muted-foreground text-[11px]">// 3. Click the &ldquo;Upload Generated JSON File&rdquo; button above to import thousands of movies instantly!</div>
          </div>
        </CardContent>
      </Card>

      {/* Live Progress & Stats Dashboard */}
      {(isScanning || rawLogs.length > 0) && (
        <Card className="border-rose-200 dark:border-rose-900/40 shadow-sm bg-card/60">
          <CardContent className="pt-6 space-y-4">
            {/* Progress Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isScanning && !isPaused && (
                  <RefreshCw className="h-4 w-4 text-rose-600 animate-spin" />
                )}
                {isPaused && (
                  <Pause className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm font-semibold">
                  {isScanning
                    ? isPaused
                      ? 'Harvester Paused'
                      : `Scanning Range ${startId} ➔ ${endId}...`
                    : 'Harvesting Completed'}
                </span>
                {currentScanningId && (
                  <Badge variant="outline" className="font-mono text-[11px] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200">
                    Probing ID: {currentScanningId}
                  </Badge>
                )}
              </div>

              <div className="text-xs font-mono text-muted-foreground">
                {rawLogs.length} / {totalIdsToScan} IDs scanned ({progressPercent}%)
              </div>
            </div>

            {/* Visual Progress Bar */}
            <Progress value={progressPercent} className="h-2.5 bg-neutral-100 dark:bg-neutral-800" />

            {/* Stat Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800">
                <div className="text-[11px] text-muted-foreground font-medium">Scanned IDs</div>
                <div className="text-lg font-bold font-mono">{stats.totalScanned}</div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Found Active Links</div>
                <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">{stats.foundCount}</div>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">Grouped Movies</div>
                <div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">{stats.totalMovies}</div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Multi-Qualities</div>
                <div className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300">{stats.totalLinks}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800">
                <div className="text-[11px] text-muted-foreground font-medium">Dead / 404 IDs</div>
                <div className="text-lg font-bold font-mono text-muted-foreground">{stats.deadCount}</div>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">Imported to DB</div>
                <div className="text-lg font-bold font-mono text-purple-700 dark:text-purple-300">{stats.importedCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discovered Results & Grouping Hub */}
      {groupedMovies.length > 0 && (
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
            {/* Search filter */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search harvested movies by title, year, quality, or language..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Export & Batch Import Buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                className="gap-1.5 text-xs font-medium border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300"
              >
                <FileJson className="h-3.5 w-3.5" />
                Export JSON Sequence
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-1.5 text-xs font-medium"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export CSV
              </Button>

              <Button
                size="sm"
                disabled={isBatchImporting}
                onClick={handleBatchImportAll}
                className="gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {isBatchImporting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Database className="h-3.5 w-3.5" />
                )}
                Import All to Database
              </Button>
            </div>
          </div>

          {/* Batch Import Progress Banner */}
          {isBatchImporting && batchProgress && (
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                    Importing to Library: {batchProgress.processed} / {batchProgress.total} titles processed
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStopBatchImport}
                  className="h-7 text-xs px-2.5"
                >
                  Stop Import
                </Button>
              </div>
              <Progress
                value={Math.round((batchProgress.processed / batchProgress.total) * 100)}
                className="h-2 bg-emerald-200 dark:bg-emerald-900"
              />
              <div className="flex items-center gap-4 text-xs font-mono text-emerald-800 dark:text-emerald-300 pt-1">
                <span>Imported: <strong>{batchProgress.imported}</strong></span>
                <span>Skipped (No TMDB): <strong>{batchProgress.skipped}</strong></span>
                <span>Failed: <strong>{batchProgress.failed}</strong></span>
              </div>
            </div>
          )}

          {/* Results Tabs */}
          <Tabs defaultValue="grouped" className="space-y-4">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="grouped" className="text-xs gap-1.5">
                <Film className="h-3.5 w-3.5" />
                Grouped Movies ({filteredMovies.length})
              </TabsTrigger>
              <TabsTrigger value="rawlogs" className="text-xs gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Raw ID Scan Log ({rawLogs.length})
              </TabsTrigger>
              <TabsTrigger value="jsonview" className="text-xs gap-1.5">
                <Code className="h-3.5 w-3.5" />
                Live JSON Preview
              </TabsTrigger>
            </TabsList>

            {/* Grouped Movies Tab */}
            <TabsContent value="grouped" className="space-y-4">
              {/* Pagination Info Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                <div>
                  Showing {Math.min(filteredMovies.length, (moviePage - 1) * moviePageSize + 1)}–
                  {Math.min(filteredMovies.length, moviePage * moviePageSize)} of {filteredMovies.length} movies
                </div>
                <div className="flex items-center gap-2">
                  <span>Show per page:</span>
                  <select
                    value={moviePageSize}
                    onChange={e => {
                      setMoviePageSize(Number(e.target.value));
                      setMoviePage(1);
                    }}
                    className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={96}>96</option>
                    <option value={200}>200</option>
                  </select>

                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={moviePage <= 1}
                      onClick={() => setMoviePage(1)}
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={moviePage <= 1}
                      onClick={() => setMoviePage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="font-mono px-2">
                      {moviePage} / {Math.max(1, Math.ceil(filteredMovies.length / moviePageSize))}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={moviePage >= Math.ceil(filteredMovies.length / moviePageSize)}
                      onClick={() => setMoviePage(p => p + 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={moviePage >= Math.ceil(filteredMovies.length / moviePageSize)}
                      onClick={() => setMoviePage(Math.ceil(filteredMovies.length / moviePageSize))}
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Movie Grid (Paginated) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMovies
                  .slice((moviePage - 1) * moviePageSize, moviePage * moviePageSize)
                  .map((movie, idx) => (
                  <Card key={`movie-card-${movie.key}-${idx}`} className="border-border hover:border-rose-300 dark:hover:border-rose-800 transition-colors shadow-sm overflow-hidden flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          {/* Poster Thumbnail */}
                          {movie.tmdbMatch?.posterPath ? (
                            <div className="relative h-20 w-14 rounded-md overflow-hidden shrink-0 border border-border shadow-xs bg-muted">
                              <Image
                                src={movie.tmdbMatch.posterPath}
                                alt={movie.cleanTitle}
                                fill
                                sizes="56px"
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="h-20 w-14 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center shrink-0 text-rose-600">
                              {movie.isTvSeries ? <Tv className="h-6 w-6" /> : <Film className="h-6 w-6" />}
                              <span className="text-[9px] font-bold mt-1 uppercase">
                                {movie.isTvSeries ? 'Series' : 'Movie'}
                              </span>
                            </div>
                          )}

                          {/* Movie Title & Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-sm sm:text-base leading-tight">
                                {movie.cleanTitle}
                              </h3>
                              {movie.year && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {movie.year}
                                </Badge>
                              )}
                            </div>

                            {/* Raw Slug subtitle */}
                            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-xs" title={movie.rawTitleSample}>
                              {movie.rawTitleSample}
                            </p>

                            {/* Tags */}
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {movie.languageTags.map((tag, tIdx) => (
                                <Badge key={`${movie.key}-${tag}-${tIdx}`} variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900">
                                  {tag}
                                </Badge>
                              ))}
                              {movie.isTvSeries && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900">
                                  TV Series
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Import Status Badge */}
                        {movie.imported ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Imported
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={importingMovieKey === movie.key}
                            onClick={() => handleImportSingle(movie)}
                            className="h-7 text-xs px-2.5 gap-1 shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          >
                            {importingMovieKey === movie.key ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Database className="h-3 w-3" />
                            )}
                            Import to DB
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {/* Grouped Qualities & Links */}
                    <CardContent className="pt-0 space-y-2">
                      {/* TV Series Seasons & Episodes Breakdown if available */}
                      {movie.isTvSeries && movie.seasons && movie.seasons.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 space-y-1.5">
                          <div className="text-[11px] font-semibold text-purple-900 dark:text-purple-200 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Tv className="h-3 w-3 text-purple-600" />
                              Series Structure ({movie.seasons.length} Seasons, {movie.totalEpisodesCount || movie.seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0)} Episodes):
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {movie.seasons.map(s => (
                              <Badge
                                key={`season-badge-${movie.key}-${s.seasonNumber}`}
                                variant="outline"
                                className="text-[10px] bg-background border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-mono"
                              >
                                Season {s.seasonNumber}: {s.episodes?.length || 0} eps
                                {s.zipPackLinks && s.zipPackLinks.length > 0 ? ' + Zip' : ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2">
                        <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                          <span>Resolved Qualities ({movie.links.length}):</span>
                          <span className="text-[10px] font-normal">IDs: {movie.links.map(l => l.id).join(', ')}</span>
                        </div>

                        <div className="space-y-1.5">
                          {movie.links.map((link, lIdx) => (
                            <div
                              key={`link-${movie.key}-${link.id}-${link.quality}-${lIdx}`}
                              className="flex items-center justify-between gap-2 p-1.5 rounded bg-background border border-border/60 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] uppercase font-bold font-mono px-1.5 py-0 h-5 shrink-0">
                                  {link.quality}
                                </Badge>
                                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                                  #{link.id}
                                </span>
                                <span className="text-muted-foreground truncate font-mono text-[11px]" title={link.url}>
                                  {link.url}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  title="Copy URL"
                                  onClick={() => handleCopy(link.url)}
                                >
                                  {copiedUrl === link.url ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>

                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-muted-foreground hover:text-foreground inline-flex items-center"
                                  title="Test URL in new tab"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bottom Pagination controls */}
              {filteredMovies.length > moviePageSize && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={moviePage <= 1}
                    onClick={() => {
                      setMoviePage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="gap-1 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous Page
                  </Button>
                  <span className="text-xs font-mono px-3 text-muted-foreground">
                    Page {moviePage} of {Math.ceil(filteredMovies.length / moviePageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={moviePage >= Math.ceil(filteredMovies.length / moviePageSize)}
                    onClick={() => {
                      setMoviePage(p => p + 1);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="gap-1 text-xs"
                  >
                    Next Page
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Raw Scan Log Tab */}
            <TabsContent value="rawlogs" className="space-y-3">
              {/* Raw Logs Pagination Bar */}
              {rawLogs.length > rawLogsPageSize && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    Showing {(rawLogsPage - 1) * rawLogsPageSize + 1}–{Math.min(rawLogs.length, rawLogsPage * rawLogsPageSize)} of {rawLogs.length} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      disabled={rawLogsPage <= 1}
                      onClick={() => setRawLogsPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="font-mono px-1">
                      {rawLogsPage} / {Math.ceil(rawLogs.length / rawLogsPageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      disabled={rawLogsPage >= Math.ceil(rawLogs.length / rawLogsPageSize)}
                      onClick={() => setRawLogsPage(p => p + 1)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Card className="border-border">
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                        <TableRow>
                          <TableHead className="w-16">ID</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-24">Quality</TableHead>
                          <TableHead>Parsed Title &amp; Year</TableHead>
                          <TableHead>Full Canonical URL</TableHead>
                          <TableHead className="w-20 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rawLogs
                          .slice((rawLogsPage - 1) * rawLogsPageSize, rawLogsPage * rawLogsPageSize)
                          .map((item, idx) => (
                          <TableRow key={`rawlog-row-${item.id}-${item.status}-${idx}`}>
                            <TableCell className="font-mono text-xs font-bold">
                              #{item.id}
                            </TableCell>
                            <TableCell>
                              {item.status === 'found' && (
                                <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Found
                                </Badge>
                              )}
                              {item.status === 'not_found' && (
                                <Badge variant="secondary" className="text-[10px] text-muted-foreground w-fit">
                                  Dead (404)
                                </Badge>
                              )}
                              {item.status === 'error' && (
                                <Badge variant="destructive" className="text-[10px] w-fit">
                                  Error
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.quality ? (
                                <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">
                                  {item.quality}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.cleanTitle ? (
                                <div>
                                  <span className="font-medium text-xs text-foreground">
                                    {item.cleanTitle}
                                  </span>
                                  {item.year && (
                                    <span className="text-[11px] text-muted-foreground ml-1.5">
                                      ({item.year})
                                    </span>
                                  )}
                                  <p className="text-[10px] font-mono text-muted-foreground truncate max-w-sm">
                                    {item.rawTitle}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  {item.errorMsg || 'No record'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-md truncate font-mono text-[11px] text-muted-foreground">
                              {item.fullUrl ? (
                                <span title={item.fullUrl}>{item.fullUrl}</span>
                              ) : (
                                <span className="italic">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.fullUrl && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleCopy(item.fullUrl!)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <a
                                    href={item.fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Live JSON Preview Tab */}
            <TabsContent value="jsonview">
              <Card className="border-border">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Structured Output JSON Preview</CardTitle>
                    <CardDescription className="text-xs">
                      Sequence of movies with grouped multi-quality links, ready for export or programmatic ingestion.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportJson}
                    className="gap-1.5 text-xs font-medium"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download File
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 rounded-lg bg-neutral-950 text-neutral-100 font-mono text-xs overflow-x-auto max-h-[500px]">
                    {JSON.stringify(
                      {
                        sourceDomain: domain,
                        scannedRange: { startId, endId },
                        totalMovies: groupedMovies.length,
                        movies: groupedMovies.map((m, i) => ({
                          index: i + 1,
                          title: m.cleanTitle,
                          year: m.year,
                          languages: m.languageTags,
                          qualities: m.links.map(l => ({
                            quality: l.quality,
                            id: l.id,
                            url: l.url
                          }))
                        }))
                      },
                      null,
                      2
                    )}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Harvested Library Manager - Live Database List with Edit & Delete */}
      <div className="pt-4 border-t border-border/80">
        <HarvestedLibraryManager
          refreshTrigger={libraryRefreshTrigger}
          onDataChanged={() => setLibraryRefreshTrigger(t => t + 1)}
        />
      </div>
    </div>
  );
}
