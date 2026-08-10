
'use client';

import { useEffect, useState } from 'react';
import { getBrowseContent, getManuallyAddedContent } from '@/lib/tmdb';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Film, Tv, History, PlusCircle, Loader2, Settings, Trash2, RefreshCw, Search, Edit, Video, DollarSign, Send, CheckCircle, XCircle, Tag, Plus, Eye, BarChart3, Database } from 'lucide-react';
import AdminViewsAnalytics from './admin-views-analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentCard } from './content-card';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { ContentFormDialog } from './content-form-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getLogoText, updateLogoText, getPaginationLimit, updatePaginationLimit, syncContentMetadata, getSecureDownloadSettings, updateSecureDownloadSettings, migrateDownloadDomains, migrateDownloadLinks, previewLinkMigration, scanDatabaseDownloadLinks, getContentRequestsAction, updateContentRequestStatusAction, deleteContentRequestAction, addContent, getDownloadLinkPresets, updateDownloadLinkPresets } from '@/app/admin/actions';
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
import type { Content, SystemUser, PartnerRequest, LiveChannel, ContentRequest } from '@/lib/definitions';
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
  const [contentRequests, setContentRequests] = useState<ContentRequest[]>([]);
  const [addingRequestTmdbId, setAddingRequestTmdbId] = useState<string | null>(null);

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
  const [relatedItemsCount, setRelatedItemsCount] = useState<number>(6);
  const [relatedLayout, setRelatedLayout] = useState<'grid' | 'slider'>('grid');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Domain & Link Migration Tool State
  const [migrationMode, setMigrationMode] = useState<'domain' | 'path' | 'server' | 'custom'>('domain');
  const [oldDomain, setOldDomain] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [oldPath, setOldPath] = useState('');
  const [newPath, setNewPath] = useState('');
  const [oldServer, setOldServer] = useState('');
  const [newServer, setNewServer] = useState('');
  const [oldCustom, setOldCustom] = useState('');
  const [newCustom, setNewCustom] = useState('');
  const [flexMatch, setFlexMatch] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    matchCount: number;
    sampleMatches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }>;
  } | null>(null);

  // Database Link Inspector State
  const [dbScanData, setDbScanData] = useState<{
    domains: Array<{ domain: string; count: number }>;
    pathSegments: Array<{ segment: string; count: number }>;
    totalLinksCount: number;
    totalMoviesWithLinks: number;
  } | null>(null);
  const [isScanningDb, setIsScanningDb] = useState(false);

  const handleScanDatabase = async () => {
    setIsScanningDb(true);
    try {
      const res = await scanDatabaseDownloadLinks();
      if (res.success) {
        setDbScanData({
          domains: res.domains,
          pathSegments: res.pathSegments,
          totalLinksCount: res.totalLinksCount,
          totalMoviesWithLinks: res.totalMoviesWithLinks
        });
        toast({
          title: 'Database Scan Completed!',
          description: `Identified ${res.domains.length} unique domains & ${res.pathSegments.length} path patterns across ${res.totalLinksCount} download links.`
        });
      } else {
        toast({ variant: 'destructive', title: 'Scan Error', description: res.error || 'Failed to scan database' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Scan Error', description: 'Failed to inspect database download links.' });
    } finally {
      setIsScanningDb(false);
    }
  };

  // Link Title Presets State
  const [linkPresets, setLinkPresets] = useState<string[]>([]);
  const [newPresetInput, setNewPresetInput] = useState('');
  const [isSavingPresets, setIsSavingPresets] = useState(false);

  const filteredContent = recentlyAdded.filter(item =>
    (item.title || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [localContent, currentLogoText, currentLimit, secureSettings, presets] = await Promise.all([
        getManuallyAddedContent(),
        getLogoText(),
        getPaginationLimit(),
        getSecureDownloadSettings(),
        getDownloadLinkPresets()
      ]);

      setLogoText(currentLogoText);
      setPaginationLimit(currentLimit);
      setSecureDownloadsEnabled(secureSettings.enabled);
      setDownloadDelay(secureSettings.delay);
      setGlobalDownloadsEnabled(secureSettings.globalEnabled);
      setLinkPresets(presets);
      // Fetch Site Config for other settings
      const siteConfig = await getSiteConfigFromFirestore();
      setShowLiveTvCarousel(siteConfig.showLiveTvCarousel !== undefined ? siteConfig.showLiveTvCarousel : true);
      setSiteTitle(siteConfig.siteTitle || 'Moovie: Streaming Hub');
      setTitleSuffix(siteConfig.titleSuffix || 'Hindi Dubbed');
      setShowFeaturedSection(siteConfig.showFeaturedSection !== undefined ? siteConfig.showFeaturedSection : true);
      setFeaturedLayout(siteConfig.featuredLayout || 'slider');
      setRelatedItemsCount(siteConfig.relatedItemsCount || 6);
      setRelatedLayout(siteConfig.relatedLayout || 'grid');


      let myContent = localContent;

      // Filter for Partner
      if (user?.role === 'partner') {
        // Only show content uploaded by this partner
        myContent = localContent.filter(c => c.uploadedBy === user.id || c.uploadedBy === user.username);
      } else if (user?.role === 'admin') {
        // Fetch requests if admin
        const [requests, userContentRequests] = await Promise.all([
          getPartnerRequests(),
          getContentRequestsAction()
        ]);
        setPartnerRequests(requests);
        setContentRequests(userContentRequests);
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
        featuredLayout,
        relatedItemsCount,
        relatedLayout
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

  const getActiveMigrationParams = () => {
    if (migrationMode === 'domain') {
      return { findText: oldDomain.trim(), replaceText: newDomain.trim(), mode: 'domain' as const, isFlex: false };
    } else if (migrationMode === 'path') {
      return { findText: oldPath.trim(), replaceText: newPath.trim(), mode: 'path' as const, isFlex: flexMatch };
    } else if (migrationMode === 'server') {
      return { findText: oldServer.trim(), replaceText: newServer.trim(), mode: 'server' as const, isFlex: false };
    } else {
      return { findText: oldCustom.trim(), replaceText: newCustom.trim(), mode: 'custom' as const, isFlex: false };
    }
  };

  const handlePreviewMigration = async () => {
    const { findText, replaceText, mode, isFlex } = getActiveMigrationParams();
    if (!findText) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter text or pattern to find.' });
      return;
    }
    setIsPreviewing(true);
    try {
      const res = await previewLinkMigration(findText, replaceText, mode, isFlex);
      if (res.success) {
        setPreviewResult({
          matchCount: res.matchCount,
          sampleMatches: res.sampleMatches
        });
        toast({
          title: 'Database Scan Complete',
          description: `Found ${res.matchCount} matching items with download links.`
        });
      } else {
        toast({ variant: 'destructive', title: 'Scan Failed', description: res.error || 'Failed to scan database.' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to scan database.' });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleMigrateDomains = async () => {
    const { findText, replaceText, mode, isFlex } = getActiveMigrationParams();
    if (!findText) {
      toast({ variant: 'destructive', title: 'Error', description: 'Find text is required.' });
      return;
    }

    setIsMigrating(true);
    try {
      const result = await migrateDownloadLinks(findText, replaceText, mode, isFlex);
      if (result.success) {
        toast({
          title: 'Migration Successful!',
          description: `Successfully updated ${result.updatedCount} items in database.`
        });
        if (mode === 'domain') { setOldDomain(''); setNewDomain(''); }
        else if (mode === 'path') { setOldPath(''); setNewPath(''); }
        else if (mode === 'server') { setOldServer(''); setNewServer(''); }
        else { setOldCustom(''); setNewCustom(''); }

        setPreviewResult(null);
        await handleScanDatabase();
        await fetchAdminContent();
      } else {
        throw new Error(result.error || 'Migration failed');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: error instanceof Error ? error.message : 'Could not migrate links.'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleAddPreset = async () => {
    const clean = newPresetInput.trim();
    if (!clean) return;
    if ((linkPresets || []).includes(clean)) {
      toast({ variant: 'destructive', title: 'Already exists', description: 'This title preset is already in your list.' });
      return;
    }
    const updated = [...linkPresets, clean];
    setLinkPresets(updated);
    setNewPresetInput('');
    setIsSavingPresets(true);
    try {
      const res = await updateDownloadLinkPresets(updated);
      if (res.success) {
        toast({ title: 'Preset Added!', description: `Saved "${clean}" to preset titles.` });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Failed to save preset.' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save preset.' });
    } finally {
      setIsSavingPresets(false);
    }
  };

  const handleRemovePreset = async (indexToRemove: number) => {
    const updated = linkPresets.filter((_, idx) => idx !== indexToRemove);
    setLinkPresets(updated);
    setIsSavingPresets(true);
    try {
      const res = await updateDownloadLinkPresets(updated);
      if (res.success) {
        toast({ title: 'Preset Removed' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Failed to remove preset.' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove preset.' });
    } finally {
      setIsSavingPresets(false);
    }
  };

  const handleResetPresets = async () => {
    const { DEFAULT_LINK_PRESETS } = await import('@/lib/firestore');
    setLinkPresets(DEFAULT_LINK_PRESETS);
    setIsSavingPresets(true);
    try {
      const res = await updateDownloadLinkPresets(DEFAULT_LINK_PRESETS);
      if (res.success) {
        toast({ title: 'Presets Reset to Defaults!' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset presets.' });
    } finally {
      setIsSavingPresets(false);
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

  const handleQuickAddContentRequest = async (req: ContentRequest) => {
    setAddingRequestTmdbId(req.tmdbId);
    try {
      const res = await addContent(req.tmdbId, req.type);
      if (res.success) {
        await updateContentRequestStatusAction(req.tmdbId, 'fulfilled');
        toast({
          title: 'Import Successful!',
          description: `"${req.title}" has been added to your site library.`,
        });
        fetchDashboardData();
      } else {
        toast({
          title: 'Import Failed',
          description: res.error || 'Could not fetch details from TMDB.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing content request:', error);
      toast({
        title: 'Error',
        description: 'Failed to import request.',
        variant: 'destructive',
      });
    } finally {
      setAddingRequestTmdbId(null);
    }
  };

  const handleUpdateContentRequestStatus = async (id: string, status: 'pending' | 'fulfilled' | 'rejected') => {
    try {
      await updateContentRequestStatusAction(id, status);
      toast({
        title: 'Status Updated',
        description: `Request marked as ${status}.`,
      });
      const updated = await getContentRequestsAction();
      setContentRequests(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteContentRequest = async (id: string) => {
    try {
      await deleteContentRequestAction(id);
      toast({
        title: 'Request Deleted',
      });
      const updated = await getContentRequestsAction();
      setContentRequests(updated);
    } catch (err) {
      console.error('Failed to delete request:', err);
    }
  };

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
        <div className="w-full overflow-x-auto pb-1 max-w-full no-scrollbar">
          <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg w-max min-w-full justify-start gap-1">
            <TabsTrigger value="content" className="text-xs sm:text-sm py-2 px-3 shrink-0 whitespace-nowrap">
              Content
            </TabsTrigger>
            {user?.role === 'admin' && (
              <>
                <TabsTrigger value="requests" className="text-xs sm:text-sm py-2 px-3 shrink-0 whitespace-nowrap">
                  Partner Applications
                </TabsTrigger>
                <TabsTrigger value="content_requests" className="text-xs sm:text-sm py-2 px-3 shrink-0 whitespace-nowrap flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Content Requests
                  {contentRequests.filter(r => r.status === 'pending').length > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px] h-4">
                      {contentRequests.filter(r => r.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="livetv" className="text-xs sm:text-sm py-2 px-3 shrink-0 whitespace-nowrap flex items-center gap-1.5">
              <Tv className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Live TV
            </TabsTrigger>
            <TabsTrigger value="player" className="text-xs sm:text-sm py-2 px-3 shrink-0 whitespace-nowrap flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Player Builder
            </TabsTrigger>
            <TabsTrigger value="ads" className="text-xs sm:text-sm py-2 px-3 shrink-0 whitespace-nowrap flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Ads Management
            </TabsTrigger>
            <TabsTrigger value="views" className="text-xs sm:text-sm py-2 px-3 shrink-0 whitespace-nowrap flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Views & Analytics
            </TabsTrigger>
          </TabsList>
        </div>

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

                    <div className="space-y-4 border p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                      <div className="space-y-1">
                        <Label className="text-base font-medium text-emerald-900 dark:text-emerald-300">Related Movies & Channels Settings</Label>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">Configure layout and display limits for related content on watch pages.</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-2">
                          <Label htmlFor="relatedItemsCount">Initial Cards to Display</Label>
                          <Input
                            id="relatedItemsCount"
                            type="number"
                            min="1"
                            max="30"
                            value={relatedItemsCount}
                            onChange={(e) => setRelatedItemsCount(Math.max(1, Number(e.target.value)))}
                            disabled={isSavingSettings}
                          />
                          <p className="text-xs text-muted-foreground">Default is 6 cards before clicking "Load More".</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="mb-2 block">Display Layout Style</Label>
                          <div className="flex gap-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="related-layout-grid"
                                name="relatedLayout"
                                value="grid"
                                checked={relatedLayout === 'grid'}
                                onChange={() => setRelatedLayout('grid')}
                                className="accent-emerald-600 h-4 w-4"
                              />
                              <Label htmlFor="related-layout-grid" className="cursor-pointer font-medium">Grid</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="related-layout-slider"
                                name="relatedLayout"
                                value="slider"
                                checked={relatedLayout === 'slider'}
                                onChange={() => setRelatedLayout('slider')}
                                className="accent-emerald-600 h-4 w-4"
                              />
                              <Label htmlFor="related-layout-slider" className="cursor-pointer font-medium">Slider (Carousel)</Label>
                            </div>
                          </div>
                        </div>
                      </div>
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

              {/* Download Link Preset Titles Manager Card */}
              <Card className="mb-8 border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center text-indigo-950 dark:text-indigo-300">
                    <Tag className="mr-2 h-6 w-6 text-indigo-600" />
                    Download Link Title Presets Manager
                  </CardTitle>
                  <CardDescription className="text-indigo-900/80 dark:text-indigo-300/80">
                    Save your most frequently used quality & download link titles (e.g. <code className="bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded font-mono text-xs">720p HD [900MB]</code>, <code className="bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded font-mono text-xs">Hindi Dubbed 1080p</code>). These presets will automatically appear in your Filmyzilla Link Builder & Content Form dropdowns for fast 1-click selection!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Preset Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type title preset (e.g. 1080p Full HD [2.5GB] or Season 1 Complete)..."
                      value={newPresetInput}
                      onChange={(e) => setNewPresetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPreset();
                        }
                      }}
                      className="text-xs font-medium border-indigo-200"
                    />
                    <Button
                      type="button"
                      onClick={handleAddPreset}
                      disabled={isSavingPresets || !newPresetInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                    >
                      {isSavingPresets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                      Add Title Preset
                    </Button>
                  </div>

                  {/* Saved Presets Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-300">
                        Saved Presets ({linkPresets.length}):
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetPresets}
                        disabled={isSavingPresets}
                        className="text-[11px] text-muted-foreground hover:text-indigo-600 h-6 px-2"
                      >
                        Reset Defaults
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-indigo-200/80 bg-background/80 min-h-[60px] items-center">
                      {linkPresets.map((preset, idx) => (
                        <div
                          key={idx}
                          className="group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100/80 text-indigo-950 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition-all hover:border-indigo-400"
                        >
                          <span>{preset}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePreset(idx)}
                            className="text-indigo-400 hover:text-destructive p-0.5 rounded-full transition-colors"
                            title="Delete preset"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {linkPresets.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No presets saved yet. Add some above or click Reset Defaults!</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Link Migration & Pattern Replacement Tool */}
              <Card className="mb-8 border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-900 dark:text-orange-400">
                    <RefreshCw className="mr-2 h-6 w-6 text-orange-600" />
                    Link Migration & URL Replacement Tool
                  </CardTitle>
                  <CardDescription className="text-orange-800 dark:text-orange-300">
                    Batch replace ANY text, domain, path segment (e.g. <code className="bg-orange-200/60 dark:bg-orange-900/60 px-1 py-0.5 rounded text-xs font-mono">/download/</code> ➔ <code className="bg-orange-200/60 dark:bg-orange-900/60 px-1 py-0.5 rounded text-xs font-mono">/verified/</code>), or server suffix across all content download links in your database.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <Alert variant="default" className="border-orange-300 bg-orange-100/60 dark:bg-orange-900/20">
                      <AlertTitle className="text-orange-900 dark:text-orange-300 font-semibold flex items-center gap-1">
                        ⚠️ Powerful Multi-Pattern Replacer
                      </AlertTitle>
                      <AlertDescription className="text-orange-800 dark:text-orange-400 text-xs">
                        This tool updates download URLs across all movies and series in your database. Use the <strong>Scan & Preview</strong> button first to see exactly how many items and URLs will be updated.
                      </AlertDescription>
                    </Alert>

                    {/* Database Auto-Scan Panel */}
                    <div className="p-4 rounded-lg border border-orange-300 bg-orange-50/60 dark:bg-orange-950/20 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200/80 pb-2">
                        <div>
                          <h4 className="text-sm font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                            🔍 Database Download Link Inspector & Scanner
                          </h4>
                          <p className="text-xs text-orange-800 dark:text-orange-300">
                            Scans all movies & TV shows in database to detect active domains & URL path patterns.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isScanningDb}
                          onClick={handleScanDatabase}
                          className="bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs shadow-sm"
                        >
                          {isScanningDb ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Scanning DB...
                            </>
                          ) : (
                            <>
                              <Search className="mr-1.5 h-3.5 w-3.5" />
                              Scan Database Now
                            </>
                          )}
                        </Button>
                      </div>

                      {dbScanData && (
                        <div className="space-y-3 text-xs pt-1">
                          <div className="flex flex-wrap gap-4 text-orange-900 dark:text-orange-200 font-medium bg-orange-100/60 dark:bg-orange-900/30 p-2 rounded border border-orange-200">
                            <span>📊 Total Movies with Links: <strong>{dbScanData.totalMoviesWithLinks}</strong></span>
                            <span>🔗 Total Download Links: <strong>{dbScanData.totalLinksCount}</strong></span>
                          </div>

                          {/* Detected Domains */}
                          {dbScanData.domains.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="font-semibold text-orange-900 dark:text-orange-300 flex items-center justify-between">
                                <span>Detected Domains in Database (click to set in Domain Migration):</span>
                                {dbScanData.domains.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMigrationMode('domain');
                                      setOldDomain(dbScanData.domains.map(d => d.domain).join(', '));
                                      setPreviewResult(null);
                                    }}
                                    className="text-[11px] text-orange-600 hover:underline font-normal"
                                  >
                                    Select All Domains
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                {dbScanData.domains.map((d, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    onClick={() => {
                                      setMigrationMode('domain');
                                      setOldDomain(d.domain);
                                      setPreviewResult(null);
                                    }}
                                    className="cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/60 bg-background border-orange-300 text-orange-950 dark:text-orange-200 font-mono text-[11px] py-0.5 px-2 flex items-center gap-1"
                                  >
                                    🌐 {d.domain} <span className="text-[10px] bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100 rounded px-1">{d.count}</span>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Detected Path Segments */}
                          {dbScanData.pathSegments.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <div className="font-semibold text-orange-900 dark:text-orange-300 flex items-center justify-between">
                                <span>Detected Path Words / Segments (click to set in Path Migration):</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMigrationMode('path');
                                    setOldPath('download, downloads, verifieds');
                                    setNewPath('verified');
                                    setPreviewResult(null);
                                  }}
                                  className="text-[11px] text-orange-600 hover:underline font-normal"
                                >
                                  ✨ Set Quick Path Fix: downloads/verifieds ➔ verified
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                {dbScanData.pathSegments.map((s, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    onClick={() => {
                                      setMigrationMode('path');
                                      setOldPath(s.segment);
                                      setPreviewResult(null);
                                    }}
                                    className="cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/60 bg-background border-orange-300 text-orange-950 dark:text-orange-200 font-mono text-[11px] py-0.5 px-2 flex items-center gap-1"
                                  >
                                    📁 /{s.segment}/ <span className="text-[10px] bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100 rounded px-1">{s.count}</span>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Migration Mode Sub-Tabs */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 border-b border-orange-200 pb-2">
                        <Button
                          type="button"
                          variant={migrationMode === 'domain' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setMigrationMode('domain');
                            setPreviewResult(null);
                          }}
                          className={migrationMode === 'domain' ? 'bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs' : 'border-orange-300 text-orange-950 dark:text-orange-200 text-xs'}
                        >
                          🌐 Domain Migration Only
                        </Button>
                        <Button
                          type="button"
                          variant={migrationMode === 'path' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setMigrationMode('path');
                            setPreviewResult(null);
                          }}
                          className={migrationMode === 'path' ? 'bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs' : 'border-orange-300 text-orange-950 dark:text-orange-200 text-xs'}
                        >
                          📁 Middle Path Segment Migration
                        </Button>
                        <Button
                          type="button"
                          variant={migrationMode === 'server' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setMigrationMode('server');
                            setPreviewResult(null);
                          }}
                          className={migrationMode === 'server' ? 'bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs' : 'border-orange-300 text-orange-950 dark:text-orange-200 text-xs'}
                        >
                          🖥️ Server Suffix Migration
                        </Button>
                        <Button
                          type="button"
                          variant={migrationMode === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setMigrationMode('custom');
                            setPreviewResult(null);
                          }}
                          className={migrationMode === 'custom' ? 'bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs' : 'border-orange-300 text-orange-950 dark:text-orange-200 text-xs'}
                        >
                          🔧 Custom Exact Pattern
                        </Button>
                      </div>

                      {/* Domain Mode */}
                      {migrationMode === 'domain' && (
                        <div className="p-4 rounded-lg border border-orange-300 bg-orange-50/30 dark:bg-orange-950/10 space-y-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                              🌐 Domain Migration Mode
                            </h4>
                            <p className="text-xs text-orange-800 dark:text-orange-300">
                              🔒 <strong>Isolated Execution:</strong> ONLY changes domain hostnames (e.g., <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[11px]">filmyzilla53.com</code> ➔ <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[11px]">filmyzilla54.com</code>). It will <strong>NEVER</strong> touch middle path words like <code className="font-mono">/verified/</code> or server numbers like <code className="font-mono">/server_1</code>.
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <Label htmlFor="oldDomainInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Find Old Domain(s)</Label>
                              <Input
                                id="oldDomainInput"
                                value={oldDomain}
                                onChange={(e) => {
                                  setOldDomain(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. filmyzilla53.com or filmyzilla29.com, filmyzilla30.com"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                              <p className="text-[11px] text-orange-700 dark:text-orange-400">Can be single domain or comma-separated list of domains.</p>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="newDomainInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Replace With Target Domain</Label>
                              <Input
                                id="newDomainInput"
                                value={newDomain}
                                onChange={(e) => {
                                  setNewDomain(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. filmyzilla54.com"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                              <p className="text-[11px] text-orange-700 dark:text-orange-400">Target domain hostname.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Path Mode */}
                      {migrationMode === 'path' && (
                        <div className="p-4 rounded-lg border border-orange-300 bg-orange-50/30 dark:bg-orange-950/10 space-y-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                              📁 Middle Path Segment Migration Mode
                            </h4>
                            <p className="text-xs text-orange-800 dark:text-orange-300">
                              🔒 <strong>Isolated Execution:</strong> ONLY changes URL path words (e.g., <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[11px]">/download/</code> ➔ <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[11px]">/verified/</code>). It will <strong>NEVER</strong> touch domain names like <code className="font-mono">filmyzilla54.com</code> or server numbers.
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <Label htmlFor="oldPathInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Find Path Segment / Word(s)</Label>
                              <Input
                                id="oldPathInput"
                                value={oldPath}
                                onChange={(e) => {
                                  setOldPath(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. download, downloads, verifieds"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                              <p className="text-[11px] text-orange-700 dark:text-orange-400">Target word(s) between slashes in the link path.</p>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="newPathInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Replace With Target Path Segment</Label>
                              <Input
                                id="newPathInput"
                                value={newPath}
                                onChange={(e) => {
                                  setNewPath(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. verified"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                              <p className="text-[11px] text-orange-700 dark:text-orange-400">Target replacement word.</p>
                            </div>
                          </div>

                          {/* Flex Match Checkbox ONLY for Path mode */}
                          <div className="p-3 rounded-md border border-orange-200 bg-orange-100/50 dark:bg-orange-950/20">
                            <label htmlFor="flexMatchPath" className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                id="flexMatchPath"
                                checked={flexMatch}
                                onChange={(e) => {
                                  setFlexMatch(e.target.checked);
                                  setPreviewResult(null);
                                }}
                                className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                              <div className="text-xs text-orange-950 dark:text-orange-200 font-medium">
                                ✨ <strong>Smart Singular & Plural Flex Match</strong> (Optional for Path mode)
                                <span className="block text-[11px] text-orange-800 dark:text-orange-300 font-normal mt-0.5">
                                  When enabled, searching for <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[10px]">download</code> automatically matches both <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[10px]">download</code> and <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[10px]">downloads</code>.
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Server Suffix Mode */}
                      {migrationMode === 'server' && (
                        <div className="p-4 rounded-lg border border-orange-300 bg-orange-50/30 dark:bg-orange-950/10 space-y-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                              🖥️ Server Suffix Migration Mode
                            </h4>
                            <p className="text-xs text-orange-800 dark:text-orange-300">
                              🔒 <strong>Isolated Execution:</strong> ONLY changes server numbers/suffixes at the end of download links (e.g., <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[11px]">/server_1</code> ➔ <code className="font-mono bg-orange-200/80 dark:bg-orange-900/80 px-1 py-0.5 rounded text-[11px]">/server_2</code>).
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <Label htmlFor="oldServerInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Find Server Suffix</Label>
                              <Input
                                id="oldServerInput"
                                value={oldServer}
                                onChange={(e) => {
                                  setOldServer(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. /server_1 or server_1"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="newServerInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Replace With Target Server Suffix</Label>
                              <Input
                                id="newServerInput"
                                value={newServer}
                                onChange={(e) => {
                                  setNewServer(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. /server_2"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom Mode */}
                      {migrationMode === 'custom' && (
                        <div className="p-4 rounded-lg border border-orange-300 bg-orange-50/30 dark:bg-orange-950/10 space-y-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                              🔧 Custom Exact Pattern Replacer
                            </h4>
                            <p className="text-xs text-orange-800 dark:text-orange-300">
                              Direct string replacement for any arbitrary custom text.
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <Label htmlFor="oldCustomInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Find Custom Text</Label>
                              <Input
                                id="oldCustomInput"
                                value={oldCustom}
                                onChange={(e) => {
                                  setOldCustom(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. custom text or link snippet"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="newCustomInput" className="text-orange-900 dark:text-orange-300 font-medium text-xs">Replace With Target Text</Label>
                              <Input
                                id="newCustomInput"
                                value={newCustom}
                                onChange={(e) => {
                                  setNewCustom(e.target.value);
                                  setPreviewResult(null);
                                }}
                                placeholder="e.g. new replacement text"
                                disabled={isMigrating || isPreviewing}
                                className="border-orange-200 font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview Results Box */}
                    {previewResult && (
                      <div className="p-4 rounded-lg border border-orange-300 bg-background space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-semibold text-sm text-orange-900 dark:text-orange-300">
                            Scan Results ({migrationMode.toUpperCase()} Mode): <span className="text-orange-600 font-bold">{previewResult.matchCount} items</span> found matching <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{getActiveMigrationParams().findText}</code>
                          </span>
                        </div>
                        {previewResult.sampleMatches.length > 0 ? (
                          <div className="space-y-2 text-xs">
                            <p className="text-muted-foreground font-medium">Sample Preview Transformations:</p>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                              {previewResult.sampleMatches.map((m, idx) => (
                                <div key={idx} className="p-2 rounded bg-muted/50 border font-mono space-y-1">
                                  <div className="font-sans font-semibold text-foreground">{m.title}</div>
                                  <div className="text-destructive truncate">BEFORE: {m.oldUrl}</div>
                                  <div className="text-emerald-600 dark:text-emerald-400 truncate">AFTER: {m.newUrlPreview}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No download links currently match "{getActiveMigrationParams().findText}".</p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 items-center pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPreviewing || isMigrating || !getActiveMigrationParams().findText}
                        onClick={handlePreviewMigration}
                        className="border-orange-300 text-orange-900 dark:text-orange-300 hover:bg-orange-100"
                      >
                        {isPreviewing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Scanning Database...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4 text-orange-600" />
                            Scan Database & Preview ({migrationMode.toUpperCase()})
                          </>
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="default"
                            disabled={isMigrating || !getActiveMigrationParams().findText}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            {isMigrating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Migrating Links...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Execute {migrationMode.toUpperCase()} Migration
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm {migrationMode.toUpperCase()} Migration</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <p>You are about to scan and update download links in <strong>{migrationMode.toUpperCase()} mode</strong> across your database:</p>
                                <div className="bg-muted p-3 rounded-md space-y-1 font-mono text-sm break-all">
                                  <p><strong>Mode:</strong> {migrationMode.toUpperCase()} Only</p>
                                  <p><strong>Find Pattern:</strong> {getActiveMigrationParams().findText || '(not set)'}</p>
                                  <p><strong>Replace With:</strong> {getActiveMigrationParams().replaceText || '(empty / remove)'}</p>
                                  {previewResult && (
                                    <p className="text-orange-600 font-bold pt-1 font-sans">
                                      Affected Items: {previewResult.matchCount} content item(s)
                                    </p>
                                  )}
                                </div>
                                <p className="text-destructive font-medium text-xs">
                                  This action will permanently update matched download URLs in Firestore using strict {migrationMode} isolation.
                                </p>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleMigrateDomains}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Yes, Execute Migration
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
                            checked={(selectedIds || []).includes(String(item.id))}
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

        <TabsContent value="content_requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>User Content Requests</span>
                <Badge variant="outline" className="text-xs">
                  {contentRequests.length} Total Requests
                </Badge>
              </CardTitle>
              <CardDescription>
                Movies and TV Series requested by users. Click "Import to Library" to automatically add the content from TMDB into your site library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poster</TableHead>
                    <TableHead>Title & Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Request Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No content requests received yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contentRequests.map((req) => (
                      <TableRow key={req.id || req.tmdbId}>
                        <TableCell className="w-16">
                          {req.posterPath ? (
                            <img
                              src={req.posterPath.startsWith('http') ? req.posterPath : `https://image.tmdb.org/t/p/w92${req.posterPath}`}
                              alt={req.title}
                              className="w-10 h-14 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              No Image
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{req.title}</div>
                          <div className="text-xs text-muted-foreground">
                            TMDB ID: {req.tmdbId} {req.releaseDate ? `• (${req.releaseDate.split('-')[0]})` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {req.type === 'tv' ? 'TV Series' : 'Movie'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-bold px-2 py-0.5">
                            🔥 {req.requestCount || 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'fulfilled' ? "default" : req.status === 'rejected' ? "destructive" : "secondary"}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={addingRequestTmdbId === req.tmdbId}
                                onClick={() => handleQuickAddContentRequest(req)}
                              >
                                {addingRequestTmdbId === req.tmdbId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                )}
                                Import to Library
                              </Button>
                            )}

                            {req.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateContentRequestStatus(req.tmdbId, 'rejected')}
                              >
                                Reject
                              </Button>
                            )}

                            {req.status === 'fulfilled' && (
                              <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">
                                Added to Library
                              </Badge>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteContentRequest(req.tmdbId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                  <div className="text-sm text-muted-foreground pt-1">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{channel.country}</Badge>
                      {channel.streamUrl ? <Badge>Direct</Badge> : <Badge variant="secondary">Embed</Badge>}
                    </span>
                  </div>
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

        <TabsContent value="views">
          <AdminViewsAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
