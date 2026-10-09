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
  type: 'init' | 'playlist_updated' | 'song_liked' | 'song_unliked' | 'active_users' | 'database_restored' | 'history_updated' | 'mixes_updated' | 'playlist_refresh_progress' | 'playlist_refresh_completed' | 'ping';
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
