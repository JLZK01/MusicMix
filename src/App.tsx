import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, SongMix, ClientSyncMessage } from './types/music';
import { Navbar, ActiveView } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { SearchPage } from './components/SearchPage';
import { PlaylistWindow } from './components/PlaylistWindow';
import { EditorPage } from './components/EditorPage';
import { MixesPage } from './components/MixesPage';
import { HistoryPage } from './components/HistoryPage';
import { DatabasePage } from './components/DatabasePage';
import { Sparkles } from 'lucide-react';

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem('musicmix_device_uuid');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('musicmix_device_uuid', id);
    }
    return id;
  } catch {
    return 'dev_' + Math.random().toString(36).slice(2, 10);
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'app'>('landing');
  const [activeTab, setActiveTab] = useState<ActiveView>('search');

  // Music State
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [databaseSongs, setDatabaseSongs] = useState<Song[]>([]);
  const [mixes, setMixes] = useState<SongMix[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);

  // Real-time Multi-device WebSocket State
  const [isConnected, setIsConnected] = useState(false);
  const [activeClientsCount, setActiveClientsCount] = useState<number>(1);
  const [liveSyncToast, setLiveSyncToast] = useState<string | null>(null);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Fetch initial playlist and database songs via REST
  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch('/api/playlist');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.playlist)) {
          setPlaylist(data.playlist);
          if (data.playlist.length > 0 && !selectedTrack) {
            setSelectedTrack(data.playlist[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch playlist:', err);
    }
  }, [selectedTrack]);

  const fetchDatabaseSongs = useCallback(async () => {
    try {
      const res = await fetch('/api/database/songs');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.songs)) {
          setDatabaseSongs(data.songs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch database songs:', err);
    }
  }, []);

  const fetchMixes = useCallback(async () => {
    try {
      const res = await fetch('/api/mixes');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.mixes)) {
          setMixes(data.mixes);
        }
      }
    } catch (err) {
      console.error('Failed to fetch mixes:', err);
    }
  }, []);

  // Initialize WebSocket connection for multi-computer live sync
  const setupWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const deviceId = getOrCreateDeviceId();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?deviceId=${encodeURIComponent(deviceId)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        try {
          ws.send(JSON.stringify({ type: 'device_hello', deviceId }));
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ClientSyncMessage;
          if (msg.type === 'init') {
            if (msg.playlist) {
              setPlaylist(msg.playlist);
              if (msg.playlist.length > 0 && !selectedTrack) {
                setSelectedTrack(msg.playlist[0]);
              }
            }
            if (msg.mixes) {
              setMixes(msg.mixes);
            }
            if (msg.activeCount !== undefined) {
              setActiveClientsCount(msg.activeCount);
            }
          } else if (msg.type === 'playlist_updated') {
            if (msg.playlist) {
              setPlaylist(msg.playlist);
            }
            if (msg.song) {
              setLiveSyncToast(`Playlist synced: "${msg.song.title}"`);
              setTimeout(() => setLiveSyncToast(null), 3000);
            }
            fetchDatabaseSongs();
          } else if (msg.type === 'playlist_refresh_progress') {
            if (msg.song) {
              setPlaylist(prev => prev.map(p => p.id === msg.song!.id ? msg.song! : p));
            }
            window.dispatchEvent(new CustomEvent('musicmix:refresh_progress', { detail: msg }));
          } else if (msg.type === 'playlist_refresh_completed') {
            if (msg.playlist) {
              setPlaylist(msg.playlist);
            }
            window.dispatchEvent(new CustomEvent('musicmix:refresh_completed', { detail: msg }));
            fetchDatabaseSongs();
          } else if (msg.type === 'mixes_updated') {
            if (msg.mixes) {
              setMixes(msg.mixes);
            }
            if (msg.mix) {
              setLiveSyncToast(`Mix recorded: "${msg.mix.name}"`);
              setTimeout(() => setLiveSyncToast(null), 3000);
            }
          } else if (msg.type === 'active_users') {
            if (msg.activeCount !== undefined) {
              setActiveClientsCount(msg.activeCount);
            }
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          setupWebSocket();
        }, 2500);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('Could not construct WebSocket:', e);
    }
  }, [selectedTrack, fetchDatabaseSongs]);

  useEffect(() => {
    fetchPlaylist();
    fetchDatabaseSongs();
    fetchMixes();
    setupWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchPlaylist, fetchDatabaseSongs, fetchMixes, setupWebSocket]);

  // Mixes API Handlers
  const handleRecordMix = async (songIds: string[], name?: string, notes?: string) => {
    const res = await fetch('/api/mixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds, name, notes })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.mixes) {
        setMixes(data.mixes);
      }
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record mix');
    }
  };

  const handleDeleteMix = async (mixId: string) => {
    const res = await fetch(`/api/mixes/${encodeURIComponent(mixId)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      setMixes(prev => prev.filter(m => m.id !== mixId));
    } else {
      throw new Error('Failed to delete mix');
    }
  };

  // Toggle like / add to Central Playlist
  const handleToggleLike = async (song: Song) => {
    try {
      const res = await fetch('/api/playlist/toggle-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.playlist) {
          setPlaylist(data.playlist);
        }
        fetchDatabaseSongs();
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Delete from playlist
  const handleDeleteFromPlaylist = async (songId: string) => {
    try {
      const res = await fetch(`/api/playlist/${encodeURIComponent(songId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPlaylist(prev => prev.filter(s => s.id !== songId));
      }
    } catch (err) {
      console.error('Error deleting track from playlist:', err);
    }
  };

  const handleSelectTrack = (song: Song) => {
    setSelectedTrack(song);
  };

  const handlePlaylistUpdated = (newPlaylist: Song[]) => {
    setPlaylist(newPlaylist);
    if (newPlaylist.length > 0 && (!selectedTrack || !newPlaylist.some(s => s.id === selectedTrack.id))) {
      setSelectedTrack(newPlaylist[0]);
    }
    fetchDatabaseSongs();
  };

  const handleDatabaseRestored = (newPlaylist: Song[]) => {
    setPlaylist(newPlaylist);
    if (newPlaylist.length > 0) {
      setSelectedTrack(newPlaylist[0]);
    }
    fetchDatabaseSongs();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast for real-time remote updates */}
      {liveSyncToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-cyan-500/50 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <div className="text-xs">
            <span className="font-semibold text-cyan-300">Live Sync: </span>
            <span className="text-zinc-200">{liveSyncToast}</span>
          </div>
        </div>
      )}

      {/* Render Landing Page or Main App */}
      {currentPage === 'landing' ? (
        <LandingPage
          onEnter={() => setCurrentPage('app')}
          activeDevicesCount={activeClientsCount}
          playlistCount={playlist.length}
          playlist={playlist}
        />
      ) : (
        <div className="min-h-screen flex flex-col">
          {/* Main Navigation Bar */}
          <Navbar
            currentView={activeTab}
            onViewChange={(view) => setActiveTab(view)}
            playlistCount={playlist.length}
            mixesCount={mixes.length}
            activeClientsCount={activeClientsCount}
            isConnected={isConnected}
            onReturnToHome={() => setCurrentPage('landing')}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {/* Page 1: Search */}
            {activeTab === 'search' && (
              <SearchPage
                onToggleLike={handleToggleLike}
                playlist={playlist}
                databaseSongs={databaseSongs}
                onSelectTrackForStudio={(song) => {
                  setSelectedTrack(song);
                  setActiveTab('playlist');
                }}
              />
            )}

            {/* Page 2: Central Playlist */}
            {activeTab === 'playlist' && (
              <PlaylistWindow
                playlist={playlist}
                mixes={mixes}
                onToggleLike={handleToggleLike}
                onDeleteFromPlaylist={handleDeleteFromPlaylist}
                selectedTrack={selectedTrack}
                onSelectTrack={handleSelectTrack}
                onNavigateToSearch={() => setActiveTab('search')}
                onPlaylistUpdated={handlePlaylistUpdated}
              />
            )}

            {/* Page 3: Editor */}
            {activeTab === 'editor' && (
              <EditorPage
                playlist={playlist}
                onPlaylistUpdated={handlePlaylistUpdated}
              />
            )}

            {/* Page 4: Mixes Tracker */}
            {activeTab === 'mixes' && (
              <MixesPage
                playlist={playlist}
                mixes={mixes}
                onRecordMix={handleRecordMix}
                onDeleteMix={handleDeleteMix}
                onSelectTrack={(song) => {
                  setSelectedTrack(song);
                  setActiveTab('playlist');
                }}
              />
            )}

            {/* Page 5: History (Last 100 sets + Tailscale IP) */}
            {activeTab === 'history' && (
              <HistoryPage
                onSelectTrackForStudio={(song) => {
                  setSelectedTrack(song);
                  setActiveTab('playlist');
                }}
              />
            )}

            {/* Page 6: Database Vault */}
            {activeTab === 'database' && (
              <DatabasePage
                playlist={playlist}
                databaseSongs={databaseSongs}
                onDatabaseRestored={handleDatabaseRestored}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
