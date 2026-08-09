'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, EyeOff, RefreshCw, Film, Tv, TrendingUp, ShieldCheck, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentViewAnalyticsAction, updatePublicViewsSettingAction } from '@/app/admin/actions';

export default function AdminViewsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    topMovies: Array<{ id: string; title: string; posterPath?: string; type: string; viewsCount: number }>;
    topChannels: Array<{ id: string; title: string; posterUrl?: string; country?: string; viewsCount: number }>;
    totalMovieViews: number;
    totalChannelViews: number;
    totalOverallViews: number;
    showPublicViews: boolean;
  }>({
    topMovies: [],
    topChannels: [],
    totalMovieViews: 0,
    totalChannelViews: 0,
    totalOverallViews: 0,
    showPublicViews: true,
  });

  const [togglingPublic, setTogglingPublic] = useState(false);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getContentViewAnalyticsAction();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load view analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleTogglePublicViews = async (checked: boolean) => {
    setTogglingPublic(true);
    // Optimistic UI update
    setAnalytics(prev => ({ ...prev, showPublicViews: checked }));
    try {
      const res = await updatePublicViewsSettingAction(checked);
      if (res.success) {
        toast({
          title: checked ? 'Public Views Enabled' : 'Public Views Hidden',
          description: checked
            ? 'The Eye icon and view count are now visible publicly on detail pages.'
            : 'View count is now hidden publicly, but still tracked in admin.',
        });
      } else {
        throw new Error('Failed to update setting');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update public views setting.',
      });
      // Revert optimistic update
      setAnalytics(prev => ({ ...prev, showPublicViews: !checked }));
    } finally {
      setTogglingPublic(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Settings Box */}
      <Card className="border-orange-500/20 bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Content Views & Visitor Analytics
              </CardTitle>
              <CardDescription>
                Track real unique user views per movie, series, and live TV channel with IP deduplication.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={loading}
              className="w-fit"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Views
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {analytics.showPublicViews ? (
                  <Eye className="h-4 w-4 text-emerald-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-amber-500" />
                )}
                <Label htmlFor="public-views-toggle" className="font-semibold text-sm cursor-pointer">
                  Show View Count (Eye Icon) Publicly on Detail Pages
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.showPublicViews
                  ? 'Eye icon and unique view counts are displayed on public movie, series, and live TV pages.'
                  : 'View counts are hidden from public visitors, but real unique views are still saved & tracked here in Admin.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={analytics.showPublicViews ? 'default' : 'secondary'}>
                {analytics.showPublicViews ? 'PUBLICLY VISIBLE' : 'ADMIN ONLY'}
              </Badge>
              <Switch
                id="public-views-toggle"
                checked={analytics.showPublicViews}
                onCheckedChange={handleTogglePublicViews}
                disabled={togglingPublic || loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Total Overall Views</span>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{analytics.totalOverallViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all content & channels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Movies & Series Views</span>
              <Film className="h-4 w-4 text-sky-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{analytics.totalMovieViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.topMovies.length} items with tracked views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Live TV Channel Views</span>
              <Tv className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{analytics.totalChannelViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.topChannels.length} channels with views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Visitor Protection</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-emerald-500 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="h-4 w-4" /> IP Deduplication Active
            </div>
            <p className="text-xs text-muted-foreground mt-1">Prevents fake click spamming (15m window)</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Movies / Series Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Film className="h-5 w-5 text-sky-500" />
            Most Viewed Movies & TV Shows
          </CardTitle>
          <CardDescription>
            Ranked list of top titles based on unique visitor page loads and clicks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">
              Loading movie analytics...
            </div>
          ) : analytics.topMovies.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No movie or series view counts recorded yet. Views will appear here as users visit content pages.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="text-right w-[140px]">Unique Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topMovies.map((movie, index) => (
                    <TableRow key={movie.id}>
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                        #{index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {movie.posterPath ? (
                            <img
                              src={movie.posterPath}
                              alt={movie.title}
                              className="w-8 h-12 object-cover rounded shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-12 bg-muted rounded flex items-center justify-center shrink-0">
                              <Film className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-semibold text-sm line-clamp-1">{movie.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {movie.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold">
                          <Eye className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          {movie.viewsCount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Live TV Channels Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Tv className="h-5 w-5 text-purple-500" />
            Most Viewed Live TV Channels
          </CardTitle>
          <CardDescription>
            Ranked list of top live television streams by unique visitor tune-ins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">
              Loading channel analytics...
            </div>
          ) : analytics.topChannels.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No live TV channel views recorded yet. Views will appear here as users tune in.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Channel Name</TableHead>
                    <TableHead className="w-[120px]">Country</TableHead>
                    <TableHead className="text-right w-[140px]">Unique Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topChannels.map((channel, index) => (
                    <TableRow key={channel.id}>
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                        #{index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {channel.posterUrl ? (
                            <img
                              src={channel.posterUrl}
                              alt={channel.title}
                              className="w-8 h-8 object-cover rounded-full shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                              <Tv className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-semibold text-sm line-clamp-1">{channel.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {channel.country || 'Global'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold">
                          <Eye className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                          {channel.viewsCount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
