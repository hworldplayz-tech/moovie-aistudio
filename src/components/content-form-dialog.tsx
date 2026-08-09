
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentById } from '@/lib/tmdb';
import type { Content, DownloadLink } from '@/lib/definitions';
import { updateContent } from '@/ai/flows/update-content';
import { ContentCard } from './content-card';
import { getDownloadLinkPresets } from '@/app/admin/actions';
import { DEFAULT_LINK_PRESETS } from '@/lib/firestore';

type ContentFormDialogProps = {
  children: React.ReactNode;
  contentToEdit?: Content;
  onSave?: () => void;
  currentUser?: { username: string; role: string };
};

export function ContentFormDialog({ children, contentToEdit, onSave, currentUser }: ContentFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tmdbId, setTmdbId] = useState(contentToEdit?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<Content | null>(contentToEdit || null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Content Type State
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');

  // Form fields state
  const [trailerUrl, setTrailerUrl] = useState(contentToEdit?.trailerUrl || '');
  // Removed single downloadLink state in favor of list
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  // const [isHindiDubbed, setIsHindiDubbed] = useState(contentToEdit?.isHindiDubbed || false); // Deprecated state, mapped to languages
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState(contentToEdit?.customTags?.join(', ') || '');

  /* New state for Featured Content */
  const [isFeatured, setIsFeatured] = useState(contentToEdit?.isFeatured || false);

  /* Quick Filmyzilla Link Generator State */
  const [fzId, setFzId] = useState('');
  const [fzDomain, setFzDomain] = useState('https://www.filmyzilla53.com');
  const [fzPath, setFzPath] = useState('verified');
  const [fzServer, setFzServer] = useState('server_1');
  const [showFzGenerator, setShowFzGenerator] = useState(false);

  /* Link Title Presets State */
  const [linkPresets, setLinkPresets] = useState<string[]>(DEFAULT_LINK_PRESETS);
  const [fzSelectedTitle, setFzSelectedTitle] = useState<string>('720p HD [900MB]');
  const [fzCustomTitle, setFzCustomTitle] = useState<string>('');

  const { toast } = useToast();
  const isEditing = !!contentToEdit;

  useEffect(() => {
    if (isOpen) {
      getDownloadLinkPresets().then(presets => {
        if (presets && presets.length > 0) {
          setLinkPresets(presets);
          if (presets[0] && !presets.includes(fzSelectedTitle)) {
            setFzSelectedTitle(presets[0]);
          }
        }
      }).catch(err => console.error('Failed to load presets:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    // When the dialog is opened for editing, populate the form
    if (isOpen && contentToEdit) {
      setTmdbId(contentToEdit.id);
      setPreviewContent(contentToEdit);
      setTrailerUrl(contentToEdit.trailerUrl || '');

      // Initialize links
      if (contentToEdit.downloadLinks && contentToEdit.downloadLinks.length > 0) {
        setDownloadLinks(contentToEdit.downloadLinks);
      } else if (contentToEdit.downloadLink) {
        setDownloadLinks([{ label: 'Download', url: contentToEdit.downloadLink }]);
      } else {
        setDownloadLinks([]);
      }

      // Initialize Languages and Quality
      let langs = contentToEdit.languages || [];
      if (contentToEdit.isHindiDubbed && !langs.includes('Hindi Dubbed')) {
        langs = ['Hindi Dubbed', ...langs];
      }
      setSelectedLanguages(langs);
      setSelectedQuality(contentToEdit.quality || []);

      setCustomTags(contentToEdit.customTags?.join(', ') || '');
    } else {
      resetForm();
    }
  }, [contentToEdit, isOpen]);

  const resetForm = () => {
    if (!isEditing) {
      setTmdbId('');
      setPreviewContent(null);
      setTrailerUrl('');
      setDownloadLinks([]);
      setSelectedLanguages([]);
      setSelectedQuality([]);
      setCustomTags('');
      setPreviewError(null);
    }
  };


  const handlePreview = async () => {
    if (!tmdbId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a TMDB ID.' });
      return;
    }
    setIsLoading(true);
    setPreviewContent(null);
    setPreviewError(null);
    try {
      const content = await getContentById(tmdbId, contentType);
      if (!content) {
        throw new Error('Content not found with the provided ID.');
      }
      setPreviewContent(content);
      // Reset custom fields when previewing a new ID, but try to preserve existing ones if it's the same ID
      if (contentToEdit?.id !== tmdbId) {
        setTrailerUrl(content.trailerUrl || '');
        // For new content, check if it has links (unlikely from TMDB directly but safe)
        if (content.downloadLinks?.length) {
          setDownloadLinks(content.downloadLinks);
        } else if (content.downloadLink) {
          setDownloadLinks([{ label: 'Download', url: content.downloadLink }]);
        } else {
          setDownloadLinks([]);
        }

        // Initialize from TMDB or defaults
        setSelectedLanguages(content.languages || (content.isHindiDubbed ? ['Hindi Dubbed'] : []));
        setSelectedQuality(content.quality || []);

        setCustomTags(content.customTags?.join(', ') || '');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not fetch content details.';
      setPreviewError(message);
      toast({ variant: 'destructive', title: 'Preview Failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLink = () => {
    setDownloadLinks([...downloadLinks, { label: 'Download', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setDownloadLinks(downloadLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: keyof DownloadLink, value: string) => {
    const newLinks = [...downloadLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setDownloadLinks(newLinks);
  };

  const handleSave = async () => {
    if (!previewContent) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot save without content details.' });
      return;
    }
    setIsLoading(true);

    // Filter out empty links
    const validLinks = downloadLinks.filter(l => l.url.trim() !== '');

    const finalContentToAdd: Content = {
      ...previewContent,
      // The ID from the input field is the source of truth
      id: tmdbId,
      trailerUrl: trailerUrl || undefined,
      downloadLinks: validLinks,
      // Maintain backward compatibility
      downloadLink: validLinks.length > 0 ? validLinks[0].url : undefined,
      languages: selectedLanguages,
      quality: selectedQuality,
      isHindiDubbed: selectedLanguages.includes('Hindi Dubbed'),
      customTags: customTags.split(',').map(tag => tag.trim()).filter(Boolean),
      isFeatured: isFeatured,
      // Add uploadedBy if current user is provided, but preserve existing if editing
      uploadedBy: previewContent?.uploadedBy || currentUser?.username,
    };


    try {
      const result = await updateContent(finalContentToAdd);
      if (!result.success) throw new Error('The AI flow failed to update the content.');

      toast({
        title: isEditing ? 'Content Updated' : 'Content Added',
        description: `'${finalContentToAdd.title}' has been saved successfully.`,
      });
      onSave?.();
      setIsOpen(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save content.';
      toast({ variant: 'destructive', title: 'Save Failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Content' : 'Add New Content'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this item or change the ID to fetch a new one.' : 'Add content via its TMDB ID.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="tmdbId">TMDB ID</Label>

            <div className="flex items-center gap-4 mb-2">
              <RadioGroup defaultValue="movie" value={contentType} onValueChange={(v) => setContentType(v as 'movie' | 'tv')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="movie" id="r1" />
                  <Label htmlFor="r1">Movie</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tv" id="r2" />
                  <Label htmlFor="r2">TV Show</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Input
                id="tmdbId"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                placeholder="e.g., 550 for Fight Club"
                disabled={isLoading}
              />
              <Button onClick={handlePreview} disabled={isLoading || !tmdbId} variant="outline">
                {isLoading && tmdbId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Preview
              </Button>
            </div>
          </div>

          {previewError && !previewContent && (
            <Alert variant="destructive">
              <AlertTitle>Preview Failed</AlertTitle>
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}

          {previewContent && (
            <div className='space-y-4 pt-4'>
              <Separator />
              <h3 className="text-lg font-medium text-center">Content Details</h3>
              <div className="mx-auto w-1/2">
                <ContentCard content={previewContent} />
              </div>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="trailerUrl">IFrame/Embed or Video URL</Label>
                  <Textarea
                    id="trailerUrl"
                    placeholder="<iframe...> or https://..."
                    value={trailerUrl}
                    onChange={(e) => setTrailerUrl(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Download Links / Episodes</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowFzGenerator(!showFzGenerator)}
                        className="text-xs bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border border-orange-200"
                      >
                        ⚡ Filmyzilla ID Helper
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
                        <Plus className="h-4 w-4 mr-1" /> Add Link
                      </Button>
                    </div>
                  </div>

                  {/* Quick Filmyzilla ID Generator Box */}
                  {showFzGenerator && (
                    <div className="mb-4 p-3 rounded-lg border border-orange-200 bg-orange-50/50 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-orange-900 flex items-center gap-1">
                          ⚡ Filmyzilla / Fast ID Link Builder
                        </span>
                        <span className="text-[10px] text-orange-700">Paste movie ID to auto-generate link</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Download ID (e.g. 38016)</Label>
                          <Input
                            placeholder="e.g. 38016"
                            value={fzId}
                            onChange={(e) => setFzId(e.target.value)}
                            className="h-7 text-xs border-orange-200"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Domain</Label>
                          <Input
                            placeholder="https://www.filmyzilla53.com"
                            value={fzDomain}
                            onChange={(e) => setFzDomain(e.target.value)}
                            className="h-7 text-xs border-orange-200"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Path (verified/download)</Label>
                          <Input
                            placeholder="verified"
                            value={fzPath}
                            onChange={(e) => setFzPath(e.target.value)}
                            className="h-7 text-xs border-orange-200"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Server (server_1)</Label>
                          <Input
                            placeholder="server_1"
                            value={fzServer}
                            onChange={(e) => setFzServer(e.target.value)}
                            className="h-7 text-xs border-orange-200"
                          />
                        </div>
                        <div className="col-span-2 pt-1">
                          <Label className="text-[10px] font-semibold text-orange-950 flex items-center justify-between mb-1">
                            <span>Link Title / Label Preset</span>
                            <span className="text-[9px] text-muted-foreground font-normal">Select title for generated link</span>
                          </Label>
                          <div className="space-y-1.5">
                            <select
                              value={fzSelectedTitle}
                              onChange={(e) => setFzSelectedTitle(e.target.value)}
                              className="h-7 text-xs rounded-md border border-orange-300 bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500 w-full font-medium"
                            >
                              {linkPresets.map((preset, idx) => (
                                <option key={idx} value={preset}>{preset}</option>
                              ))}
                              <option value="__CUSTOM__">✨ + Custom Title...</option>
                            </select>
                            {fzSelectedTitle === '__CUSTOM__' && (
                              <Input
                                placeholder="e.g. 720p HD [Fast Direct Link]"
                                value={fzCustomTitle}
                                onChange={(e) => setFzCustomTitle(e.target.value)}
                                className="h-7 text-xs border-orange-200"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full h-7 bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs mt-1"
                        onClick={() => {
                          if (!fzId.trim()) {
                            toast({ variant: 'destructive', title: 'Error', description: 'Please enter Filmyzilla Download ID.' });
                            return;
                          }
                          const cleanDom = fzDomain.trim().replace(/\/+$/, '');
                          const cleanPth = fzPath.trim().replace(/^\/+|\/+$/g, '');
                          const cleanSrv = fzServer.trim().replace(/^\/+|\/+$/g, '');
                          const cleanMovieId = fzId.trim();
                          const finalGeneratedUrl = `${cleanDom}/${cleanPth}/${cleanMovieId}/${cleanSrv}`;
                          const finalTitle = fzSelectedTitle === '__CUSTOM__'
                            ? (fzCustomTitle.trim() || 'Download HD (Fast Server)')
                            : fzSelectedTitle;

                          setDownloadLinks(prev => [
                            ...prev,
                            { label: finalTitle, url: finalGeneratedUrl }
                          ]);
                          toast({ title: 'Link Added!', description: `${finalTitle} ➔ ${finalGeneratedUrl}` });
                          setFzId('');
                        }}
                      >
                        + Generate & Add Link
                      </Button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {downloadLinks.map((link, index) => (
                      <div key={index} className="p-2.5 rounded-lg border bg-card/60 space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                          <span className="text-xs font-semibold text-muted-foreground">Link #{index + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-medium">Quick Preset:</span>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleLinkChange(index, 'label', e.target.value);
                                }
                              }}
                              className="h-6 text-[11px] rounded border border-input bg-background px-1.5 text-foreground cursor-pointer focus:ring-1 focus:ring-ring font-medium"
                            >
                              <option value="">-- Choose Title --</option>
                              {linkPresets.map((preset, pIdx) => (
                                <option key={pIdx} value={preset}>{preset}</option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive/90"
                              onClick={() => handleRemoveLink(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Title / Quality Label</Label>
                            <Input
                              placeholder="Label (e.g. 720p HD [900MB])"
                              value={link.label}
                              onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                              className="h-8 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Download URL</Label>
                            <Input
                              placeholder="URL (https://...)"
                              value={link.url}
                              onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {downloadLinks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No download links added.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customTags" className="text-right">Custom Tags</Label>
                  <Input
                    id="customTags"
                    value={customTags}
                    onChange={(e) => setCustomTags(e.target.value)}
                    placeholder="e.g. Action, 2024, Best"
                    className="col-span-3"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isFeatured" className="text-right">Featured Content</Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Checkbox
                      id="isFeatured"
                      checked={isFeatured}
                      onCheckedChange={(checked) => setIsFeatured(!!checked)}
                      disabled={isLoading}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <p className="text-[0.8rem] text-muted-foreground">
                        Show this content in the "Featured Movies" section on the homepage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="mb-2 block font-medium">Languages</Label>
                    <div className="flex flex-wrap gap-4">
                      {['Hindi Dubbed', 'English', 'Urdu Dubbed', 'Multi Audio', 'Punjabi', 'Korean', 'Chinese', 'Malayalam', 'Turkish', 'Thai', 'Japanese', 'Spanish', 'French', 'German', 'Italian'].map((lang) => (
                        <div key={lang} className="flex items-center space-x-2">
                          <Checkbox
                            id={`lang-${lang}`}
                            checked={selectedLanguages.includes(lang)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLanguages([...selectedLanguages, lang]);
                              } else {
                                setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
                              }
                            }}
                            disabled={isLoading}
                          />
                          <Label htmlFor={`lang-${lang}`}>{lang}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block font-medium">Quality</Label>
                    <div className="flex flex-wrap gap-4">
                      {['HD', '4K', 'HDCAM', 'HDTS', 'HEVC'].map((q) => (
                        <div key={q} className="flex items-center space-x-2">
                          <Checkbox
                            id={`qual-${q}`}
                            checked={selectedQuality.includes(q)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedQuality([...selectedQuality, q]);
                              } else {
                                setSelectedQuality(selectedQuality.filter(item => item !== q));
                              }
                            }}
                            disabled={isLoading}
                          />
                          <Label htmlFor={`qual-${q}`}>{q}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {previewContent && (
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" onClick={resetForm} type="button">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add to Library'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
