export interface Song {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  durationFormatted: string;
  genre: string;
  bpm: number;
  songKey: string;
  camelotKey: string;
  releaseYear: number | string;
  reccoTrackId?: string;
  coverArtUrl?: string;
  liked: boolean;
  addedAt?: number;
  likesCount?: number;
  source?: 'catalog' | 'audio_engine' | 'reccobeats' | 'database' | 'seed' | 'manual' | 'charts';
  tags?: string[];
  lastRefreshedAt?: number;
}

export type RandomizeFilterOption = 'BPM' | 'KEY' | 'Genre';
export type TonalityFilterOption = 'minor' | 'mixed' | 'major';

export interface HarmonicMatchResult {
  song: Song;
  totalScore: number; // 0 to 100
  bpmScore: number;
  keyScore: number;
  genreScore: number;
  bpmDiff: number;
  keyCompatibility: 'exact' | 'relative' | 'adjacent' | 'energy' | 'compatible' | 'distant';
  keyNotes: string;
  genreMatch: boolean;
  reasons: string[];
}

export interface RecommendationHistoryEntry {
  id: string;
  timestamp: number;
  formattedDate: string;
  ipAddress: string;
  mode: 'random' | 'filtered';
  filterOptions: string[];
  referenceTrack: Song;
  recommendations: HarmonicMatchResult[];
}

export interface DatabaseBackupMeta {
  id: string;
  filename: string;
  createdAt: number;
  formattedDate: string;
  sizeBytes: number;
  playlistCount: number;
  searchedSongsCount: number;
  downloadUrl: string;
}

export interface SongMix {
  id: string;
  name: string;
  songIds: string[];
  songs: Song[];
  createdAt: number;
  formattedDate: string;
  notes?: string;
}

export interface ClientSyncMessage {
  type: 'init' | 'playlist_updated' | 'song_liked' | 'song_unliked' | 'active_users' | 'database_restored' | 'history_updated' | 'mixes_updated' | 'playlist_refresh_progress' | 'playlist_refresh_completed' | 'charts_updated' | 'ping';
  playlist?: Song[];
  mixes?: SongMix[];
  mix?: SongMix;
  song?: Song;
  activeCount?: number;
  timestamp?: number;
  actorId?: string;
  current?: number;
  total?: number;
  rateLimit?: string;
}

// --- TOP CHARTS TYPES ---
export type ChartServiceId = 'spotify' | 'apple' | 'billboard' | 'tiktok' | 'youtube' | 'shazam';

export interface ChartTrack {
  id: string;
  rank: number;
  previousRank?: number;
  peakRank?: number;
  weeksOnChart?: number;
  change: 'up' | 'down' | 'same' | 'new';
  changeAmount?: number;
  song: Song;
  service: ChartServiceId;
  streamsOrViews?: string;
  trendReason?: string;
}

export interface ServiceChart {
  serviceId: ChartServiceId;
  serviceName: string;
  tagline: string;
  accentColor: string;
  badgeBg: string;
  lastRefreshed: number;
  formattedLastRefreshed: string;
  tracks: ChartTrack[];
}

export interface TopChartsData {
  lastRefreshedAll: number;
  formattedLastRefreshedAll: string;
  services: Record<ChartServiceId, ServiceChart>;
  globalHotTracks: ChartTrack[];
}

// --- ACTIVITY HISTORY TYPES (LAST 200 ACTIONS ACROSS 5 CATEGORIES) ---
export type ActivityCategory = 'recommendation' | 'search' | 'editing' | 'mixes' | 'database';

export interface ActivityHistoryItem {
  id: string;
  category: ActivityCategory;
  action: string;
  summary: string;
  timestamp: number;
  formattedDate: string;
  ipAddress?: string;
  actorId?: string;
  details?: Record<string, any>;
  song?: Song;
  songs?: Song[];
}
