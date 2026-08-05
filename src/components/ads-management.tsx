'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit, Power, PowerOff, Code, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AdNetwork, AdScript, AdZone, AdSettings, AdType } from '@/lib/definitions';

export default function AdsManagement() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // State
    const [networks, setNetworks] = useState<AdNetwork[]>([]);
    const [scripts, setScripts] = useState<AdScript[]>([]);
    const [zones, setZones] = useState<AdZone[]>([]);
    const [settings, setSettings] = useState<AdSettings | null>(null);

    // Dialogs
    const [showNetworkDialog, setShowNetworkDialog] = useState(false);
    const [showScriptDialog, setShowScriptDialog] = useState(false);
    const [showZoneDialog, setShowZoneDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

    // Forms
    const [networkForm, setNetworkForm] = useState({ name: '', isEnabled: true });
    const [scriptForm, setScriptForm] = useState({ networkId: '', adType: 'banner_728x90' as AdType, script: '', isEnabled: true });
    const [zoneForm, setZoneForm] = useState({
        name: '',
        page: 'home' as 'home' | 'watch' | 'download' | 'live-tv' | 'browse' | 'all',
        position: '',
        adType: 'banner_728x90' as AdType,
        scriptId: '',
        isEnabled: true,
        rotation: false,
        lazyLoad: true,
        trigger: 'load' as 'load' | 'scroll' | 'click' | 'time' | 'exit_intent',
        delay: 0,
        frequency: 2
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Pre-seed zones if empty (run once)
    const seedZones = async () => {
        if (zones.length > 0) return;

        setIsLoading(true);
        try {
            const defaultZones = [
                // Homepage
                { name: 'Homepage Hero Banner', page: 'home', position: 'homepage_hero', adType: 'banner_728x90' },
                { name: 'Homepage In-Feed 1', page: 'home', position: 'homepage_feed_0', adType: 'native' },
                { name: 'Homepage In-Feed 2', page: 'home', position: 'homepage_feed_1', adType: 'native' },
                { name: 'Homepage Popup', page: 'home', position: 'homepage_popup', adType: 'popup', trigger: 'time', delay: 30 },

                // Watch Page
                { name: 'Watch Page Top Banner', page: 'watch', position: 'watch_above_player', adType: 'banner_728x90' },
                { name: 'Watch Page Native', page: 'watch', position: 'watch_below_content', adType: 'native' },
                { name: 'Watch Page Popup', page: 'watch', position: 'watch_popup', adType: 'popup', trigger: 'time', delay: 30 },
            ];

            for (const zone of defaultZones) {
                await fetch('/api/admin/ads/zones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...zone,
                        isEnabled: true,
                        rotation: false,
                        lazyLoad: true
                    })
                });
            }
            fetchAllData();
            toast({ title: 'Success', description: 'Default zones seeded' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to seed zones', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [networksData, scriptsData, zonesData, settingsData] = await Promise.all([
                fetch('/api/admin/ads/networks').then(r => r.json()),
                fetch('/api/admin/ads/scripts').then(r => r.json()),
                fetch('/api/admin/ads/zones').then(r => r.json()),
                fetch('/api/admin/ads/settings').then(r => r.json())
            ]);
            setNetworks(networksData);
            setScripts(scriptsData);
            setZones(zonesData);
            setSettings(settingsData);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load ads data', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    // Network CRUD
    const handleSaveNetwork = async () => {
        setIsLoading(true);
        try {
            const url = editingId ? `/api/admin/ads/networks?id=${editingId}` : '/api/admin/ads/networks';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(networkForm)
            });

            if (response.ok) {
                toast({ title: 'Success', description: editingId ? 'Network updated' : 'Network created' });
                setShowNetworkDialog(false);
                setNetworkForm({ name: '', isEnabled: true });
                setEditingId(null);
                fetchAllData();
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save network', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteNetwork = async (id: string) => {
        setIsLoading(true);
        try {
            await fetch(`/api/admin/ads/networks?id=${id}`, { method: 'DELETE' });
            toast({ title: 'Success', description: 'Network deleted' });
            fetchAllData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete network', variant: 'destructive' });
        } finally {
            setIsLoading(false);
            setShowDeleteDialog(false);
        }
    };

    // Script CRUD
    const handleSaveScript = async () => {
        setIsLoading(true);
        try {
            const url = editingId ? `/api/admin/ads/scripts?id=${editingId}` : '/api/admin/ads/scripts';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scriptForm)
            });

            if (response.ok) {
                toast({ title: 'Success', description: editingId ? 'Script updated' : 'Script created' });
                setShowScriptDialog(false);
                setScriptForm({ networkId: '', adType: 'banner_728x90', script: '', isEnabled: true });
                setEditingId(null);
                fetchAllData();
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save script', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    // Zone CRUD
    const handleSaveZone = async () => {
        setIsLoading(true);
        try {
            const url = editingId ? `/api/admin/ads/zones?id=${editingId}` : '/api/admin/ads/zones';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(zoneForm)
            });

            if (response.ok) {
                toast({ title: 'Success', description: editingId ? 'Zone updated' : 'Zone created' });
                setShowZoneDialog(false);
                setEditingId(null);
                fetchAllData();
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save zone', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteZone = async (id: string) => {
        setIsLoading(true);
        try {
            await fetch(`/api/admin/ads/zones?id=${id}`, { method: 'DELETE' });
            toast({ title: 'Success', description: 'Zone deleted' });
            fetchAllData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete zone', variant: 'destructive' });
        } finally {
            setIsLoading(false);
            setShowDeleteDialog(false);
        }
    };

    // Settings
    const handleSaveSettings = async () => {
        if (!settings) return;
        setIsLoading(true);
        try {
            await fetch('/api/admin/ads/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            toast({ title: 'Success', description: 'Settings updated' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const adTypes: { value: AdType; label: string }[] = [
        { value: 'popup', label: 'Pop-up/Pop-under' },
        { value: 'banner_728x90', label: 'Banner 728x90' },
        { value: 'banner_468x60', label: 'Banner 468x60' },
        { value: 'banner_300x250', label: 'Banner 300x250' },
        { value: 'native', label: 'Native Banner' },
        { value: 'social_bar', label: 'Social Bar' },
        { value: 'direct_link', label: 'Direct Link' },
        { value: 'video', label: 'Video Ad' },
        { value: 'in_page_push', label: 'In-Page Push' }
    ];

    return (
        <div className="space-y-6">
            <Tabs defaultValue="networks" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="networks">Ad Networks</TabsTrigger>
                    <TabsTrigger value="scripts">Ad Scripts</TabsTrigger>
                    <TabsTrigger value="zones">Ad Zones</TabsTrigger>
                    <TabsTrigger value="settings">Global Settings</TabsTrigger>
                </TabsList>

                {/* Ad Networks Tab */}
                <TabsContent value="networks">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Ad Networks</CardTitle>
                                    <CardDescription>Manage your ad network providers (Adsterra, PropellerAds, etc.)</CardDescription>
                                </div>
                                <Button onClick={() => { setShowNetworkDialog(true); setEditingId(null); }}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Network
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                            ) : networks.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No ad networks yet. Add your first one!</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {networks.map((network) => (
                                            <TableRow key={network.id}>
                                                <TableCell className="font-medium">{network.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={network.isEnabled ? 'default' : 'secondary'}>
                                                        {network.isEnabled ? <Power className="h-3 w-3 mr-1" /> : <PowerOff className="h-3 w-3 mr-1" />}
                                                        {network.isEnabled ? 'Active' : 'Disabled'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{new Date(network.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button size="sm" variant="outline" onClick={() => {
                                                        setNetworkForm({ name: network.name, isEnabled: network.isEnabled });
                                                        setEditingId(network.id);
                                                        setShowNetworkDialog(true);
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => {
                                                        setDeleteTarget({ type: 'network', id: network.id });
                                                        setShowDeleteDialog(true);
                                                    }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Ad Scripts Tab */}
                <TabsContent value="scripts">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Ad Scripts</CardTitle>
                                    <CardDescription>Manage ad codes/scripts for different ad types</CardDescription>
                                </div>
                                <Button onClick={() => { setShowScriptDialog(true); setEditingId(null); }} disabled={networks.length === 0}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Script
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {networks.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">Please add an ad network first</div>
                            ) : isLoading ? (
                                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                            ) : scripts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No ad scripts yet. Add your first one!</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Network</TableHead>
                                            <TableHead>Ad Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {scripts.map((script) => {
                                            const network = networks.find(n => n.id === script.networkId);
                                            return (
                                                <TableRow key={script.id}>
                                                    <TableCell>{network?.name || 'Unknown'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{adTypes.find(t => t.value === script.adType)?.label}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={script.isEnabled ? 'default' : 'secondary'}>
                                                            {script.isEnabled ? 'Active' : 'Disabled'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="sm" variant="outline" onClick={() => {
                                                            setScriptForm({
                                                                networkId: script.networkId,
                                                                adType: script.adType,
                                                                script: script.script,
                                                                isEnabled: script.isEnabled
                                                            });
                                                            setEditingId(script.id);
                                                            setShowScriptDialog(true);
                                                        }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={async () => {
                                                            await fetch(`/api/admin/ads/scripts?id=${script.id}`, { method: 'DELETE' });
                                                            fetchAllData();
                                                        }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Ad Zones Tab */}
                <TabsContent value="zones">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Ad Zones</CardTitle>
                                    <CardDescription>Configure placements. {zones.length === 0 && 'Click "Seed Defaults" to start.'}</CardDescription>
                                </div>
                                <div className="space-x-2">
                                    {zones.length === 0 && (
                                        <Button variant="secondary" onClick={seedZones} disabled={isLoading}>
                                            <RefreshCw className="h-4 w-4 mr-2" /> Seed Defaults
                                        </Button>
                                    )}
                                    <Button onClick={() => {
                                        setZoneForm({
                                            name: '', page: 'home', position: '', adType: 'banner_728x90',
                                            scriptId: '', isEnabled: true, rotation: false, lazyLoad: true,
                                            trigger: 'load', delay: 0, frequency: 2
                                        });
                                        setEditingId(null);
                                        setShowZoneDialog(true);
                                    }}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Zone
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                            ) : zones.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No zones configured.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Zone Name</TableHead>
                                            <TableHead>Page</TableHead>
                                            <TableHead>Position ID</TableHead>
                                            <TableHead>Ad Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {zones.map((zone) => (
                                            <TableRow key={zone.id}>
                                                <TableCell className="font-medium">{zone.name}</TableCell>
                                                <TableCell><Badge variant="outline">{zone.page}</Badge></TableCell>
                                                <TableCell className="font-mono text-xs">{zone.position}</TableCell>
                                                <TableCell>{adTypes.find(t => t.value === zone.adType)?.label || zone.adType}</TableCell>
                                                <TableCell>
                                                    <Badge variant={zone.isEnabled ? 'default' : 'secondary'}>
                                                        {zone.isEnabled ? 'Active' : 'Disabled'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button size="sm" variant="outline" onClick={() => {
                                                        setZoneForm({
                                                            name: zone.name, page: zone.page as any, position: zone.position,
                                                            adType: zone.adType as any, scriptId: zone.scriptId || '',
                                                            isEnabled: zone.isEnabled, rotation: zone.rotation,
                                                            lazyLoad: zone.lazyLoad, trigger: zone.trigger as any,
                                                            delay: zone.delay || 0, frequency: zone.frequency || 2
                                                        });
                                                        setEditingId(zone.id);
                                                        setShowZoneDialog(true);
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => {
                                                        setDeleteTarget({ type: 'zone', id: zone.id });
                                                        setShowDeleteDialog(true);
                                                    }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Global Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Ad Settings</CardTitle>
                            <CardDescription>Control ads site-wide</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {settings && (
                                <>
                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50/50">
                                        <div>
                                            <Label className="text-base font-medium text-red-900">Master Kill Switch</Label>
                                            <p className="text-sm text-red-700">Disable all ads site-wide instantly</p>
                                        </div>
                                        <Switch
                                            checked={settings.masterEnabled}
                                            onCheckedChange={(checked) => setSettings({ ...settings, masterEnabled: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <Label className="text-base font-medium">Test Mode</Label>
                                            <p className="text-sm text-muted-foreground">Show ads only to logged-in admins</p>
                                        </div>
                                        <Switch
                                            checked={settings.testMode}
                                            onCheckedChange={(checked) => setSettings({ ...settings, testMode: checked })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Pop-up Frequency Cap (per 24 hours)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={settings.popupFrequencyCap}
                                            onChange={(e) => setSettings({ ...settings, popupFrequencyCap: parseInt(e.target.value) || 0 })}
                                        />
                                        <p className="text-sm text-muted-foreground">Maximum pop-ups a user can see per day</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Header Scripts</Label>
                                        <Textarea
                                            placeholder="<meta name='...'> or <script>...</script>"
                                            className="font-mono text-xs h-32"
                                            value={settings.headerScripts || ''}
                                            onChange={(e) => setSettings({ ...settings, headerScripts: e.target.value })}
                                        />
                                        <p className="text-sm text-muted-foreground">Add verification meta tags or global ad scripts here (injected into &lt;head&gt;)</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Download Smart Link (Direct Link)</Label>
                                        <Input
                                            placeholder="https://example.com/smart-link"
                                            value={settings.downloadSmartLink || ''}
                                            onChange={(e) => setSettings({ ...settings, downloadSmartLink: e.target.value })}
                                        />
                                        <p className="text-sm text-muted-foreground">Redirect user to this link when download starts (triggers alongside download)</p>
                                    </div>

                                    <Button onClick={handleSaveSettings} disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Settings
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Network Dialog */}
            <Dialog open={showNetworkDialog} onOpenChange={setShowNetworkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit' : 'Add'} Ad Network</DialogTitle>
                        <DialogDescription>Configure your ad network provider</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Network Name *</Label>
                            <Input
                                placeholder="e.g., Adsterra, PropellerAds"
                                value={networkForm.name}
                                onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Enabled</Label>
                            <Switch
                                checked={networkForm.isEnabled}
                                onCheckedChange={(checked) => setNetworkForm({ ...networkForm, isEnabled: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNetworkDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveNetwork} disabled={!networkForm.name || isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingId ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Script Dialog */}
            <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit' : 'Add'} Ad Script</DialogTitle>
                        <DialogDescription>Paste your ad code/script</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Ad Network *</Label>
                            <Select value={scriptForm.networkId} onValueChange={(value) => setScriptForm({ ...scriptForm, networkId: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select network" />
                                </SelectTrigger>
                                <SelectContent>
                                    {networks.map((network) => (
                                        <SelectItem key={network.id} value={network.id}>{network.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ad Type *</Label>
                            <Select value={scriptForm.adType} onValueChange={(value: AdType) => setScriptForm({ ...scriptForm, adType: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {adTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ad Script/Code *</Label>
                            <Textarea
                                placeholder="Paste your ad script here..."
                                value={scriptForm.script}
                                onChange={(e) => setScriptForm({ ...scriptForm, script: e.target.value })}
                                rows={10}
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Enabled</Label>
                            <Switch
                                checked={scriptForm.isEnabled}
                                onCheckedChange={(checked) => setScriptForm({ ...scriptForm, isEnabled: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowScriptDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveScript} disabled={!scriptForm.networkId || !scriptForm.script || isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingId ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Zone Dialog */}
            <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit' : 'Add'} Ad Zone</DialogTitle>
                        <DialogDescription>Configure ad placement</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Zone Name *</Label>
                            <Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} />
                            <p className="text-xs text-muted-foreground">Descriptive name for admin use</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Page *</Label>
                            <Select value={zoneForm.page} onValueChange={(v: any) => setZoneForm({ ...zoneForm, page: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="home">Homepage</SelectItem>
                                    <SelectItem value="watch">Watch Page</SelectItem>
                                    <SelectItem value="download">Download Page</SelectItem>
                                    <SelectItem value="live-tv">Live TV</SelectItem>
                                    <SelectItem value="browse">Browse/Search</SelectItem>
                                    <SelectItem value="all">All Pages</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Position ID *</Label>
                            <Input value={zoneForm.position} onChange={(e) => setZoneForm({ ...zoneForm, position: e.target.value })} />
                            <p className="text-xs text-muted-foreground">Internal ID used in code (e.g., 'homepage_hero')</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Ad Type *</Label>
                            <Select value={zoneForm.adType} onValueChange={(v: any) => setZoneForm({ ...zoneForm, adType: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {adTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Specific Script (Optional)</Label>
                            <Select value={zoneForm.scriptId} onValueChange={(v) => setZoneForm({ ...zoneForm, scriptId: v })}>
                                <SelectTrigger><SelectValue placeholder="Auto-rotate (Recommended)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Auto-rotate (Recommended)</SelectItem>
                                    {scripts.filter(s => s.adType === zoneForm.adType).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.id.substring(0, 8)}... ({networks.find(n => n.id === s.networkId)?.name})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch checked={zoneForm.isEnabled} onCheckedChange={(c) => setZoneForm({ ...zoneForm, isEnabled: c })} />
                            <Label>Enabled</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={zoneForm.lazyLoad} onCheckedChange={(c) => setZoneForm({ ...zoneForm, lazyLoad: c })} />
                            <Label>Lazy Load</Label>
                        </div>

                        {/* Additional options for Popups */}
                        {zoneForm.adType === 'popup' && (
                            <div className="col-span-2 space-y-4 border-t pt-4 mt-2">
                                <Label className="font-semibold">Popup Settings</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Trigger</Label>
                                        <Select value={zoneForm.trigger} onValueChange={(v: any) => setZoneForm({ ...zoneForm, trigger: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="load">Page Load</SelectItem>
                                                <SelectItem value="time">Time Delay</SelectItem>
                                                <SelectItem value="exit_intent">Exit Intent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Delay (Seconds)</Label>
                                        <Input type="number" value={zoneForm.delay} onChange={(e) => setZoneForm({ ...zoneForm, delay: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowZoneDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveZone} disabled={!zoneForm.name || !zoneForm.position || isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingId ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this {deleteTarget?.type}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (deleteTarget?.type === 'network') handleDeleteNetwork(deleteTarget.id);
                            if (deleteTarget?.type === 'zone') handleDeleteZone(deleteTarget.id);
                        }} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
