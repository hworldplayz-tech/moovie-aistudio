'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import {
  Film,
  Tv,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Filter,
  ArrowUpDown,
  Download,
  Star,
  Layers,
  FolderArchive
} from 'lucide-react';
import type { Content } from '@/lib/definitions';
import { getHarvestedLibraryAction, deleteHarvestedContentAction } from '@/app/admin/actions';
import { ContentFormDialog } from '@/components/content-form-dialog';
import { cleanDownloadLabel } from '@/lib/harvester-utils';
import Image from 'next/image';
import Link from 'next/link';

interface HarvestedLibraryManagerProps {
  onDataChanged?: () => void;
  refreshTrigger?: number;
}

export function HarvestedLibraryManager({ onDataChanged, refreshTrigger }: HarvestedLibraryManagerProps) {
  const { toast } = useToast();

  const [items, setItems] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'rating'>('newest');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Deleting item tracker
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const res = await getHarvestedLibraryAction();
      if (res.success && res.items) {
        setItems(res.items);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Fetching Library',
          description: res.error || 'Failed to load library items.'
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Fetching Library',
        description: err?.message || 'Network error loading library.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [refreshTrigger]);

  const handleDelete = async (id: string, title: string) => {
    setDeletingId(id);
    try {
      const res = await deleteHarvestedContentAction(id);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        toast({
          title: 'Item Deleted',
          description: `"${title}" was removed from the library.`
        });
        if (onDataChanged) onDataChanged();
      } else {
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: res.error || 'Could not delete item.'
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Error',
        description: err?.message || 'An error occurred while deleting.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Type filter
        if (typeFilter === 'movie' && item.type === 'tv') return false;
        if (typeFilter === 'tv' && item.type !== 'tv') return false;

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = item.title.toLowerCase().includes(q);
        const yearMatch = item.releaseDate ? item.releaseDate.includes(q) : false;
        const genreMatch = item.genres ? item.genres.some(g => g.toLowerCase().includes(q)) : false;
        const tagMatch = item.customTags ? item.customTags.some(t => t.toLowerCase().includes(q)) : false;
        const langMatch = item.languages ? item.languages.some(l => l.toLowerCase().includes(q)) : false;

        return titleMatch || yearMatch || genreMatch || tagMatch || langMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'rating') {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === 'oldest') {
          const dateA = new Date(a.createdAt || a.releaseDate || 0).getTime();
          const dateB = new Date(b.createdAt || b.releaseDate || 0).getTime();
          return dateA - dateB;
        }
        // Default 'newest'
        const dateA = new Date(a.createdAt || a.releaseDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.releaseDate || 0).getTime();
        return dateB - dateA;
      });
  }, [items, searchQuery, typeFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = items.length;
    const movieCount = items.filter(i => i.type !== 'tv').length;
    const tvCount = items.filter(i => i.type === 'tv').length;
    
    let totalEpisodes = 0;
    let totalDownloadLinks = 0;

    for (const item of items) {
      if (item.type === 'tv' && item.seasons) {
        for (const s of item.seasons) {
          totalEpisodes += (s.episodes?.length || 0);
          for (const ep of (s.episodes || [])) {
            totalDownloadLinks += (ep.downloadLinks?.length || 0);
          }
          totalDownloadLinks += (s.zipPackLinks?.length || 0);
        }
      } else {
        totalDownloadLinks += (item.downloadLinks?.length || (item.downloadLink ? 1 : 0));
      }
    }

    return {
      totalCount,
      movieCount,
      tvCount,
      totalEpisodes,
      totalDownloadLinks
    };
  }, [items]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-rose-600" />
              <CardTitle className="text-base sm:text-lg font-bold">
                Harvested Library Manager ({items.length} Items in DB)
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Live database list view of all harvested &amp; imported movies and TV series. Edit metadata, manage seasons/episodes, or remove items.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={fetchLibrary}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Library
            </Button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3">
          <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800">
            <div className="text-[11px] text-muted-foreground font-medium">Total Titles</div>
            <div className="text-base sm:text-lg font-bold font-mono">{stats.totalCount}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">Movies</div>
            <div className="text-base sm:text-lg font-bold font-mono text-rose-700 dark:text-rose-300">{stats.movieCount}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
            <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">TV / Web Series</div>
            <div className="text-base sm:text-lg font-bold font-mono text-purple-700 dark:text-purple-300">{stats.tvCount}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
            <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Series Episodes</div>
            <div className="text-base sm:text-lg font-bold font-mono text-blue-700 dark:text-blue-300">{stats.totalEpisodes}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Download Links</div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">{stats.totalDownloadLinks}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search, Filter & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search library by title, year, tags, genres..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filter */}
            <div className="flex items-center border border-border rounded-md bg-background p-0.5">
              <Button
                variant={typeFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTypeFilter('all')}
                className="h-7 text-xs px-2.5"
              >
                All ({items.length})
              </Button>
              <Button
                variant={typeFilter === 'movie' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTypeFilter('movie')}
                className="h-7 text-xs px-2.5"
              >
                Movies ({stats.movieCount})
              </Button>
              <Button
                variant={typeFilter === 'tv' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTypeFilter('tv')}
                className="h-7 text-xs px-2.5"
              >
                Series ({stats.tvCount})
              </Button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground h-8"
            >
              <option value="newest">Recently Added</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* List View Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-14">Poster</TableHead>
                <TableHead>Title &amp; Metadata</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-48">Seasons / Downloads</TableHead>
                <TableHead className="w-24">Rating</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <RefreshCw className="h-5 w-5 animate-spin text-rose-600" />
                      <span>Loading library items from database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    {searchQuery ? `No items matched "${searchQuery}".` : 'No items in database library yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map(item => {
                  const isTv = item.type === 'tv';
                  const seasonsCount = item.seasons?.length || 0;
                  const totalEps = item.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
                  const movieLinksCount = item.downloadLinks?.length || (item.downloadLink ? 1 : 0);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Poster Column */}
                      <TableCell className="py-2.5">
                        <div className="relative h-14 w-10 rounded overflow-hidden bg-muted border border-border shrink-0">
                          {item.posterPath ? (
                            <Image
                              src={item.posterPath}
                              alt={item.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                              {isTv ? <Tv className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Title & Info Column */}
                      <TableCell className="py-2.5">
                        <div className="space-y-1 max-w-sm">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-foreground">
                              {item.title}
                            </span>
                            {item.releaseDate && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                {item.releaseDate.slice(0, 4)}
                              </Badge>
                            )}
                          </div>

                          {/* Genres & Languages */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.genres?.slice(0, 2).map((g, idx) => (
                              <span key={idx} className="text-[10px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.2">
                                {g}
                              </span>
                            ))}
                            {item.languages?.slice(0, 2).map((l, idx) => (
                              <span key={idx} className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded px-1.5 py-0.2">
                                {l}
                              </span>
                            ))}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type Badge Column */}
                      <TableCell className="py-2.5">
                        {isTv ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px] gap-1 font-semibold">
                            <Tv className="h-3 w-3" />
                            TV Series
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[11px] gap-1 font-semibold">
                            <Film className="h-3 w-3" />
                            Movie
                          </Badge>
                        )}
                      </TableCell>

                      {/* Seasons & Downloads Summary Column */}
                      <TableCell className="py-2.5">
                        {isTv ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="font-medium text-foreground flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5 text-purple-600" />
                              <span>{seasonsCount} {seasonsCount === 1 ? 'Season' : 'Seasons'}</span>
                              <span className="text-muted-foreground font-normal">({totalEps} Episodes)</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {item.seasons?.slice(0, 2).map(s => `S${s.seasonNumber} (${s.episodes?.length || 0} eps)`).join(', ')}
                              {seasonsCount > 2 ? ` +${seasonsCount - 2} more` : ''}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5 text-xs">
                            <div className="font-medium text-foreground flex items-center gap-1">
                              <Download className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{movieLinksCount} {movieLinksCount === 1 ? 'Quality Link' : 'Quality Links'}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {item.downloadLinks?.slice(0, 3).map((dl, dIdx) => (
                                <span key={dIdx} className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-700 dark:text-neutral-300">
                                  {cleanDownloadLabel(dl.label) || `Link ${dIdx + 1}`}
                                </span>
                              ))}
                              {(item.downloadLinks?.length || 0) > 3 && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  +{item.downloadLinks!.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* Rating Column */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{item.rating ? item.rating.toFixed(1) : '7.0'}</span>
                        </div>
                      </TableCell>

                      {/* Actions Column */}
                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View on Live Site */}
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="View on site"
                          >
                            <Link href={`/watch/${item.slug || item.id}`} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>

                          {/* Edit via ContentFormDialog */}
                          <ContentFormDialog contentToEdit={item} onSave={fetchLibrary}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950/50"
                              title="Edit metadata, seasons, and links"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </ContentFormDialog>

                          {/* Delete with Confirmation Dialog */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={deletingId === item.id}
                                className="h-7 w-7 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/50"
                                title="Delete from library"
                              >
                                {deletingId === item.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete &quot;{item.title}&quot;?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove &quot;{item.title}&quot; and all its download links/episodes from your database.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id, item.title)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white"
                                >
                                  Confirm Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {filteredItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
            <div>
              Showing {Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)}–
              {Math.min(filteredItems.length, currentPage * pageSize)} of {filteredItems.length} titles
            </div>

            <div className="flex items-center gap-2">
              <span>Show per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-mono px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
