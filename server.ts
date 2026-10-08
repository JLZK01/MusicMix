import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { Song, SongMix, ClientSyncMessage, DatabaseBackupMeta, RecommendationHistoryEntry } from './src/types/music';
import { INITIAL_SEED_SONGS } from './src/data/seedSongs';
import { normalizeToCamelot } from './src/utils/harmonic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

// Resolve resilient data directories (with automatic fallback to os.tmpdir if permissions are restricted)
let DATA_DIR = path.resolve(process.env.MUSICMIX_DATA_DIR || path.resolve(__dirname, 'data'));
let BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
let COVERS_DIR = path.resolve(DATA_DIR, 'covers');
let DB_FILE = path.resolve(DATA_DIR, 'musicmix_db.json');
let HISTORY_FILE = path.resolve(DATA_DIR, 'recommendation_history.json');

function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    if (!fs.existsSync(COVERS_DIR)) {
      fs.mkdirSync(COVERS_DIR, { recursive: true });
    }
    // Verify write permissions
    const testFile = path.join(DATA_DIR, '.perm_test');
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
  } catch (err: any) {
    console.warn(`[Storage Warning] Cannot write to target DATA_DIR (${DATA_DIR}): ${err?.message || err}. Falling back to writable temp directory.`);
    DATA_DIR = path.resolve(os.tmpdir(), 'musicmix_data');
    BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
    COVERS_DIR = path.resolve(DATA_DIR, 'covers');
    DB_FILE = path.resolve(DATA_DIR, 'musicmix_db.json');
    HISTORY_FILE = path.resolve(DATA_DIR, 'recommendation_history.json');

    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
    } catch (fallbackErr) {
      console.error('[Storage Error] Fallback directory creation error:', fallbackErr);
    }
  }
}

ensureDirectories();

function getCoverFilePath(songId: string): string {
  const safeId = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(COVERS_DIR, `${safeId}.jpg`);
}

// Download and cache cover art locally to server disk for offline use
async function cacheCoverArtOffline(songId: string, url: string): Promise<string | null> {
  try {
    const filePath = getCoverFilePath(songId);
    if (fs.existsSync(filePath)) {
      return `/api/covers/${encodeURIComponent(songId)}`;
    }

    if (url.startsWith('data:image/')) {
      const matches = url.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
      if (matches && matches[1]) {
        fs.writeFileSync(filePath, Buffer.from(matches[1], 'base64'));
        return `/api/covers/${encodeURIComponent(songId)}`;
      }
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        return `/api/covers/${encodeURIComponent(songId)}`;
      }
    }
  } catch (err) {
    console.warn(`Could not cache cover offline for ${songId}:`, (err as Error).message);
  }
  return null;
}

interface DatabaseSchema {
  playlist: Song[];
  searchedSongs: Song[];
  mixes?: SongMix[];
  lastUpdated: number;
}

// Database helper
function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.playlist)) {
        if (!Array.isArray(parsed.mixes)) {
          parsed.mixes = [];
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read db file, initializing new:', err);
  }

  // Initialize with seed data
  const initialData: DatabaseSchema = {
    playlist: [...INITIAL_SEED_SONGS],
    searchedSongs: [...INITIAL_SEED_SONGS],
    mixes: [],
    lastUpdated: Date.now()
  };
  saveDatabase(initialData);
  return initialData;
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    data.lastUpdated = Date.now();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save db file:', err);
  }
}

// History helper (last 100 sets of recommendations)
function loadHistory(): RecommendationHistoryEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 100);
      }
    }
  } catch (err) {
    console.error('Failed to read history file:', err);
  }
  return [];
}

function saveHistory(history: RecommendationHistoryEntry[]): void {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save history file:', err);
  }
}

let db = loadDatabase();
let recommendationHistory = loadHistory();

// Backup rotation helper (keeps only the last 5 backups)
function getStoredBackups(): DatabaseBackupMeta[] {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
    const backups: DatabaseBackupMeta[] = [];

    for (const filename of files) {
      const fullPath = path.join(BACKUPS_DIR, filename);
      const stat = fs.statSync(fullPath);
      let playlistCount = 0;
      let searchedSongsCount = 0;

      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        playlistCount = Array.isArray(content.playlist) ? content.playlist.length : 0;
        searchedSongsCount = Array.isArray(content.searchedSongs) ? content.searchedSongs.length : 0;
      } catch {
        // ignore parse error
      }

      backups.push({
        id: filename.replace('.json', ''),
        filename,
        createdAt: stat.mtimeMs,
        formattedDate: new Date(stat.mtimeMs).toLocaleString(),
        sizeBytes: stat.size,
        playlistCount,
        searchedSongsCount,
        downloadUrl: `/api/database/exports/${encodeURIComponent(filename)}`
      });
    }

    backups.sort((a, b) => b.createdAt - a.createdAt);

    if (backups.length > 5) {
      const toDelete = backups.slice(5);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, item.filename));
        } catch (e) {
          console.error('Error removing old backup:', e);
        }
      }
      return backups.slice(0, 5);
    }

    return backups;
  } catch (err) {
    console.error('Failed to get backups:', err);
    return [];
  }
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp.trim();
  }
  const remote = req.socket.remoteAddress || '127.0.0.1';
  // Normalize IPv6 mapped IPv4 like ::ffff:192.168.1.5
  return remote.replace(/^::ffff:/, '');
}

const app = express();
app.use(express.json({ limit: '30mb' }));

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ noServer: true });

interface ClientSession {
  ws: WebSocket;
  deviceId: string;
  ip: string;
  isAlive: boolean;
  connectedAt: number;
}

const clientSessions = new Map<WebSocket, ClientSession>();

function broadcast(message: ClientSyncMessage) {
  const payload = JSON.stringify(message);
  for (const [client] of clientSessions) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (e) {
        console.error('Error sending WS message:', e);
      }
    }
  }
}

function getActiveComputersCount(): number {
  const uniqueComputers = new Set<string>();
  for (const [ws, session] of clientSessions.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      // Group by persistent device ID or unique network IP so multiple tabs on one computer count as 1 computer
      const computerKey = session.deviceId || session.ip || 'local';
      uniqueComputers.add(computerKey);
    }
  }
  return Math.max(1, uniqueComputers.size);
}

function broadcastUserCount() {
  broadcast({
    type: 'active_users',
    activeCount: getActiveComputersCount()
  });
}

// 12-second heartbeat to detect and drop ghost/zombie connections (e.g. sleep/closed lids/disconnects)
setInterval(() => {
  let hasPruned = false;
  for (const [ws, session] of clientSessions.entries()) {
    if (!session.isAlive) {
      try {
        ws.terminate();
      } catch {}
      clientSessions.delete(ws);
      hasPruned = true;
      continue;
    }
    session.isAlive = false;
    try {
      ws.ping();
    } catch {
      clientSessions.delete(ws);
      hasPruned = true;
    }
  }
  if (hasPruned) {
    broadcastUserCount();
  }
}, 12000);

wss.on('connection', (ws, request: http.IncomingMessage) => {
  let deviceId = '';
  let ip = '127.0.0.1';

  try {
    if (request && request.url) {
      const parsedUrl = new URL(request.url, 'http://localhost');
      deviceId = parsedUrl.searchParams.get('deviceId') || '';
    }
    if (request) {
      const forwarded = request.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        ip = forwarded.split(',')[0].trim();
      } else if (typeof request.headers['x-real-ip'] === 'string') {
        ip = request.headers['x-real-ip'].trim();
      } else if (request.socket.remoteAddress) {
        ip = request.socket.remoteAddress.replace(/^::ffff:/, '');
      }
    }
  } catch {}

  const session: ClientSession = {
    ws,
    deviceId: deviceId || ip,
    ip,
    isAlive: true,
    connectedAt: Date.now()
  };
  clientSessions.set(ws, session);

  ws.on('pong', () => {
    const s = clientSessions.get(ws);
    if (s) s.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === 'device_hello' && parsed.deviceId) {
        const s = clientSessions.get(ws);
        if (s) {
          s.deviceId = parsed.deviceId;
          broadcastUserCount();
        }
      } else if (parsed.type === 'ping') {
        const s = clientSessions.get(ws);
        if (s) s.isAlive = true;
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    } catch {}
  });

  const initMsg: ClientSyncMessage = {
    type: 'init',
    playlist: db.playlist,
    mixes: db.mixes || [],
    activeCount: getActiveComputersCount(),
    timestamp: Date.now()
  };
  try {
    ws.send(JSON.stringify(initMsg));
  } catch {}
  broadcastUserCount();

  ws.on('close', () => {
    clientSessions.delete(ws);
    broadcastUserCount();
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
    clientSessions.delete(ws);
    broadcastUserCount();
  });
});

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '3:30';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function enrichAudioMetadata(title: string, artist: string, genreTags: string[]): {
  genre: string;
  bpm: number;
  songKey: string;
  camelotKey: string;
} {
  const combined = `${title} ${artist} ${genreTags.join(' ')}`.toLowerCase();

  let genre = 'Electronic';
  let baseBpm = 124;

  if (combined.includes('drum and bass') || combined.includes('dnb') || combined.includes('jungle')) {
    genre = 'Drum & Bass';
    baseBpm = 174;
  } else if (combined.includes('techno') || combined.includes('acid')) {
    genre = 'Techno';
    baseBpm = 132;
  } else if (combined.includes('trance')) {
    genre = 'Trance';
    baseBpm = 138;
  } else if (combined.includes('deep house') || combined.includes('tech house') || combined.includes('house')) {
    genre = 'House';
    baseBpm = 125;
  } else if (combined.includes('disco') || combined.includes('funk') || combined.includes('nu-disco')) {
    genre = 'Disco / Funk';
    baseBpm = 118;
  } else if (combined.includes('synthwave') || combined.includes('retrowave') || combined.includes('80s')) {
    genre = 'Synthwave';
    baseBpm = 115;
  } else if (combined.includes('hip hop') || combined.includes('rap') || combined.includes('trap')) {
    genre = 'Hip Hop';
    baseBpm = 92;
  } else if (combined.includes('rock') || combined.includes('metal') || combined.includes('punk')) {
    genre = 'Rock / Alternative';
    baseBpm = 128;
  } else if (combined.includes('pop') || combined.includes('dance')) {
    genre = 'Pop / Dance';
    baseBpm = 120;
  } else if (combined.includes('ambient') || combined.includes('chill') || combined.includes('downtempo')) {
    genre = 'Ambient / Downtempo';
    baseBpm = 80;
  } else if (combined.includes('jazz') || combined.includes('soul') || combined.includes('blues')) {
    genre = 'Jazz / Soul';
    baseBpm = 95;
  } else if (genreTags.length > 0) {
    genre = genreTags[0].charAt(0).toUpperCase() + genreTags[0].slice(1);
    baseBpm = 122;
  }

  const hash = Math.abs(
    combined.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
  );
  const bpmOffset = (hash % 11) - 5;
  const finalBpm = Math.max(65, Math.min(185, baseBpm + bpmOffset));

  const CAMELOT_KEYS = [
    '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
    '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
    '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'
  ];
  const camelotKey = CAMELOT_KEYS[hash % CAMELOT_KEYS.length];

  const KEY_NAMES: Record<string, string> = {
    '1A': 'Ab Minor', '1B': 'B Major',
    '2A': 'Eb Minor', '2B': 'F# Major',
    '3A': 'Bb Minor', '3B': 'Db Major',
    '4A': 'F Minor', '4B': 'Ab Major',
    '5A': 'C Minor', '5B': 'Eb Major',
    '6A': 'G Minor', '6B': 'Bb Major',
    '7A': 'D Minor', '7B': 'F Major',
    '8A': 'A Minor', '8B': 'C Major',
    '9A': 'E Minor', '9B': 'G Major',
    '10A': 'B Minor', '10B': 'D Major',
    '11A': 'F# Minor', '11B': 'A Major',
    '12A': 'C# Minor', '12B': 'E Major',
  };
  const songKey = KEY_NAMES[camelotKey] || 'A Minor';

  return {
    genre,
    bpm: finalBpm,
    songKey,
    camelotKey: normalizeToCamelot(camelotKey)
  };
}

// Search cache to avoid redundant API hits and rate limits
const searchCache = new Map<string, { results: Song[]; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Rate limit throttle: MusicBrainz strictly requires max 1 request/second
let lastMusicBrainzTime = 0;
async function throttleMusicBrainz(): Promise<void> {
  const now = Date.now();
  const diff = now - lastMusicBrainzTime;
  if (diff < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - diff));
  }
  lastMusicBrainzTime = Date.now();
}

// iTunes fallback search (free, robust, returns high-res cover art & duration, supports pagination offset)
async function fetchFromITunes(query: string, offset = 0, limit = 25): Promise<Song[]> {
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}&offset=${offset}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(itunesUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];
    interface ITunesItem {
      trackId?: number;
      trackName?: string;
      artistName?: string;
      trackTimeMillis?: number;
      releaseDate?: string;
      primaryGenreName?: string;
      artworkUrl100?: string;
    }
    const data = (await response.json()) as { results?: ITunesItem[] };
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item) => {
      const title = item.trackName || 'Unknown Title';
      const artist = item.artistName || 'Unknown Artist';
      const durationMs = item.trackTimeMillis || 215000;
      const releaseDate = item.releaseDate || '';
      const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) || 2020 : 2020;
      const genreTag = item.primaryGenreName || 'Electronic';

      const meta = enrichAudioMetadata(title, artist, [genreTag]);
      const highResArtwork = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb', '600x600bb')
        : undefined;

      const isLiked = db.playlist.some(
        (p) =>
          p.title.toLowerCase() === title.toLowerCase() &&
          p.artist.toLowerCase() === artist.toLowerCase()
      );

      const songId = `itunes-${item.trackId || Math.random().toString(36).slice(2, 9)}`;

      // Pre-cache cover art offline in background if artwork exists
      if (highResArtwork) {
        cacheCoverArtOffline(songId, highResArtwork).catch(() => {});
      }

      const song: Song = {
        id: songId,
        title,
        artist,
        durationMs,
        durationFormatted: formatDuration(durationMs),
        genre: meta.genre,
        bpm: meta.bpm,
        songKey: meta.songKey,
        camelotKey: meta.camelotKey,
        releaseYear,
        coverArtUrl: highResArtwork ? `/api/covers/${encodeURIComponent(songId)}` : undefined,
        liked: isLiked,
        source: 'musicbrainz',
        tags: [genreTag.toLowerCase()]
      };

      const existingIdx = db.searchedSongs.findIndex((s) => s.id === song.id);
      if (existingIdx === -1) {
        db.searchedSongs.unshift(song);
        if (db.searchedSongs.length > 300) db.searchedSongs.pop();
      }

      return song;
    });
  } catch (err) {
    console.warn('iTunes fallback search error:', err);
    return [];
  }
}

// Background cover cacher for offline resilience
async function precacheAllCoversOffline(): Promise<void> {
  console.log('🔄 Checking and syncing offline cover art cache...');
  const allSongs = [...db.playlist, ...db.searchedSongs];
  const seenIds = new Set<string>();

  for (const song of allSongs) {
    if (!song.id || seenIds.has(song.id)) continue;
    seenIds.add(song.id);

    const filePath = getCoverFilePath(song.id);
    if (fs.existsSync(filePath)) {
      if (song.coverArtUrl !== `/api/covers/${encodeURIComponent(song.id)}`) {
        song.coverArtUrl = `/api/covers/${encodeURIComponent(song.id)}`;
      }
      continue;
    }

    if (song.coverArtUrl && !song.coverArtUrl.startsWith('/api/covers/')) {
      const local = await cacheCoverArtOffline(song.id, song.coverArtUrl);
      if (local) {
        song.coverArtUrl = `/api/covers/${encodeURIComponent(song.id)}`;
      }
    } else if (!song.coverArtUrl) {
      // Missing album art: automatically try to fetch and store offline
      try {
        const query = `${song.title} ${song.artist}`.trim();
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
        if (itunesRes.ok) {
          const itunesData = (await itunesRes.json()) as { results?: Array<{ artworkUrl100?: string }> };
          const match = itunesData?.results?.[0];
          if (match?.artworkUrl100) {
            const highRes = match.artworkUrl100.replace('100x100bb', '600x600bb');
            const local = await cacheCoverArtOffline(song.id, highRes);
            if (local) {
              song.coverArtUrl = `/api/covers/${encodeURIComponent(song.id)}`;
            }
          }
        }
      } catch {}
    }
  }

  saveDatabase(db);
  console.log('✅ Offline album art cache ready.');
}

// API Routes

// Offline cover art serving & auto-retry endpoint
app.get('/api/covers/:id', async (req, res) => {
  const { id } = req.params;
  const filePath = getCoverFilePath(id);

  // 1. If cached on local server disk, serve immediately (100% offline!)
  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(filePath);
  }

  // 2. Find song in database or use title/artist from query parameters
  const song = db.playlist.find((s) => s.id === id) || db.searchedSongs.find((s) => s.id === id);
  const trackTitle = (song?.title || (req.query.title as string) || '').trim();
  const trackArtist = (song?.artist || (req.query.artist as string) || '').trim();

  // If song already has an external URL, download and cache it offline now
  if (song && song.coverArtUrl && !song.coverArtUrl.startsWith('/api/covers/')) {
    const cachedUrl = await cacheCoverArtOffline(id, song.coverArtUrl);
    if (cachedUrl && fs.existsSync(filePath)) {
      song.coverArtUrl = `/api/covers/${encodeURIComponent(id)}`;
      saveDatabase(db);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Type', 'image/jpeg');
      return res.sendFile(filePath);
    }
  }

  // "Make it so that songs in the database without album art will try again if it needs to be displayed."
  // Perform active retry lookup via iTunes or Deezer
  if (trackTitle) {
    try {
      const query = `${trackTitle} ${trackArtist}`.trim();
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const itunesRes = await fetch(itunesUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (itunesRes.ok) {
        const itunesData = (await itunesRes.json()) as { results?: Array<{ artworkUrl100?: string }> };
        const match = itunesData?.results?.[0];
        if (match?.artworkUrl100) {
          const highRes = match.artworkUrl100.replace('100x100bb', '600x600bb');
          const localUrl = await cacheCoverArtOffline(id, highRes);
          if (localUrl && fs.existsSync(filePath)) {
            if (song) {
              song.coverArtUrl = `/api/covers/${encodeURIComponent(id)}`;
              saveDatabase(db);
              broadcast({
                type: 'playlist_updated',
                playlist: db.playlist,
                song,
                timestamp: Date.now()
              });
            }

            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Content-Type', 'image/jpeg');
            return res.sendFile(filePath);
          }
        }
      }

      // Secondary fallback: Deezer API
      const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`);
      if (deezerRes.ok) {
        const deezerData = (await deezerRes.json()) as { data?: Array<{ album?: { cover_xl?: string; cover_big?: string } }> };
        const deezerCover = deezerData?.data?.[0]?.album?.cover_xl || deezerData?.data?.[0]?.album?.cover_big;
        if (deezerCover) {
          const localUrl = await cacheCoverArtOffline(id, deezerCover);
          if (localUrl && fs.existsSync(filePath)) {
            if (song) {
              song.coverArtUrl = `/api/covers/${encodeURIComponent(id)}`;
              saveDatabase(db);
              broadcast({
                type: 'playlist_updated',
                playlist: db.playlist,
                song,
                timestamp: Date.now()
              });
            }

            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Content-Type', 'image/jpeg');
            return res.sendFile(filePath);
          }
        }
      }
    } catch {
      // offline or unreachable
    }
  }

  // Return generic dark music note placeholder SVG if truly unavailable
  const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background:#09090b"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.send(svgPlaceholder);
});

// Parse user search queries into title, artist and clean search terms
function parseMusicQuery(raw: string) {
  const cleaned = raw.trim();
  // Match patterns like "holiday and is by green day", "holiday is by green day", "holiday by green day"
  const byRegex = /^(.+?)\s+(?:and\s+is\s+by|is\s+by|by)\s+(.+)$/i;
  // Match "green day - holiday" or "holiday - green day"
  const dashRegex = /^([^-]+)\s*-\s*([^-]+)$/;

  const byMatch = cleaned.match(byRegex);
  if (byMatch) {
    const title = byMatch[1].replace(/^(song\s+|track\s+|the\s+song\s+)/i, '').trim();
    const artist = byMatch[2].trim();
    return {
      title,
      artist,
      combined: `${artist} ${title}`,
      mbQuery: `recording:"${title}" AND artist:"${artist}"`
    };
  }

  const dashMatch = cleaned.match(dashRegex);
  if (dashMatch) {
    const part1 = dashMatch[1].trim();
    const part2 = dashMatch[2].trim();
    return {
      title: part2,
      artist: part1,
      combined: `${part1} ${part2}`,
      mbQuery: `recording:"${part2}" AND artist:"${part1}"`
    };
  }

  return {
    title: cleaned,
    artist: '',
    combined: cleaned,
    mbQuery: cleaned
  };
}

// Search MusicBrainz with rate throttling, pagination (page parameter), and iTunes popularity engine
app.get('/api/search', async (req, res) => {
  const rawQuery = (req.query.q as string || '').trim();
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const mode = ((req.query.mode as string) || 'popular').toLowerCase(); // 'popular' | 'musicbrainz' | 'database'
  const limit = 25;
  const offset = (page - 1) * limit;

  if (!rawQuery) {
    return res.json({ results: [], count: 0, total: 0, page, limit, mode });
  }

  const parsed = parseMusicQuery(rawQuery);
  const cacheKey = `${mode}_${rawQuery.toLowerCase()}_p${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json({
      results: cached.results,
      count: cached.results.length,
      total: 100,
      page,
      limit,
      mode,
      source: 'cache'
    });
  }

  // Handle local database only mode
  if (mode === 'database') {
    const qLower = rawQuery.toLowerCase();
    const localMatches = db.searchedSongs.filter(s =>
      s.title.toLowerCase().includes(qLower) ||
      s.artist.toLowerCase().includes(qLower) ||
      s.genre.toLowerCase().includes(qLower)
    );
    const paginatedMatches = localMatches.slice(offset, offset + limit);
    return res.json({
      results: paginatedMatches,
      count: paginatedMatches.length,
      total: localMatches.length,
      page,
      limit,
      mode,
      source: 'database_archive'
    });
  }

  // Mode: Popular Hits (uses chart-ranked iTunes search first, instantly finds Green Day - Holiday)
  if (mode === 'popular') {
    const searchTerm = parsed.artist ? `${parsed.title} ${parsed.artist}` : parsed.combined;
    const itunesResults = await fetchFromITunes(searchTerm, offset, limit);
    if (itunesResults.length > 0) {
      saveDatabase(db);
      searchCache.set(cacheKey, { results: itunesResults, timestamp: Date.now() });
      return res.json({
        results: itunesResults,
        count: itunesResults.length,
        total: itunesResults.length >= limit ? page * limit + 50 : itunesResults.length,
        page,
        limit,
        mode: 'popular',
        source: 'popular_hits'
      });
    }
  }

  // Mode: MusicBrainz Archive (or fallback if popular search returned nothing)
  try {
    await throttleMusicBrainz();

    const queryToUse = parsed.mbQuery;
    const mbUrl = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(
      queryToUse
    )}&fmt=json&limit=${limit}&offset=${offset}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    let mbResponse = await fetch(mbUrl, {
      headers: {
        'User-Agent': 'MusicMix/1.0.0 (https://musicmix.app; contact@musicmix.local; ibbto8@gmail.com)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    // If MusicBrainz rate limited with 503, wait 1.2s and retry once
    if (mbResponse.status === 503) {
      console.warn('MusicBrainz returned 503 (rate limited). Retrying with backoff...');
      await new Promise((r) => setTimeout(r, 1200));
      await throttleMusicBrainz();

      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 6500);
      mbResponse = await fetch(mbUrl, {
        headers: {
          'User-Agent': 'MusicMix/1.0.0 (https://musicmix.app; contact@musicmix.local; ibbto8@gmail.com)',
          'Accept': 'application/json'
        },
        signal: retryController.signal
      });
      clearTimeout(retryTimeout);
    }

    if (mbResponse.ok) {
      interface MBArtistCredit {
        name?: string;
        artist?: { name?: string };
      }
      interface MBRelease {
        id?: string;
        date?: string;
        title?: string;
      }
      interface MBTag {
        name: string;
        count?: number;
      }
      interface MBRecording {
        id: string;
        title: string;
        length?: number;
        'first-release-date'?: string;
        'artist-credit'?: MBArtistCredit[];
        releases?: MBRelease[];
        tags?: MBTag[];
        genres?: MBTag[];
      }

      const mbData = (await mbResponse.json()) as { recordings?: MBRecording[]; count?: number };
      const recordings = mbData.recordings || [];
      const totalMbCount = mbData.count || (recordings.length >= limit ? page * limit + 25 : recordings.length);

      if (recordings.length > 0) {
        const results: Song[] = recordings.map((rec) => {
          const artist = rec['artist-credit']?.map(a => a.name || a.artist?.name || '').filter(Boolean).join(', ') || 'Unknown Artist';
          const durationMs = rec.length || 215000;
          const releaseDate = rec['first-release-date'] || rec.releases?.[0]?.date || '';
          const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) || releaseDate.slice(0, 4) : 2020;

          const tagList = [
            ...(rec.tags || []).map(t => t.name),
            ...(rec.genres || []).map(g => g.name)
          ];

          const meta = enrichAudioMetadata(rec.title, artist, tagList);
          const isLiked = db.playlist.some(p => p.musicbrainzId === rec.id || (p.title.toLowerCase() === rec.title.toLowerCase() && p.artist.toLowerCase() === artist.toLowerCase()));

          const releaseId = rec.releases?.[0]?.id;
          const coverArtUrl = releaseId
            ? `https://coverartarchive.org/release/${releaseId}/front-250`
            : `/api/covers/${encodeURIComponent(`mb-${rec.id}`)}`;

          const song: Song = {
            id: `mb-${rec.id}`,
            title: rec.title,
            artist,
            durationMs,
            durationFormatted: formatDuration(durationMs),
            genre: meta.genre,
            bpm: meta.bpm,
            songKey: meta.songKey,
            camelotKey: meta.camelotKey,
            releaseYear: releaseYear || 2020,
            musicbrainzId: rec.id,
            coverArtUrl,
            liked: isLiked,
            source: 'musicbrainz',
            tags: tagList.slice(0, 6)
          };

          // Cache cover art locally in the background for offline use
          if (releaseId) {
            cacheCoverArtOffline(song.id, coverArtUrl).catch(() => {});
          }

          const existingIdx = db.searchedSongs.findIndex(s => s.id === song.id);
          if (existingIdx === -1) {
            db.searchedSongs.unshift(song);
            if (db.searchedSongs.length > 300) {
              db.searchedSongs.pop();
            }
          }

          return song;
        });

        saveDatabase(db);
        searchCache.set(cacheKey, { results, timestamp: Date.now() });
        return res.json({
          results,
          count: results.length,
          total: totalMbCount,
          page,
          limit,
          source: 'musicbrainz'
        });
      }
    }
  } catch (error) {
    console.warn('MusicBrainz search temporary hiccup:', (error as Error).message || error);
  }

  // 2. Seamless iTunes music fallback (no rate limit, pristine metadata and album covers, paginated)
  const itunesResults = await fetchFromITunes(parsed.combined || rawQuery, offset, limit);
  if (itunesResults.length > 0) {
    saveDatabase(db);
    searchCache.set(cacheKey, { results: itunesResults, timestamp: Date.now() });
    return res.json({
      results: itunesResults,
      count: itunesResults.length,
      total: itunesResults.length >= limit ? page * limit + 25 : itunesResults.length,
      page,
      limit,
      mode,
      source: 'music_fallback'
    });
  }

  // 3. Database archive fallback
  const qLower = rawQuery.toLowerCase();
  const localMatches = db.searchedSongs.filter(s =>
    s.title.toLowerCase().includes(qLower) ||
    s.artist.toLowerCase().includes(qLower) ||
    s.genre.toLowerCase().includes(qLower)
  );

  const paginatedMatches = localMatches.slice(offset, offset + limit);

  return res.json({
    results: paginatedMatches,
    count: paginatedMatches.length,
    total: localMatches.length,
    page,
    limit,
    source: 'database_archive'
  });
});

// Get central playlist
app.get('/api/playlist', (_req, res) => {
  res.json({
    playlist: db.playlist,
    count: db.playlist.length,
    lastUpdated: db.lastUpdated
  });
});

// Toggle like / add to central playlist
app.post('/api/playlist/toggle-like', (req, res) => {
  const { song } = req.body as { song: Song };
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Song payload required' });
  }

  const existingIndex = db.playlist.findIndex(
    p => p.id === song.id || (p.musicbrainzId && p.musicbrainzId === song.musicbrainzId)
  );

  let updatedSong: Song;
  let action: 'added' | 'removed';

  if (existingIndex >= 0) {
    const removed = db.playlist.splice(existingIndex, 1)[0];
    updatedSong = { ...removed, liked: false };
    action = 'removed';
  } else {
    updatedSong = {
      ...song,
      liked: true,
      addedAt: Date.now(),
      likesCount: (song.likesCount || 0) + 1
    };
    db.playlist.unshift(updatedSong);
    action = 'added';
  }

  const searchIdx = db.searchedSongs.findIndex(s => s.id === updatedSong.id);
  if (searchIdx >= 0) {
    db.searchedSongs[searchIdx].liked = updatedSong.liked;
  } else {
    db.searchedSongs.unshift(updatedSong);
  }

  saveDatabase(db);

  broadcast({
    type: 'playlist_updated',
    playlist: db.playlist,
    song: updatedSong,
    timestamp: Date.now()
  });

  return res.json({
    success: true,
    action,
    song: updatedSong,
    playlist: db.playlist
  });
});

// Delete from playlist
app.delete('/api/playlist/:id', (req, res) => {
  const { id } = req.params;
  const index = db.playlist.findIndex(p => p.id === id);

  if (index >= 0) {
    const removed = db.playlist.splice(index, 1)[0];
    saveDatabase(db);

    broadcast({
      type: 'playlist_updated',
      playlist: db.playlist,
      song: { ...removed, liked: false },
      timestamp: Date.now()
    });

    return res.json({ success: true, removed });
  }

  return res.status(404).json({ error: 'Track not found in playlist' });
});

// --- EDITOR API: ADD MANUAL TRACK & EDIT EXISTING TRACK METADATA ---

// Add a new track manually
app.post('/api/playlist/track', (req, res) => {
  const track = req.body as Song;
  if (!track || !track.title || !track.artist) {
    return res.status(400).json({ error: 'Title and artist are required' });
  }

  const newId = track.id || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const normalizedCamelot = normalizeToCamelot(track.camelotKey || track.songKey);

  const fullTrack: Song = {
    ...track,
    id: newId,
    durationFormatted: track.durationFormatted || formatDuration(track.durationMs || 180000),
    durationMs: track.durationMs || 180000,
    bpm: Number(track.bpm) || 120,
    songKey: track.songKey || 'A Minor',
    camelotKey: normalizedCamelot,
    releaseYear: track.releaseYear || new Date().getFullYear(),
    genre: track.genre || 'Electronic',
    liked: true,
    addedAt: Date.now(),
    likesCount: 1,
    source: 'manual'
  };

  db.playlist.unshift(fullTrack);
  db.searchedSongs.unshift(fullTrack);
  saveDatabase(db);

  broadcast({
    type: 'playlist_updated',
    playlist: db.playlist,
    song: fullTrack,
    timestamp: Date.now()
  });

  return res.json({ success: true, track: fullTrack, playlist: db.playlist });
});

// Update metadata of an existing track (reflects in playlist and database)
app.put('/api/playlist/track/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body as Partial<Song>;

  const playlistIndex = db.playlist.findIndex(s => s.id === id);
  const searchIndex = db.searchedSongs.findIndex(s => s.id === id);

  if (playlistIndex === -1 && searchIndex === -1) {
    return res.status(404).json({ error: 'Track not found' });
  }

  let updatedSong: Song;

  if (playlistIndex >= 0) {
    const current = db.playlist[playlistIndex];
    updatedSong = {
      ...current,
      ...updates,
      id: current.id,
      bpm: updates.bpm ? Number(updates.bpm) : current.bpm,
      camelotKey: updates.camelotKey ? normalizeToCamelot(updates.camelotKey) : current.camelotKey
    };
    db.playlist[playlistIndex] = updatedSong;
  } else {
    const current = db.searchedSongs[searchIndex];
    updatedSong = {
      ...current,
      ...updates,
      id: current.id,
      bpm: updates.bpm ? Number(updates.bpm) : current.bpm,
      camelotKey: updates.camelotKey ? normalizeToCamelot(updates.camelotKey) : current.camelotKey
    };
  }

  // Sync to searchedSongs if exists
  if (searchIndex >= 0) {
    db.searchedSongs[searchIndex] = updatedSong;
  }

  saveDatabase(db);

  broadcast({
    type: 'playlist_updated',
    playlist: db.playlist,
    song: updatedSong,
    timestamp: Date.now()
  });

  return res.json({ success: true, track: updatedSong, playlist: db.playlist });
});

// Get all searched songs from database
app.get('/api/database/songs', (_req, res) => {
  res.json({
    songs: db.searchedSongs,
    count: db.searchedSongs.length
  });
});

// --- RECOMMENDATION HISTORY API (LAST 100 SETS WITH TAILSCALE / CLIENT IP) ---

// Save recommendation set to history
app.post('/api/history/recommendation', (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const { referenceTrack, recommendations, mode, filterOptions } = req.body;

    if (!referenceTrack || !Array.isArray(recommendations)) {
      return res.status(400).json({ error: 'referenceTrack and recommendations array required' });
    }

    const historyEntry: RecommendationHistoryEntry = {
      id: `rec-hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      formattedDate: new Date().toLocaleString(),
      ipAddress: clientIp,
      mode: mode || 'filtered',
      filterOptions: Array.isArray(filterOptions) ? filterOptions : [],
      referenceTrack,
      recommendations
    };

    recommendationHistory.unshift(historyEntry);
    if (recommendationHistory.length > 100) {
      recommendationHistory = recommendationHistory.slice(0, 100);
    }
    saveHistory(recommendationHistory);

    broadcast({
      type: 'history_updated',
      timestamp: Date.now()
    });

    return res.json({ success: true, entry: historyEntry, totalCount: recommendationHistory.length });
  } catch (err) {
    console.error('Failed to log recommendation history:', err);
    return res.status(500).json({ error: 'Failed to save history' });
  }
});

// Get last 100 recommendation sets
app.get('/api/history', (_req, res) => {
  res.json({
    history: recommendationHistory,
    count: recommendationHistory.length
  });
});

// Clear history
app.delete('/api/history', (_req, res) => {
  recommendationHistory = [];
  saveHistory(recommendationHistory);
  res.json({ success: true, count: 0 });
});

// --- MIXES API: TRACK WHAT HAS BEEN MIXED TOGETHER ---

// Get all recorded mixes
app.get('/api/mixes', (_req, res) => {
  res.json({
    mixes: db.mixes || [],
    count: (db.mixes || []).length
  });
});

// Record a new mix together
app.post('/api/mixes', (req, res) => {
  try {
    const { name, songIds, notes } = req.body as { name?: string; songIds?: string[]; notes?: string };
    if (!Array.isArray(songIds) || songIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 songs are required to record a mix' });
    }

    // Resolve songs from playlist or searchedSongs in selected order
    const matchedSongs: Song[] = [];
    for (const id of songIds) {
      const s = db.playlist.find(p => p.id === id) || db.searchedSongs.find(p => p.id === id);
      if (s && !matchedSongs.some(m => m.id === s.id)) {
        matchedSongs.push(s);
      }
    }

    if (matchedSongs.length < 2) {
      return res.status(400).json({ error: 'Could not resolve songs from library' });
    }

    const now = Date.now();
    const defaultName = name && name.trim()
      ? name.trim()
      : `${matchedSongs[0].title} × ${matchedSongs[1].title}${matchedSongs.length > 2 ? ` (+${matchedSongs.length - 2})` : ''}`;

    const newMix: SongMix = {
      id: `mix-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name: defaultName,
      songIds: matchedSongs.map(s => s.id),
      songs: matchedSongs,
      createdAt: now,
      formattedDate: new Date(now).toLocaleString(),
      notes: notes?.trim() || undefined
    };

    if (!Array.isArray(db.mixes)) {
      db.mixes = [];
    }

    db.mixes.unshift(newMix);
    saveDatabase(db);

    broadcast({
      type: 'mixes_updated',
      mixes: db.mixes,
      mix: newMix,
      timestamp: now
    });

    return res.json({ success: true, mix: newMix, mixes: db.mixes });
  } catch (err: any) {
    console.error('Error creating mix:', err);
    return res.status(500).json({ error: 'Failed to record mix' });
  }
});

// Delete a recorded mix
app.delete('/api/mixes/:id', (req, res) => {
  const { id } = req.params;
  if (!Array.isArray(db.mixes)) {
    db.mixes = [];
  }

  const initialCount = db.mixes.length;
  db.mixes = db.mixes.filter(m => m.id !== id);

  if (db.mixes.length !== initialCount) {
    saveDatabase(db);
    broadcast({
      type: 'mixes_updated',
      mixes: db.mixes,
      timestamp: Date.now()
    });
    return res.json({ success: true, remainingCount: db.mixes.length });
  }

  return res.status(404).json({ error: 'Mix not found' });
});

// --- DATABASE EXPORT & RESTORE API ---

app.post('/api/database/export', (_req, res) => {
  try {
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = `musicmix_backup_${timestampStr}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    const snapshotPayload = {
      version: '1.0',
      exportedAt: Date.now(),
      playlist: db.playlist,
      searchedSongs: db.searchedSongs,
      mixes: db.mixes || [],
      lastUpdated: db.lastUpdated
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshotPayload, null, 2), 'utf-8');

    const backups = getStoredBackups();
    const currentBackup = backups.find(b => b.filename === filename) || backups[0];

    return res.json({
      success: true,
      filename,
      backup: currentBackup,
      backups,
      data: snapshotPayload
    });
  } catch (err) {
    console.error('Failed to export database:', err);
    return res.status(500).json({ error: 'Failed to create database export' });
  }
});

app.get('/api/database/exports', (_req, res) => {
  const backups = getStoredBackups();
  res.json({ backups });
});

app.get('/api/database/exports/:filename', (req, res) => {
  const { filename } = req.params;
  const cleanFilename = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, cleanFilename);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Content-Type', 'application/json');
    return res.sendFile(filePath);
  }

  return res.status(404).json({ error: 'Backup file not found' });
});

app.post('/api/database/restore', (req, res) => {
  try {
    const { filename, backupData } = req.body as { filename?: string; backupData?: DatabaseSchema };
    let targetData: DatabaseSchema | null = null;

    if (filename) {
      const cleanFilename = path.basename(filename);
      const filePath = path.join(BACKUPS_DIR, cleanFilename);
      if (fs.existsSync(filePath)) {
        targetData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } else {
        return res.status(404).json({ error: 'Specified backup file not found' });
      }
    } else if (backupData && Array.isArray(backupData.playlist)) {
      targetData = backupData;
    }

    if (!targetData || !Array.isArray(targetData.playlist)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    db = {
      playlist: targetData.playlist,
      searchedSongs: Array.isArray(targetData.searchedSongs) ? targetData.searchedSongs : targetData.playlist,
      mixes: Array.isArray(targetData.mixes) ? targetData.mixes : (db.mixes || []),
      lastUpdated: Date.now()
    };

    saveDatabase(db);

    broadcast({
      type: 'init',
      playlist: db.playlist,
      mixes: db.mixes,
      timestamp: Date.now()
    });

    return res.json({
      success: true,
      message: 'Database restored successfully',
      playlistCount: db.playlist.length,
      searchedSongsCount: db.searchedSongs.length,
      playlist: db.playlist
    });
  } catch (err) {
    console.error('Failed to restore database:', err);
    return res.status(500).json({ error: 'Failed to restore database' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MusicMix',
    clientIp: getClientIp(req),
    connectedComputers: getActiveComputersCount(),
    connectedSessions: clientSessions.size,
    playlistCount: db.playlist.length,
    mixesCount: (db.mixes || []).length,
    databaseCount: db.searchedSongs.length,
    historyCount: recommendationHistory.length,
    timestamp: Date.now()
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 MusicMix server is running on http://0.0.0.0:${PORT}`);
    console.log(`🔌 WebSocket server active on /ws`);
    console.log(`💾 Database stored in ${DB_FILE}`);

    // Pre-cache all album art offline in background
    precacheAllCoversOffline().catch((err) => {
      console.warn('Cover art pre-caching error:', err);
    });
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
