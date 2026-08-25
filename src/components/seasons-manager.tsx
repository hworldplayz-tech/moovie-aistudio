'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Tv,
  Layers,
  Sparkles,
  FileArchive,
  FileText,
  ListPlus,
  PlaySquare
} from 'lucide-react';
import type { SeasonData, EpisodeDownload, DownloadLink } from '@/lib/definitions';

interface SeasonsManagerProps {
  seasons: SeasonData[];
  onChange: (updatedSeasons: SeasonData[]) => void;
  linkPresets: string[];
}

export function SeasonsManager({
  seasons,
  onChange,
  linkPresets,
}: SeasonsManagerProps) {
  const [activeSeasonTab, setActiveSeasonTab] = useState<number>(0);
  const [showBulkPasteForSeason, setShowBulkPasteForSeason] = useState<number | null>(null);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [bulkEpisodeCount, setBulkEpisodeCount] = useState('8');

  // Add a new season
  const handleAddSeason = () => {
    const nextSeasonNum = seasons.length > 0
      ? Math.max(...seasons.map(s => s.seasonNumber || 1)) + 1
      : 1;

    const newSeason: SeasonData = {
      seasonNumber: nextSeasonNum,
      seasonTitle: `Season ${nextSeasonNum}`,
      episodes: [
        {
          episodeNumber: 1,
          episodeTitle: 'Episode 1',
          downloadLinks: [{ label: '720p HD [350MB]', url: '' }],
        },
      ],
      zipPackLinks: [],
    };

    const updated = [...seasons, newSeason];
    onChange(updated);
    setActiveSeasonTab(updated.length - 1);
  };

  // Remove a season
  const handleRemoveSeason = (seasonIndex: number) => {
    const updated = seasons.filter((_, idx) => idx !== seasonIndex);
    onChange(updated);
    if (activeSeasonTab >= updated.length) {
      setActiveSeasonTab(Math.max(0, updated.length - 1));
    }
  };

  // Update season metadata
  const handleUpdateSeasonMeta = (seasonIndex: number, field: keyof SeasonData, value: any) => {
    const updated = [...seasons];
    updated[seasonIndex] = {
      ...updated[seasonIndex],
      [field]: value,
    };
    onChange(updated);
  };

  // Add an episode to a season
  const handleAddEpisode = (seasonIndex: number) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const currentEps = season.episodes || [];
    const nextEpNum = currentEps.length > 0
      ? Math.max(...currentEps.map(e => e.episodeNumber || 1)) + 1
      : 1;

    const newEp: EpisodeDownload = {
      episodeNumber: nextEpNum,
      episodeTitle: `Episode ${nextEpNum}`,
      downloadLinks: [{ label: '720p HD [350MB]', url: '' }],
    };

    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      episodes: [...currentEps, newEp],
    };
    onChange(updated);
  };

  // Auto-generate N episodes
  const handleGenerateEpisodes = (seasonIndex: number) => {
    const count = parseInt(bulkEpisodeCount, 10);
    if (isNaN(count) || count <= 0) return;

    const season = seasons[seasonIndex];
    if (!season) return;

    const newEpisodes: EpisodeDownload[] = [];
    for (let i = 1; i <= count; i++) {
      newEpisodes.push({
        episodeNumber: i,
        episodeTitle: `Episode ${i}`,
        downloadLinks: [{ label: '720p HD [350MB]', url: '' }],
      });
    }

    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      episodes: newEpisodes,
    };
    onChange(updated);
  };

  // Bulk paste episode links
  const handleApplyBulkPaste = (seasonIndex: number) => {
    if (!bulkPasteText.trim()) return;

    const season = seasons[seasonIndex];
    if (!season) return;

    const lines = bulkPasteText.split('\n').map(l => l.trim()).filter(Boolean);
    const newEpisodes: EpisodeDownload[] = [];

    lines.forEach((line, idx) => {
      const epNum = idx + 1;
      let label = '720p HD [350MB]';
      let url = line;

      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        label = parts[0] || label;
        url = parts[1] || '';
      } else if (line.includes('http')) {
        const match = line.match(/(https?:\/\/[^\s]+)/);
        if (match) {
          url = match[1];
          const prefix = line.replace(match[1], '').trim();
          if (prefix) label = prefix;
        }
      }

      newEpisodes.push({
        episodeNumber: epNum,
        episodeTitle: `Episode ${epNum}`,
        downloadLinks: [{ label, url }],
      });
    });

    if (newEpisodes.length > 0) {
      const updated = [...seasons];
      updated[seasonIndex] = {
        ...season,
        episodes: newEpisodes,
      };
      onChange(updated);
      setShowBulkPasteForSeason(null);
      setBulkPasteText('');
    }
  };

  // Remove an episode
  const handleRemoveEpisode = (seasonIndex: number, episodeIndex: number) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const updatedEpisodes = (season.episodes || []).filter((_, idx) => idx !== episodeIndex);
    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      episodes: updatedEpisodes,
    };
    onChange(updated);
  };

  // Update episode fields
  const handleUpdateEpisode = (
    seasonIndex: number,
    episodeIndex: number,
    field: keyof EpisodeDownload,
    value: any
  ) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const updatedEpisodes = [...(season.episodes || [])];
    updatedEpisodes[episodeIndex] = {
      ...updatedEpisodes[episodeIndex],
      [field]: value,
    };

    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      episodes: updatedEpisodes,
    };
    onChange(updated);
  };

  // Add download link to an episode
  const handleAddEpisodeLink = (seasonIndex: number, episodeIndex: number) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const updatedEpisodes = [...(season.episodes || [])];
    const ep = updatedEpisodes[episodeIndex];
    const existingLinks = ep.downloadLinks || (ep.downloadLink ? [{ label: 'Download', url: ep.downloadLink }] : []);

    updatedEpisodes[episodeIndex] = {
      ...ep,
      downloadLinks: [...existingLinks, { label: '1080p FHD [700MB]', url: '' }],
    };

    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      episodes: updatedEpisodes,
    };
    onChange(updated);
  };

  // Update download link of an episode
  const handleUpdateEpisodeLink = (
    seasonIndex: number,
    episodeIndex: number,
    linkIndex: number,
    field: keyof DownloadLink,
    value: string
  ) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const updatedEpisodes = [...(season.episodes || [])];
    const ep = updatedEpisodes[episodeIndex];
    const existingLinks = [...(ep.downloadLinks || [])];

    if (existingLinks[linkIndex]) {
      existingLinks[linkIndex] = {
        ...existingLinks[linkIndex],
        [field]: value,
      };
    }

    updatedEpisodes[episodeIndex] = {
      ...ep,
      downloadLinks: existingLinks,
    };

    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      episodes: updatedEpisodes,
    };
    onChange(updated);
  };

  // Remove download link from an episode
  const handleRemoveEpisodeLink = (seasonIndex: number, episodeIndex: number, linkIndex: number) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const updatedEpisodes = [...(season.episodes || [])];
    const ep = updatedEpisodes[episodeIndex];
    const existingLinks = (ep.downloadLinks || []).filter((_, idx) => idx !== linkIndex);

    updatedEpisodes[episodeIndex] = {
      ...ep,
      downloadLinks: existingLinks,
    };

    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      episodes: updatedEpisodes,
    };
    onChange(updated);
  };

  // Add Zip Pack Link for Season
  const handleAddZipLink = (seasonIndex: number) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const existingZip = season.zipPackLinks || [];
    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      zipPackLinks: [
        ...existingZip,
        { label: `Season ${season.seasonNumber} Complete Pack [720p Zip]`, url: '' },
      ],
    };
    onChange(updated);
  };

  // Update Zip Pack Link
  const handleUpdateZipLink = (
    seasonIndex: number,
    zipIndex: number,
    field: keyof DownloadLink,
    value: string
  ) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const existingZip = [...(season.zipPackLinks || [])];
    if (existingZip[zipIndex]) {
      existingZip[zipIndex] = {
        ...existingZip[zipIndex],
        [field]: value,
      };
    }

    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      zipPackLinks: existingZip,
    };
    onChange(updated);
  };

  // Remove Zip Pack Link
  const handleRemoveZipLink = (seasonIndex: number, zipIndex: number) => {
    const season = seasons[seasonIndex];
    if (!season) return;

    const existingZip = (season.zipPackLinks || []).filter((_, idx) => idx !== zipIndex);
    const updated = [...seasons];
    updated[seasonIndex] = {
      ...season,
      zipPackLinks: existingZip,
    };
    onChange(updated);
  };

  const currentSeason = seasons[activeSeasonTab];

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-card/80 p-4 md:p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Web Series & TV Shows Seasons Manager</span>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}
              </Badge>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Add multiple seasons, episodes, quality links, and complete season ZIP batch packs.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleAddSeason}
          className="h-8 gap-1.5 bg-primary text-primary-foreground font-semibold text-xs shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Season</span>
        </Button>
      </div>

      {seasons.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20">
          <Layers className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-xs font-medium text-foreground">No seasons configured yet.</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Click "+ Add Season" above to start adding Season 1, Episodes, and Zip Packs.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSeason}
            className="mt-3 h-7 text-xs font-semibold gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Season 1</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Season Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
            {seasons.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSeasonTab(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                  idx === activeSeasonTab
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/60 hover:bg-muted text-foreground/80 border-border/60'
                }`}
              >
                <span>{s.seasonTitle || `Season ${s.seasonNumber}`}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${idx === activeSeasonTab ? 'bg-primary-foreground/20' : 'bg-background'}`}>
                  {s.episodes?.length || 0} Ep
                </span>
              </button>
            ))}
          </div>

          {/* Current Season Details */}
          {currentSeason && (
            <div className="space-y-4 pt-1">
              {/* Season Metadata Row */}
              <div className="p-3 rounded-lg border bg-muted/30 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Season Number</Label>
                  <Input
                    type="number"
                    min={1}
                    value={currentSeason.seasonNumber || 1}
                    onChange={(e) => handleUpdateSeasonMeta(activeSeasonTab, 'seasonNumber', parseInt(e.target.value, 10) || 1)}
                    className="h-7 text-xs font-semibold mt-0.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">Season Display Title</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSeason(activeSeasonTab)}
                      className="h-5 px-1 text-[10px] text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Season
                    </Button>
                  </div>
                  <Input
                    placeholder="e.g. Season 1 (Hindi Dubbed)"
                    value={currentSeason.seasonTitle || ''}
                    onChange={(e) => handleUpdateSeasonMeta(activeSeasonTab, 'seasonTitle', e.target.value)}
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
              </div>

              {/* Complete Season ZIP Pack Section */}
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                    <FileArchive className="h-4 w-4" />
                    <span>Complete Season {currentSeason.seasonNumber} (ZIP Batch Pack)</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddZipLink(activeSeasonTab)}
                    className="h-6 text-[10px] font-semibold border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-slate-950 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Add ZIP Pack Link</span>
                  </Button>
                </div>

                {currentSeason.zipPackLinks && currentSeason.zipPackLinks.length > 0 ? (
                  <div className="space-y-2">
                    {currentSeason.zipPackLinks.map((zLink, zIdx) => (
                      <div key={zIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-background/80 p-2 rounded border border-amber-500/20 items-center">
                        <Input
                          placeholder="ZIP Title (e.g. 720p Complete Zip [2.4GB])"
                          value={zLink.label || ''}
                          onChange={(e) => handleUpdateZipLink(activeSeasonTab, zIdx, 'label', e.target.value)}
                          className="h-7 text-xs font-medium"
                        />
                        <Input
                          placeholder="Download URL (https://...)"
                          value={zLink.url || ''}
                          onChange={(e) => handleUpdateZipLink(activeSeasonTab, zIdx, 'url', e.target.value)}
                          className="h-7 text-xs font-mono"
                        />
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveZipLink(activeSeasonTab, zIdx)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    Optional: Add full-season batch zip pack links for one-click downloading of all episodes.
                  </p>
                )}
              </div>

              {/* Episode Quick Tools & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <PlaySquare className="h-4 w-4 text-primary" />
                    <span>Episodes ({currentSeason.episodes?.length || 0})</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Quick generator */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={bulkEpisodeCount}
                      onChange={(e) => setBulkEpisodeCount(e.target.value)}
                      className="h-7 w-14 text-xs text-center"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGenerateEpisodes(activeSeasonTab)}
                      className="h-7 text-[11px] font-semibold gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span>Gen Eps</span>
                    </Button>
                  </div>

                  {/* Bulk Paste Toggle */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkPasteForSeason(showBulkPasteForSeason === activeSeasonTab ? null : activeSeasonTab)}
                    className="h-7 text-[11px] font-semibold gap-1"
                  >
                    <ListPlus className="h-3 w-3" />
                    <span>Bulk Paste Links</span>
                  </Button>

                  {/* Add Single Episode */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddEpisode(activeSeasonTab)}
                    className="h-7 text-[11px] font-semibold gap-1 bg-primary text-primary-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Add Episode</span>
                  </Button>
                </div>
              </div>

              {/* Bulk Paste Box (Dropdown/Collapsible) */}
              {showBulkPasteForSeason === activeSeasonTab && (
                <div className="p-3 rounded-lg border border-primary/40 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Bulk Paste Episode Download Links (1 per line)</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Format: URL or "Label | URL"</span>
                  </div>
                  <Textarea
                    placeholder="https://mp4moviez.rip/dl.php?id=101&q=720&#10;https://mp4moviez.rip/dl.php?id=102&q=720&#10;https://mp4moviez.rip/dl.php?id=103&q=720"
                    rows={4}
                    value={bulkPasteText}
                    onChange={(e) => setBulkPasteText(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBulkPasteForSeason(null)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApplyBulkPaste(activeSeasonTab)}
                      className="h-7 text-xs font-semibold bg-primary text-primary-foreground"
                    >
                      Apply Pasted Links ({bulkPasteText.split('\n').filter(Boolean).length} Episodes)
                    </Button>
                  </div>
                </div>
              )}

              {/* Episode List */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {(currentSeason.episodes || []).map((ep, epIdx) => (
                  <div key={epIdx} className="p-3 rounded-lg border bg-card/80 space-y-2.5">
                    {/* Episode Top Bar */}
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-bold text-[11px] bg-muted">
                          EP {ep.episodeNumber}
                        </Badge>
                        <Input
                          placeholder="Episode Title (e.g. Episode 1 - The Pilot)"
                          value={ep.episodeTitle || ''}
                          onChange={(e) => handleUpdateEpisode(activeSeasonTab, epIdx, 'episodeTitle', e.target.value)}
                          className="h-7 text-xs font-semibold w-56 sm:w-72"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddEpisodeLink(activeSeasonTab, epIdx)}
                          className="h-6 text-[10px] font-semibold gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+ Quality Link</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEpisode(activeSeasonTab, epIdx)}
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Episode Download Links */}
                    <div className="space-y-1.5 pl-1">
                      {(ep.downloadLinks || []).map((link, lIdx) => (
                        <div key={lIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                          {/* Quality Preset / Label */}
                          <div className="sm:col-span-2 flex items-center gap-1">
                            <Input
                              placeholder="Label (e.g. 720p HD [350MB])"
                              value={link.label || ''}
                              onChange={(e) => handleUpdateEpisodeLink(activeSeasonTab, epIdx, lIdx, 'label', e.target.value)}
                              className="h-7 text-xs font-medium"
                            />
                            {/* Preset Dropdown */}
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleUpdateEpisodeLink(activeSeasonTab, epIdx, lIdx, 'label', e.target.value);
                                }
                              }}
                              className="h-7 text-[10px] rounded border border-input bg-background px-1 text-foreground cursor-pointer shrink-0"
                            >
                              <option value="">Preset</option>
                              {linkPresets.map((preset, pIdx) => (
                                <option key={pIdx} value={preset}>{preset}</option>
                              ))}
                            </select>
                          </div>

                          {/* Link URL */}
                          <div className="sm:col-span-3 flex items-center gap-1">
                            <Input
                              placeholder="Download URL (https://...)"
                              value={link.url || ''}
                              onChange={(e) => handleUpdateEpisodeLink(activeSeasonTab, epIdx, lIdx, 'url', e.target.value)}
                              className="h-7 text-xs font-mono flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveEpisodeLink(activeSeasonTab, epIdx, lIdx)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {(!ep.downloadLinks || ep.downloadLinks.length === 0) && (
                        <div className="text-[11px] text-muted-foreground italic flex items-center justify-between py-1">
                          <span>No download link for Episode {ep.episodeNumber}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddEpisodeLink(activeSeasonTab, epIdx)}
                            className="h-5 text-[10px] text-primary"
                          >
                            + Add Link
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(currentSeason.episodes || []).length === 0 && (
                  <div className="text-center py-4 border border-dashed rounded bg-muted/20 text-xs text-muted-foreground">
                    No episodes in this season. Click "+ Add Episode" or "Gen Eps" above.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
