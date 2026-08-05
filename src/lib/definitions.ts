import type { User as FirebaseUser } from 'firebase/auth';

export type DownloadLink = {
  label: string;
  url: string;
};

export type Content = {
  id: string;
  title: string;
  description: string;
  posterPath: string;
  backdropPath: string;
  genres: string[];
  releaseDate: string;
  rating: number;
  type: 'movie' | 'tv';
  trailerUrl?: string;
  youtubeTrailerUrl?: string;
  downloadLink?: string; // Deprecated, but kept for backward compatibility
  downloadLinks?: DownloadLink[];
  isHindiDubbed?: boolean;
  customTags?: string[];
  cast?: CastMember[];
  runtime?: number; // Minutes
  numberOfSeasons?: number;
  languages?: string[];
  quality?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastAirDate?: string;
  uploadedBy?: string; // ID of the user who uploaded this content
  country?: string;
  isFeatured?: boolean;
  slug?: string; // SEO-friendly URL slug (e.g., "download-avatar-fire-and-ash")
};

export type SystemUser = {
  username: string;
  password?: string; // Optional when fetching for display
  role: 'admin' | 'partner';
  partnerId?: string; // Optional, for identifying the partner entity
  createdAt: string;
  id?: string; // Firestore Doc ID
};

export type PartnerRequest = {
  id?: string;
  fullname: string;
  email: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  username?: string; // Generated username after approval
  password?: string; // Generated password after approval
};

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  likedContent?: string[];
  dislikedContent?: string[];
  viewingHistory?: string[];
};

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

export type Comment = {
  id: string;
  author: string;
  authorId: string;
  avatarUrl: string;
  text: string;
  timestamp: number;
  replies: Comment[];
}

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profilePath: string;
}

export type LiveChannel = {
  id: string; // Auto-generated ID
  title: string;
  description: string;
  country: string;
  tags: string[];
  streamUrl?: string; // Direct HLS/M3U8 link
  embedCode?: string; // Iframe embed code
  posterUrl?: string; // Optional logo/poster
  posterPath?: string; // Deprecated or alias, keeping for safety
  createdAt: string;
  userAgent?: string;
};

export type PlayerContent = {
  title?: string;
  file: string; // Video URL
  poster?: string; // Poster image URL
};

export type CustomPlayer = {
  id: string;
  name: string; // Internal name for admin reference
  type: 'single' | 'playlist';
  content: PlayerContent[];
  createdAt: string;
  updatedAt?: string;
};

// --- ADS MANAGEMENT SYSTEM ---

export type AdType = 'popup' | 'banner_728x90' | 'banner_468x60' | 'banner_300x250' |
  'native' | 'social_bar' | 'direct_link' | 'video' | 'in_page_push';

export type AdNetwork = {
  id: string;
  name: string; // "Adsterra", "PropellerAds", etc.
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type AdScript = {
  id: string;
  networkId: string; // Reference to ad_networks
  adType: AdType;
  script: string; // The actual ad code/script
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type AdZone = {
  id: string;
  name: string; // "Homepage Hero Banner", "Watch Page Pre-Video", etc.
  page: 'home' | 'watch' | 'download' | 'live-tv' | 'browse' | 'all';
  position: string; // "above_player", "below_hero", "in_feed", etc.
  adType: AdType;
  scriptId?: string; // Reference to ad_scripts (if specific script assigned)
  networkId?: string; // Reference to ad_networks (if rotation disabled)
  isEnabled: boolean;
  rotation: boolean; // If true, rotate between all enabled scripts of this type
  lazyLoad: boolean;
  frequency?: number; // For pop-ups: max per user per day
  delay?: number; // Time delay in seconds before showing
  trigger?: 'load' | 'scroll' | 'click' | 'time' | 'exit_intent';
  createdAt: string;
  updatedAt?: string;
};

export type AdSettings = {
  id: 'global'; // Single document
  masterEnabled: boolean; // Master kill switch
  testMode: boolean; // Show ads only to admins
  popupFrequencyCap: number; // Max pop-ups per user per 24h
  headerScripts?: string; // Scripts to inject in <head>
  downloadSmartLink?: string; // Direct/Smart link for download redirect
  updatedAt: string;
};
