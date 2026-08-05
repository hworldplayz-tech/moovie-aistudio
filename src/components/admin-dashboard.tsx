
'use client';

import { useEffect, useState } from 'react';
import { getBrowseContent, getManuallyAddedContent } from '@/lib/tmdb';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Film, Tv, History, PlusCircle, Loader2, Settings, Trash2, RefreshCw, Search, Edit, Video, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentCard } from './content-card';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { ContentFormDialog } from './content-form-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getLogoText, updateLogoText, getPaginationLimit, updatePaginationLimit, syncContentMetadata, getSecureDownloadSettings, updateSecureDownloadSettings, migrateDownloadDomains } from '@/app/admin/actions';
import {
  getContentFromFirestore,
  addContentToFirestore,
  getSiteConfigFromFirestore,
  saveSiteConfigToFirestore,
  getPartnerRequests,
  updatePartnerRequestStatus,
  createSystemUser,
  updatePartnerCredentials,
  addLiveChannel,
  getLiveChannels,
  deleteLiveChannel,
  updateLiveChannel
} from '@/lib/firestore';
import { deleteContent } from '@/ai/flows/delete-content';
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
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import type { Content, SystemUser, PartnerRequest, LiveChannel } from '@/lib/definitions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import PlayerBuilder from './player-builder';
import AdsManagement from './ads-management';


function StatCard({ title, value, icon: Icon, isLoading }: { title: string; value: number; icon: React.ElementType; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}


export default function AdminDashboard({ user }: { user?: SystemUser }) {
  const [movieCount, setMovieCount] = useState(0);
  const [tvShowCount, setTvShowCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentlyAdded, setRecentlyAdded] = useState<Content[]>([]);
  // filteredContent state removed, derived below
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localLiveChannels, setLocalLiveChannels] = useState<LiveChannel[]>([]);
  const [liveTvForm, setLiveTvForm] = useState({
    title: '',
    streamUrl: '',
    embedCode: '',
    description: '',
    posterUrl: '',
    country: 'USA',
    customCountry: '',
    tags: ''
  });
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const { toast } = useToast();

  const [globalDownloadsEnabled, setGlobalDownloadsEnabled] = useState(true);
  const [logoText, setLogoText] = useState('');
  const [paginationLimit, setPaginationLimit] = useState(20);
  const [secureDownloadsEnabled, setSecureDownloadsEnabled] = useState(false);
  const [downloadDelay, setDownloadDelay] = useState(5);
  const [showLiveTvCarousel, setShowLiveTvCarousel] = useState(true);
  const [siteTitle, setSiteTitle] = useState('Moovie: Streaming Hub');
  const [titleSuffix, setTitleSuffix] = useState('Hindi Dubbed');
  const [showFeaturedSection, setShowFeaturedSection] = useState(true);
  const [featuredLayout, setFeaturedLayout] = useState<'slider' | 'grid' | 'list'>('slider');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Domain Migration Tool
  const [oldDomain, setOldDomain] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  const filteredContent = recentlyAdded.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [localContent, currentLogoText, currentLimit, secureSettings] = await Promise.all([
        getManuallyAddedContent(),
        getLogoText(),
        getPaginationLimit(),
        getSecureDownloadSettings()
      ]);

      setLogoText(currentLogoText);
      setPaginationLimit(currentLimit);
      setSecureDownloadsEnabled(secureSettings.enabled);
      setDownloadDelay(secureSettings.delay);
      setGlobalDownloadsEnabled(secureSettings.globalEnabled);
      // Fetch Site Config for other settings
      const siteConfig = await getSiteConfigFromFirestore();
      setShowLiveTvCarousel(siteConfig.showLiveTvCarousel !== undefined ? siteConfig.showLiveTvCarousel : true);
      setSiteTitle(siteConfig.siteTitle || 'Moovie: Streaming Hub');
      setTitleSuffix(siteConfig.titleSuffix || 'Hindi Dubbed');
      setShowFeaturedSection(siteConfig.showFeaturedSection !== undefined ? siteConfig.showFeaturedSection : true);
      setFeaturedLayout(siteConfig.featuredLayout || 'slider');


      let myContent = localContent;

      // Filter for Partner
      if (user?.role === 'partner') {
        // Only show content uploaded by this partner
        myContent = localContent.filter(c => c.uploadedBy === user.id || c.uploadedBy === user.username);
      } else if (user?.role === 'admin') {
        // Fetch requests if admin
        const requests = await getPartnerRequests();
        setPartnerRequests(requests);
      }

      // Sort by createdAt (newest first)
      const sorted = myContent.sort((a, b) => {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      setRecentlyAdded(sorted);
      setRecentlyAdded(sorted);
      // setFilteredContent(sorted); // Removed

      // Calculate stats based on WHAT THEY SEE
      setMovieCount(sorted.filter(c => c.type === 'movie').length);
      setTvShowCount(sorted.filter(c => c.type === 'tv').length);

    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to load dashboard data." });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleApproveRequest = async (request: PartnerRequest) => {
    try {
      // 1. Create User
      const username = request.email.split('@')[0]; // Simple username generation
      const password = Math.random().toString(36).slice(-8); // Random password

      const newUser: SystemUser = {
        username: username,
        password: password,
        role: 'partner',
        createdAt: new Date().toISOString(),
        partnerId: request.id
      };

      const userResult = await createSystemUser(newUser);
      if (!userResult.success) throw new Error(userResult.error || "Failed to create user");

      // 2. Update Request Status WITH credentials
      await updatePartnerRequestStatus(request.id!, 'approved', { username, password });

      // 3. Refresh List
      const requests = await getPartnerRequests();
      setPartnerRequests(requests);

      // 4. Notify Admin (to send email manually for now)
      toast({
        title: "Partner Approved",
        description: `User created! Username: ${username}, Password: ${password}. Please save this safely!`,
        duration: 10000,
      });

    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to approve partner." });
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await updatePartnerRequestStatus(id, 'rejected');
      const requests = await getPartnerRequests();
      setPartnerRequests(requests);
      toast({ title: "Request Rejected", description: "The application has been rejected." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to reject request." });
    }
  };

  // Partner Credential Editing
  const [editingCredentials, setEditingCredentials] = useState<PartnerRequest | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  const openCredentialEditor = (req: PartnerRequest) => {
    setEditingCredentials(req);
    setEditUsername(req.username || '');
    setEditPassword(req.password || '');
  };

  const handleSaveCredentials = async () => {
    if (!editingCredentials || !editingCredentials.id) return;

    setIsUpdatingCreds(true);
    try {
      const result = await updatePartnerCredentials(
        editingCredentials.id,
        editingCredentials.username || '', // Old username
        editUsername,
        editPassword
      );

      if (result.success) {
        toast({ title: "Success", description: "Partner credentials updated." });

        // Refresh list
        const requests = await getPartnerRequests();
        setPartnerRequests(requests);
        setEditingCredentials(null);
      } else {
        throw new Error(result.error || "Failed");
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to update credentials." });
    } finally {
      setIsUpdatingCreds(false);
    }
  };


  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onContentUpdated = () => {
    fetchDashboardData();
    // Force a hard reload of the window to reflect changes everywhere
    window.location.reload();
  }

  const fetchLiveChannelsData = async () => {
    const channels = await getLiveChannels();
    setLocalLiveChannels(channels);
  };

  useEffect(() => {
    fetchDashboardData();
    fetchLiveChannelsData(); // Fetch live channels on mount
  }, []);

  const handleEditLiveChannel = (channel: LiveChannel) => {
    setLiveTvForm({
      title: channel.title,
      streamUrl: channel.streamUrl || '',
      embedCode: channel.embedCode || '',
      description: channel.description,
      posterUrl: channel.posterUrl || '',
      country: channel.country,
      customCountry: '',
      tags: channel.tags.join(', ')
    });
    setEditingChannelId(channel.id);
    const formElement = document.getElementById('live-tv-form-top');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingChannelId(null);
    setLiveTvForm({
      title: '',
      streamUrl: '',
      embedCode: '',
      description: '',
      posterUrl: '',
      country: 'USA',
      customCountry: '',
      tags: ''
    });
  };

  const handleAddLiveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTvForm.title) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title is required' });
      return;
    }
    if (!liveTvForm.streamUrl && !liveTvForm.embedCode) {
      toast({ variant: 'destructive', title: 'Error', description: 'Must provide either Stream URL or Embed Code' });
      return;
    }

    setIsAddingChannel(true);
    try {
      const finalCountry = liveTvForm.country === 'Other' ? liveTvForm.customCountry : liveTvForm.country;
      const channelData = {
        title: liveTvForm.title,
        description: liveTvForm.description,
        country: finalCountry || 'Unknown',
        tags: liveTvForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        streamUrl: liveTvForm.streamUrl || undefined,
        embedCode: liveTvForm.embedCode || undefined,
        posterUrl: liveTvForm.posterUrl || undefined,
      };

      if (editingChannelId) {
        await updateLiveChannel(editingChannelId, channelData);
        toast({ title: 'Success', description: 'Channel updated successfully' });
        setEditingChannelId(null);
      } else {
        await addLiveChannel({
          id: '', // Firestore handles ID if we use addDoc logic inside helper, or helper generates it. 
          // Looking at previous valid code: id: '', createdAt: ...
          ...channelData,
          createdAt: new Date().toISOString(),
        } as any);
        toast({ title: 'Success', description: 'Live TV Channel added successfully' });
      }

      setLiveTvForm({
        title: '',
        streamUrl: '',
        embedCode: '',
        description: '',
        posterUrl: '',
        country: 'USA',
        customCountry: '',
        tags: ''
      });
      fetchLiveChannelsData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Operation failed' });
    } finally {
      setIsAddingChannel(false);
    }
  };

  const handleDeleteLiveChannel = async (id: string) => {
    if (confirm('Are you sure you want to delete this channel?')) {
      await deleteLiveChannel(id);
      fetchLiveChannelsData();
      toast({ title: 'Deleted', description: 'Channel removed' });
    }
  };


  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const [logoResult, limitResult, secureResult] = await Promise.all([
        updateLogoText(logoText),
        updatePaginationLimit(paginationLimit),
        updateSecureDownloadSettings(secureDownloadsEnabled, downloadDelay, globalDownloadsEnabled)
      ]);

      await saveSiteConfigToFirestore({
        secureDownloadsEnabled,
        downloadButtonDelay: downloadDelay,
        globalDownloadsEnabled,
        showLiveTvCarousel,
        logoText,
        paginationLimit,
        siteTitle,
        titleSuffix,
        showFeaturedSection,
        featuredLayout
      });

      if (logoResult.success && limitResult.success && secureResult.success) {
        toast({ title: "Success", description: "Site settings updated successfully." });
      } else {
        toast({ variant: 'destructive', title: "Error", description: logoResult.error || limitResult.error || secureResult.error || "Failed to update settings." });
      }
    } catch {
      toast({ variant: 'destructive', title: "Error", description: "An unexpected error occurred." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSyncMetadata = async () => {
    setIsSyncing(true);
    try {
      const result = await syncContentMetadata();
      if (result.success) {
        toast({ title: 'Sync Complete', description: `Successfully updated metadata for ${result.updatedCount} items.` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Sync Failed", description: "Could not sync metadata. Check console." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMigrateDomains = async () => {
    if (!oldDomain.trim() || !newDomain.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Both domains are required.' });
      return;
    }

    setIsMigrating(true);
    try {
      const result = await migrateDownloadDomains(oldDomain.trim(), newDomain.trim());
      if (result.success) {
        toast({
          title: 'Migration Complete',
          description: `Successfully updated ${result.updatedCount} items. Refreshing...`
        });
        setOldDomain('');
        setNewDomain('');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.error || 'Migration failed');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: error instanceof Error ? error.message : 'Could not migrate domains.'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSelectionChange = (id: string, isSelected: boolean) => {
    setSelectedIds(prev => isSelected ? [...prev, id] : prev.filter(selectedId => selectedId !== id));
  }

  const handleDelete = async (ids: string[]) => {
    setIsDeleting(true);
    try {
      const result = await deleteContent(ids);
      if (result.success) {
        toast({ title: "Success", description: `${ids.length} item(s) deleted. Refreshing...` });
        setSelectedIds([]);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error("Failed to delete content.");
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: error instanceof Error ? error.message : "Could not delete content." });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContent.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContent.map(item => String(item.id)));
    }
  }

  // filteredContent declaration removed from here

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Movies" value={movieCount} icon={Film} isLoading={loadingStats} />
        <StatCard title="Total TV Shows" value={tvShowCount} icon={Tv} isLoading={loadingStats} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlusCircle className="mr-2 h-6 w-6" />
              Add New Content
            </CardTitle>
            <CardDescription>
              Add new content using its TMDB ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentFormDialog onSave={onContentUpdated} currentUser={user}>
              <Button className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Content
              </Button>
            </ContentFormDialog>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          {user?.role === 'admin' && <TabsTrigger value="requests">Partner Applications</TabsTrigger>}
          <TabsTrigger value="livetv" className="flex items-center gap-2">
            <Tv className="h-4 w-4" /> Live TV
          </TabsTrigger>
          <TabsTrigger value="player" className="flex items-center gap-2">
            <Video className="h-4 w-4" /> Player Builder
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Ads Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <Separator className="my-4" />

          {/* Only Admins can see Settings */}
          {user?.role === 'admin' && (
            <>
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-6 w-6" />
                    Site Settings
                  </CardTitle>
                  <CardDescription>
                    Change global settings for the website.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-4">

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="siteTitle">Site Title (SEO)</Label>
                        <Input
                          id="siteTitle"
                          value={siteTitle}
                          onChange={(e) => setSiteTitle(e.target.value)}
                          placeholder="Moovie: Streaming Hub"
                          disabled={isSavingSettings}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="titleSuffix">Title Suffix (e.g. Hindi Dubbed)</Label>
                        <Input
                          id="titleSuffix"
                          value={titleSuffix}
                          onChange={(e) => setTitleSuffix(e.target.value)}
                          placeholder="Hindi Dubbed"
                          disabled={isSavingSettings}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="logoText">Logo Text</Label>
                        <Input
                          id="logoText"
                          value={logoText}
                          onChange={(e) => setLogoText(e.target.value)}
                          disabled={isSavingSettings}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paginationLimit">Movies per Page (Load More Limit)</Label>
                        <Input
                          id="paginationLimit"
                          type="number"
                          min="1"
                          value={paginationLimit}
                          onChange={(e) => setPaginationLimit(Number(e.target.value))}
                          disabled={isSavingSettings}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-red-50/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="global-downloads" className="text-base font-medium text-red-900">Enable "Download" Buttons Site-Wide</Label>
                        <p className="text-sm text-red-700">Turn this OFF to hide download buttons everywhere immediately.</p>
                      </div>
                      <Switch
                        id="global-downloads"
                        checked={globalDownloadsEnabled}
                        onCheckedChange={setGlobalDownloadsEnabled}
                        disabled={isSavingSettings}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-blue-50/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="live-carousel" className="text-base font-medium text-blue-900">Show Live TV Carousel</Label>
                        <p className="text-sm text-blue-700">Display the slide of recent Live TV channels on the home page.</p>
                      </div>
                      <Switch
                        id="live-carousel"
                        checked={showLiveTvCarousel}
                        onCheckedChange={setShowLiveTvCarousel}
                        disabled={isSavingSettings}
                      />
                    </div>

                    <div className="space-y-4 border p-4 rounded-lg bg-purple-50/50">
                      <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="featured-section" className="text-base font-medium text-purple-900">Show Featured Movies Section</Label>
                          <p className="text-sm text-purple-700">Display the curated list of movies above the main grid.</p>
                        </div>
                        <Switch
                          id="featured-section"
                          checked={showFeaturedSection}
                          onCheckedChange={setShowFeaturedSection}
                          disabled={isSavingSettings}
                        />
                      </div>

                      {showFeaturedSection && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                          <Label className="mb-2 block text-purple-900">Featured Layout Style</Label>
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="layout-slider"
                                name="featuredLayout"
                                value="slider"
                                checked={featuredLayout === 'slider'}
                                onChange={() => setFeaturedLayout('slider')}
                                className="accent-purple-600 h-4 w-4"
                              />
                              <Label htmlFor="layout-slider" className="cursor-pointer">Slider (Carousel)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="layout-grid"
                                name="featuredLayout"
                                value="grid"
                                checked={featuredLayout === 'grid'}
                                onChange={() => setFeaturedLayout('grid')}
                                className="accent-purple-600 h-4 w-4"
                              />
                              <Label htmlFor="layout-grid" className="cursor-pointer">Grid</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="layout-list"
                                name="featuredLayout"
                                value="list"
                                checked={featuredLayout === 'list'}
                                onChange={() => setFeaturedLayout('list')}
                                className="accent-purple-600 h-4 w-4"
                              />
                              <Label htmlFor="layout-list" className="cursor-pointer">List</Label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="secure-downloads" className="text-base font-medium">Secure Downloads</Label>
                        <p className="text-sm text-muted-foreground">Enable interstitial page with ads and countdown.</p>
                      </div>
                      <Switch
                        id="secure-downloads"
                        checked={secureDownloadsEnabled}
                        onCheckedChange={setSecureDownloadsEnabled}
                        disabled={isSavingSettings}
                      />
                    </div>
                    {secureDownloadsEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="downloadDelay">Countdown Timer (seconds)</Label>
                        <Input
                          id="downloadDelay"
                          type="number"
                          min="0"
                          value={downloadDelay}
                          onChange={(e) => setDownloadDelay(Number(e.target.value))}
                          disabled={isSavingSettings}
                        />
                      </div>
                    )}
                    <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                      {isSavingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </form>

                  <Separator className="my-6" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Sync Content Metadata</h3>
                      <p className="text-sm text-muted-foreground">
                        Refresh all content functionality (e.g. updating Last Air Dates for TV shows).
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleSyncMetadata} disabled={isSyncing}>
                      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Sync Now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Domain Migration Tool */}
              <Card className="mb-8 border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-900">
                    <RefreshCw className="mr-2 h-6 w-6" />
                    Domain Migration Tool
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    Batch update download link domains across all content. Use this when your file host changes domains.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert variant="default" className="border-orange-300 bg-orange-100/50">
                      <AlertTitle className="text-orange-900">⚠️ Powerful Tool - Use Carefully</AlertTitle>
                      <AlertDescription className="text-orange-800">
                        This will scan your entire database and replace domain strings in download links.
                        Make sure to double-check your inputs before confirming.
                      </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="oldDomain" className="text-orange-900">Old Domain (to find)</Label>
                        <Input
                          id="oldDomain"
                          value={oldDomain}
                          onChange={(e) => setOldDomain(e.target.value)}
                          placeholder="e.g., https://filmyzilla28.com"
                          disabled={isMigrating}
                          className="border-orange-200"
                        />
                        <p className="text-xs text-orange-600">Include https:// or http://</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newDomain" className="text-orange-900">New Domain (to replace)</Label>
                        <Input
                          id="newDomain"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          placeholder="e.g., https://filmyzilla29.com"
                          disabled={isMigrating}
                          className="border-orange-200"
                        />
                        <p className="text-xs text-orange-600">Must match protocol (http/https)</p>
                      </div>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          disabled={isMigrating || !oldDomain.trim() || !newDomain.trim()}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {isMigrating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Migrating Links...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Migrate Download Links
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Domain Migration</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>You are about to update all download links that contain:</p>
                            <div className="bg-muted p-3 rounded-md space-y-1 font-mono text-sm">
                              <p><strong>From:</strong> {oldDomain || '(not set)'}</p>
                              <p><strong>To:</strong> {newDomain || '(not set)'}</p>
                            </div>
                            <p className="text-destructive font-medium">
                              This action will modify your database. Make sure the domains are correct!
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleMigrateDomains}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Yes, Migrate Now
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div>
            {/* Content Management Section */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center">
                <History className="mr-2 h-6 w-6" />
                Recently Added Content
              </h2>
              {selectedIds.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete ({selectedIds.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {selectedIds.length} item(s).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(selectedIds)}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {loadingStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                    <Skeleton className="h-3 w-1/2 mt-1" />
                  </div>
                ))}
              </div>

            ) : filteredContent.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search content..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {user?.role === 'admin' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="selectAll"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredContent.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                      <Label htmlFor="selectAll" className='text-sm font-medium'>
                        {selectedIds.length > 0 ? `${selectedIds.length} of ${filteredContent.length} selected` : 'Select all'}
                      </Label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredContent.map((item, i) => (
                    <div key={`${item.id}-${i}`} className="relative group">
                      {user?.role === 'admin' && (
                        <div className="absolute top-2 left-2 z-30">
                          <Checkbox
                            id={`select-${item.id}`}
                            checked={selectedIds.includes(String(item.id))}
                            onCheckedChange={(checked) => handleSelectionChange(String(item.id), !!checked)}
                            className="bg-background/70 border-white/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary-foreground"
                          />
                        </div>
                      )}
                      <ContentCard
                        content={item}
                        showAdminControls={user?.role === 'admin'}
                        onEditSuccess={onContentUpdated}
                        onDeleteSuccess={() => handleDelete([String(item.id)])}
                        currentUser={user}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search content..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <p className="text-muted-foreground">No content found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Partner Applications</CardTitle>
              <CardDescription>Manage incoming requests to join the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">No requests found</TableCell>
                    </TableRow>
                  ) : (
                    partnerRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{req.fullname}</TableCell>
                        <TableCell>{req.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{req.username || '-'}</span>
                            {req.status === 'approved' && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCredentialEditor(req)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono">{req.password || '-'}</span>
                            {req.status === 'approved' && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCredentialEditor(req)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={req.message}>{req.message}</TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'approved' ? "default" : req.status === 'rejected' ? "destructive" : "secondary"}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApproveRequest(req)}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectRequest(req.id!)}>Reject</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={!!editingCredentials} onOpenChange={(open) => !open && setEditingCredentials(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Partner Credentials</DialogTitle>
                <DialogDescription>
                  Update the login credentials for {editingCredentials?.fullname}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">Password</Label>
                  <Input
                    id="edit-password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCredentials(null)}>Cancel</Button>
                <Button onClick={handleSaveCredentials} disabled={isUpdatingCreds}>
                  {isUpdatingCreds && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="livetv" className="space-y-6">
          <Card>
            <CardHeader id="live-tv-form-top">
              <CardTitle>{editingChannelId ? 'Edit Live TV Channel' : 'Add Live TV Channel'}</CardTitle>
              <CardDescription>{editingChannelId ? 'Update existing channel details.' : 'Add a new live streaming channel.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddLiveChannel} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Channel Title</Label>
                    <Input
                      value={liveTvForm.title}
                      onChange={e => setLiveTvForm({ ...liveTvForm, title: e.target.value })}
                      placeholder="e.g. CNN Live"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <div className="flex gap-2">
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={liveTvForm.country}
                        onChange={e => setLiveTvForm({ ...liveTvForm, country: e.target.value })}
                      >
                        <option value="USA">USA</option>
                        <option value="England">England</option>
                        <option value="Pakistan">Pakistan</option>
                        <option value="India">India</option>
                        <option value="China">China</option>
                        <option value="Russia">Russia</option>
                        <option value="UAE">UAE</option>
                        <option value="Saudi Arabia">Saudi Arabia</option>
                        <option value="Other">Other</option>
                      </select>
                      {liveTvForm.country === 'Other' && (
                        <Input
                          placeholder="Type country..."
                          value={liveTvForm.customCountry}
                          onChange={e => setLiveTvForm({ ...liveTvForm, customCountry: e.target.value })}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Live Stream URL</Label>
                    <Input
                      value={liveTvForm.streamUrl}
                      onChange={e => setLiveTvForm({ ...liveTvForm, streamUrl: e.target.value })}
                      placeholder="https://example.com/stream.m3u8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Embed Code (Iframe)</Label>
                    <Input
                      value={liveTvForm.embedCode}
                      onChange={e => setLiveTvForm({ ...liveTvForm, embedCode: e.target.value })}
                      placeholder="<iframe src='...'></iframe>"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={liveTvForm.tags}
                    onChange={e => setLiveTvForm({ ...liveTvForm, tags: e.target.value })}
                    placeholder="News, Sports, Music"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Poster Image URL</Label>
                  <Input
                    value={liveTvForm.posterUrl}
                    onChange={e => setLiveTvForm({ ...liveTvForm, posterUrl: e.target.value })}
                    placeholder="https://example.com/poster.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={liveTvForm.description}
                    onChange={e => setLiveTvForm({ ...liveTvForm, description: e.target.value })}
                    placeholder="Channel description..."
                  />
                </div>

                <div className="flex gap-2">
                  {editingChannelId && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isAddingChannel} className="flex-1">
                    {isAddingChannel ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      editingChannelId ? <RefreshCw className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />
                    )}
                    {editingChannelId ? 'Update Channel' : 'Add Channel'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localLiveChannels.map((channel) => (
              <Card key={channel.id} className="relative group">
                <CardHeader>
                  <CardTitle className="text-lg">{channel.title}</CardTitle>
                  <CardDescription>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{channel.country}</Badge>
                      {channel.streamUrl ? <Badge>Direct</Badge> : <Badge variant="secondary">Embed</Badge>}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{channel.description}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditLiveChannel(channel)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDeleteLiveChannel(channel.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="player">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="mr-2 h-6 w-6" />
                Player Builder
              </CardTitle>
              <CardDescription>
                Create and manage custom video players with playlists. Generate iframe codes for embedding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlayerBuilder onPlayerCreated={fetchDashboardData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-6 w-6" />
                Ads Management
              </CardTitle>
              <CardDescription>
                Manage ad networks, scripts, and placements. Control ads site-wide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdsManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
