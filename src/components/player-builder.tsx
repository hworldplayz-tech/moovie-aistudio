'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Copy, Plus, Trash2, Edit, GripVertical, Video, List, Check, X } from 'lucide-react';
import type { CustomPlayer, PlayerContent } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';

type PlayerBuilderProps = {
    onPlayerCreated?: () => void;
};

export default function PlayerBuilder({ onPlayerCreated }: PlayerBuilderProps) {
    const { toast } = useToast();
    const [savedPlayers, setSavedPlayers] = useState<CustomPlayer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
    const [editingPlayer, setEditingPlayer] = useState<CustomPlayer | null>(null);

    // Quick Generator State
    const [quickFile, setQuickFile] = useState('');
    const [quickPoster, setQuickPoster] = useState('');
    const [quickTitle, setQuickTitle] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');

    // Create/Edit Player State
    const [playerName, setPlayerName] = useState('');
    const [playerType, setPlayerType] = useState<'single' | 'playlist'>('single');
    const [playlistItems, setPlaylistItems] = useState<PlayerContent[]>([{ file: '', poster: '', title: '' }]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/player-configs');
            if (response.ok) {
                const data = await response.json();
                setSavedPlayers(data);
            }
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Quick Generator Functions
    const generateQuickCode = () => {
        if (!quickFile.trim()) {
            toast({
                title: 'Error',
                description: 'Video URL is required',
                variant: 'destructive',
            });
            return;
        }

        const params = new URLSearchParams();
        params.append('file', quickFile);
        if (quickPoster) params.append('poster', quickPoster);
        if (quickTitle) params.append('title', quickTitle);

        const baseUrl = window.location.origin;
        const iframeCode = `<iframe src="${baseUrl}/player.html?${params.toString()}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;
        setGeneratedCode(iframeCode);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied!',
            description: 'Code copied to clipboard',
        });
    };

    // Playlist Management Functions
    const addPlaylistItem = () => {
        setPlaylistItems([...playlistItems, { file: '', poster: '', title: '' }]);
    };

    const removePlaylistItem = (index: number) => {
        if (playlistItems.length > 1) {
            setPlaylistItems(playlistItems.filter((_, i) => i !== index));
        }
    };

    const updatePlaylistItem = (index: number, field: keyof PlayerContent, value: string) => {
        const updated = [...playlistItems];
        updated[index] = { ...updated[index], [field]: value };
        setPlaylistItems(updated);
    };

    // Drag and Drop Functions
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const items = [...playlistItems];
        const draggedItem = items[draggedIndex];
        items.splice(draggedIndex, 1);
        items.splice(index, 0, draggedItem);
        setPlaylistItems(items);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Create/Edit Player Functions
    const openCreateDialog = () => {
        setEditingPlayer(null);
        setPlayerName('');
        setPlayerType('single');
        setPlaylistItems([{ file: '', poster: '', title: '' }]);
        setShowCreateDialog(true);
    };

    const openEditDialog = (player: CustomPlayer) => {
        setEditingPlayer(player);
        setPlayerName(player.name);
        setPlayerType(player.type);
        setPlaylistItems(player.content.length > 0 ? player.content : [{ file: '', poster: '', title: '' }]);
        setShowCreateDialog(true);
    };

    const handleSavePlayer = async () => {
        if (!playerName.trim()) {
            toast({
                title: 'Error',
                description: 'Player name is required',
                variant: 'destructive',
            });
            return;
        }

        const validItems = playlistItems.filter(item => item.file.trim());
        if (validItems.length === 0) {
            toast({
                title: 'Error',
                description: 'At least one video URL is required',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const playerData = {
                name: playerName,
                type: playerType,
                content: validItems,
            };

            const url = editingPlayer
                ? `/api/admin/player-configs?id=${editingPlayer.id}`
                : '/api/admin/player-configs';

            const method = editingPlayer ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(playerData),
            });

            if (response.ok) {
                toast({
                    title: 'Success',
                    description: editingPlayer ? 'Player updated successfully' : 'Player created successfully',
                });
                setShowCreateDialog(false);
                fetchPlayers();
                onPlayerCreated?.();
            } else {
                throw new Error('Failed to save player');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save player',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePlayer = async () => {
        if (!playerToDelete) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/player-configs?id=${playerToDelete}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({
                    title: 'Success',
                    description: 'Player deleted successfully',
                });
                fetchPlayers();
            } else {
                throw new Error('Failed to delete player');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete player',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            setShowDeleteDialog(false);
            setPlayerToDelete(null);
        }
    };

    const getPlayerCode = (player: CustomPlayer) => {
        const baseUrl = window.location.origin;
        return `<iframe src="${baseUrl}/player.html?id=${player.id}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="quick" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="quick">Quick Generator</TabsTrigger>
                    <TabsTrigger value="saved">Saved Players</TabsTrigger>
                </TabsList>

                {/* Quick Generator Tab */}
                <TabsContent value="quick">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Player Generator</CardTitle>
                            <CardDescription>
                                Generate an iframe code instantly without saving to database
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="quick-file">Video URL *</Label>
                                <Input
                                    id="quick-file"
                                    placeholder="https://example.com/video.mp4"
                                    value={quickFile}
                                    onChange={(e) => setQuickFile(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quick-poster">Poster URL (Optional)</Label>
                                <Input
                                    id="quick-poster"
                                    placeholder="https://example.com/poster.jpg"
                                    value={quickPoster}
                                    onChange={(e) => setQuickPoster(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quick-title">Title (Optional)</Label>
                                <Input
                                    id="quick-title"
                                    placeholder="Video Title"
                                    value={quickTitle}
                                    onChange={(e) => setQuickTitle(e.target.value)}
                                />
                            </div>
                            <Button onClick={generateQuickCode} className="w-full">
                                Generate Code
                            </Button>

                            {generatedCode && (
                                <div className="mt-4 space-y-2">
                                    <Label>Generated Iframe Code</Label>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                                            {generatedCode}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => copyToClipboard(generatedCode)}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Saved Players Tab */}
                <TabsContent value="saved">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Saved Players</CardTitle>
                                    <CardDescription>
                                        Manage your saved player configurations
                                    </CardDescription>
                                </div>
                                <Button onClick={openCreateDialog}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : savedPlayers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No saved players yet. Create your first one!
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {savedPlayers.map((player) => (
                                            <TableRow key={player.id}>
                                                <TableCell className="font-medium">{player.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={player.type === 'single' ? 'default' : 'secondary'}>
                                                        {player.type === 'single' ? (
                                                            <><Video className="h-3 w-3 mr-1" /> Single</>
                                                        ) : (
                                                            <><List className="h-3 w-3 mr-1" /> Playlist</>
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{player.content.length}</TableCell>
                                                <TableCell>
                                                    {new Date(player.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => copyToClipboard(getPlayerCode(player))}
                                                    >
                                                        <Copy className="h-4 w-4 mr-1" />
                                                        Code
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEditDialog(player)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => {
                                                            setPlayerToDelete(player.id);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                    >
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
            </Tabs>

            {/* Create/Edit Player Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPlayer ? 'Edit Player' : 'Create New Player'}</DialogTitle>
                        <DialogDescription>
                            {editingPlayer ? 'Update your player configuration' : 'Create a new player configuration'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="player-name">Player Name *</Label>
                            <Input
                                id="player-name"
                                placeholder="My Awesome Player"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Player Type</Label>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={playerType === 'single' ? 'default' : 'outline'}
                                    onClick={() => setPlayerType('single')}
                                    className="flex-1"
                                >
                                    <Video className="h-4 w-4 mr-2" />
                                    Single Video
                                </Button>
                                <Button
                                    type="button"
                                    variant={playerType === 'playlist' ? 'default' : 'outline'}
                                    onClick={() => setPlayerType('playlist')}
                                    className="flex-1"
                                >
                                    <List className="h-4 w-4 mr-2" />
                                    Playlist
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>
                                    {playerType === 'single' ? 'Video Details' : 'Playlist Items'}
                                    {playerType === 'playlist' && ' (Drag to reorder)'}
                                </Label>
                                {playerType === 'playlist' && (
                                    <Button type="button" size="sm" onClick={addPlaylistItem}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Item
                                    </Button>
                                )}
                            </div>

                            {playlistItems.map((item, index) => (
                                <div
                                    key={index}
                                    draggable={playerType === 'playlist'}
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`border rounded-lg p-4 space-y-3 ${playerType === 'playlist' ? 'cursor-move' : ''
                                        } ${draggedIndex === index ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {playerType === 'playlist' && (
                                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <span className="font-medium">
                                                {playerType === 'single' ? 'Video' : `Item ${index + 1}`}
                                            </span>
                                        </div>
                                        {playerType === 'playlist' && playlistItems.length > 1 && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removePlaylistItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Video URL *</Label>
                                        <Input
                                            placeholder="https://example.com/video.mp4"
                                            value={item.file}
                                            onChange={(e) => updatePlaylistItem(index, 'file', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Poster URL (Optional)</Label>
                                        <Input
                                            placeholder="https://example.com/poster.jpg"
                                            value={item.poster || ''}
                                            onChange={(e) => updatePlaylistItem(index, 'poster', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Title (Optional)</Label>
                                        <Input
                                            placeholder="Video Title"
                                            value={item.title || ''}
                                            onChange={(e) => updatePlaylistItem(index, 'title', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePlayer} disabled={isLoading}>
                            {isLoading ? 'Saving...' : editingPlayer ? 'Update Player' : 'Create Player'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this player configuration. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPlayerToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePlayer} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
