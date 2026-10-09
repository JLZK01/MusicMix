import React, { useState, useEffect } from 'react';
import {
  ListMusic,
  Heart,
  Sparkles,
  Shuffle,
  Compass,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  Flame,
  Trash2,
  Disc3,
  Search,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Song, SongMix, RandomizeFilterOption, HarmonicMatchResult, TonalityFilterOption } from '../types/music';
import {
  getKeyColor,
  recommendTracksFromPlaylist
} from '../utils/harmonic';
import { SongCoverArt } from './SongCoverArt';
import { getAllMixedPartnersForSong, areSongsMixedTogether } from '../utils/mixUtils';

interface PlaylistWindowProps {
  playlist: Song[];
  mixes?: SongMix[];
  onToggleLike: (song: Song) => void;
  onDeleteFromPlaylist: (songId: string) => void;
  selectedTrack: Song | null;
  onSelectTrack: (song: Song) => void;
  onNavigateToSearch?: () => void;
  onPlaylistUpdated?: (playlist: Song[]) => void;
}

type SortField = 'index' | 'title' | 'artist' | 'genre' | 'duration' | 'bpm' | 'key' | 'year';
type SortOrder = 'asc' | 'desc';

export const PlaylistWindow: React.FC<PlaylistWindowProps> = ({
  playlist,
  mixes = [],
  onToggleLike,
  onDeleteFromPlaylist,
  selectedTrack,
  onSelectTrack,
  onNavigateToSearch,
  onPlaylistUpdated
}) => {
  const [activeFilters, setActiveFilters] = useState<RandomizeFilterOption[]>(['BPM', 'KEY']);
  const [tonalityFilter, setTonalityFilter] = useState<TonalityFilterOption>('mixed');
  const [recommendCount, setRecommendCount] = useState<number>(5);
  const [recommendedResults, setRecommendedResults] = useState<HarmonicMatchResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Refresh data state (rate-limited up to 15 songs/second)
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number; currentTitle?: string } | null>(null);
  const [refreshingTrackId, setRefreshingTrackId] = useState<string | null>(null);

  // Sorting state for central playlist categories
  const [sortField, setSortField] = useState<SortField>('index');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (!selectedTrack && playlist.length > 0) {
      onSelectTrack(playlist[0]);
    }
  }, [playlist, selectedTrack, onSelectTrack]);

  // Log recommendation set to server history
  const logRecommendationHistory = async (
    refTrack: Song,
    results: HarmonicMatchResult[],
    mode: 'random' | 'filtered',
    filters: string[]
  ) => {
    try {
      await fetch('/api/history/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceTrack: refTrack,
          recommendations: results,
          mode,
          filterOptions: filters
        })
      });
    } catch (e) {
      console.warn('Failed to log recommendation to history:', e);
    }
  };

  // Initial recommendation
  useEffect(() => {
    if (selectedTrack && playlist.length > 1 && recommendedResults.length === 0) {
      const matches = recommendTracksFromPlaylist(
        selectedTrack,
        playlist,
        activeFilters,
        recommendCount,
        false,
        tonalityFilter
      );
      setRecommendedResults(matches);
    }
  }, [selectedTrack, playlist, recommendCount, activeFilters, tonalityFilter]);

  const toggleFilter = (option: RandomizeFilterOption) => {
    setActiveFilters(prev => {
      const next = prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option];
      if (selectedTrack && playlist.length > 1) {
        const matches = recommendTracksFromPlaylist(
          selectedTrack,
          playlist,
          next,
          recommendCount,
          false,
          tonalityFilter
        );
        setRecommendedResults(matches);
      }
      return next;
    });
  };

  // Handle Tonality Slider Change
  const handleTonalityChange = (val: TonalityFilterOption) => {
    setTonalityFilter(val);
    if (selectedTrack && playlist.length > 1) {
      const matches = recommendTracksFromPlaylist(
        selectedTrack,
        playlist,
        activeFilters,
        recommendCount,
        false,
        val
      );
      setRecommendedResults(matches);
    }
  };

  // Handle Find Closest
  const handleFindClosestMatch = () => {
    if (!selectedTrack || playlist.length === 0) return;
    setIsRolling(true);
    setTimeout(() => {
      const matches = recommendTracksFromPlaylist(
        selectedTrack,
        playlist,
        activeFilters,
        recommendCount,
        false,
        tonalityFilter
      );
      setRecommendedResults(matches);
      setIsRolling(false);
      showNotice(`Found top ${matches.length} closest harmonic match${matches.length !== 1 ? 'es' : ''}!`);
      const filterLabels: string[] = [...activeFilters];
      if (tonalityFilter !== 'mixed') {
        filterLabels.push(`Tonality: ${tonalityFilter.toUpperCase()}`);
      }
      logRecommendationHistory(selectedTrack, matches, 'filtered', filterLabels);
    }, 280);
  };

  // Handle Pure Random
  const handlePureRandom = () => {
    if (!selectedTrack || playlist.length === 0) return;
    setIsRolling(true);
    setTimeout(() => {
      const matches = recommendTracksFromPlaylist(
        selectedTrack,
        playlist,
        [],
        recommendCount,
        true,
        tonalityFilter
      );
      setRecommendedResults(matches);
      setIsRolling(false);
      showNotice(`🎲 Truly randomized ${matches.length} ${tonalityFilter !== 'mixed' ? tonalityFilter : ''} track${matches.length !== 1 ? 's' : ''}!`);
      logRecommendationHistory(selectedTrack, matches, 'random', [
        tonalityFilter !== 'mixed' ? `Tonality: ${tonalityFilter.toUpperCase()}` : 'Tonality: MIXED'
      ]);
    }, 280);
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Sync with live WebSocket refresh progress
  useEffect(() => {
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.current !== undefined) {
        setIsRefreshingAll(true);
        setRefreshProgress({
          current: detail.current,
          total: detail.total || playlist.length,
          currentTitle: detail.song?.title
        });
      }
    };

    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsRefreshingAll(false);
      setRefreshProgress(null);
      if (detail?.playlist && onPlaylistUpdated) {
        onPlaylistUpdated(detail.playlist);
      }
      showNotice(`Successfully updated playlist songs with acoustic intelligence! (15/s limit)`);
    };

    window.addEventListener('musicmix:refresh_progress', onProgress);
    window.addEventListener('musicmix:refresh_completed', onComplete);

    return () => {
      window.removeEventListener('musicmix:refresh_progress', onProgress);
      window.removeEventListener('musicmix:refresh_completed', onComplete);
    };
  }, [playlist.length, onPlaylistUpdated]);

  // Handle rate-limited bulk refresh of all songs in playlist (strictly up to 15 songs/second)
  const handleRefreshAll = async () => {
    if (playlist.length === 0 || isRefreshingAll) return;
    setIsRefreshingAll(true);
    setRefreshProgress({ current: 0, total: playlist.length });

    try {
      const res = await fetch('/api/playlist/refresh-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.playlist && onPlaylistUpdated) {
          onPlaylistUpdated(data.playlist);
        }
        showNotice(`Refreshed ${data.count || playlist.length} tracks with verified acoustic data! (15/s limit applied)`);
      } else {
        showNotice('Failed to refresh playlist data');
      }
    } catch (err) {
      console.error('Error refreshing playlist:', err);
      showNotice('Network error refreshing playlist');
    } finally {
      setIsRefreshingAll(false);
      setRefreshProgress(null);
    }
  };

  // Handle single track refresh (rate-limited <= 15 songs/sec)
  const handleRefreshTrack = async (song: Song) => {
    if (refreshingTrackId === song.id || isRefreshingAll) return;
    setRefreshingTrackId(song.id);

    try {
      const res = await fetch(`/api/playlist/refresh-track/${encodeURIComponent(song.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.playlist && onPlaylistUpdated) {
          onPlaylistUpdated(data.playlist);
        }
        const updated = data.song || song;
        showNotice(`Updated "${updated.title}" - ${updated.camelotKey} (${updated.songKey}) • ${updated.bpm} BPM`);
      } else {
        showNotice(`Could not refresh "${song.title}"`);
      }
    } catch (err) {
      console.error('Error refreshing track:', err);
      showNotice(`Error refreshing "${song.title}"`);
    } finally {
      setRefreshingTrackId(null);
    }
  };

  // Toggle sorting by category
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400" />
    );
  };

  // Filter and sort playlist
  const filteredPlaylist = playlist.filter(s => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.songKey.toLowerCase().includes(q) ||
      s.camelotKey.toLowerCase().includes(q) ||
      String(s.bpm).includes(q)
    );
  });

  const sortedPlaylist = [...filteredPlaylist].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'artist':
        comparison = a.artist.localeCompare(b.artist);
        break;
      case 'genre':
        comparison = a.genre.localeCompare(b.genre);
        break;
      case 'duration':
        comparison = a.durationMs - b.durationMs;
        break;
      case 'bpm':
        comparison = a.bpm - b.bpm;
        break;
      case 'key':
        comparison = a.camelotKey.localeCompare(b.camelotKey);
        break;
      case 'year':
        comparison = Number(a.releaseYear || 0) - Number(b.releaseYear || 0);
        break;
      case 'index':
      default:
        comparison = 0;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const currentReference = selectedTrack || (playlist.length > 0 ? playlist[0] : null);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-cyan-500/40 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium">{actionNotice}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT COLUMN: Central Playlist Table with Category Sorting */}
        {/* ============================================================== */}
        <section className="lg:col-span-7 space-y-4">
          {/* Header Card */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-xl backdrop-blur-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-md">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Central Playlist</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {playlist.length} Tracks
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Click column headers below to sort by any category
                  </p>
                </div>
              </div>

              {/* Action Toolbar: Refresh Data + Filter input */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRefreshAll}
                  disabled={isRefreshingAll || playlist.length === 0}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold font-mono flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    isRefreshingAll
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 animate-pulse cursor-wait'
                      : 'bg-zinc-950 hover:bg-cyan-950/40 border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-300 shadow-sm'
                  }`}
                  title="Update all songs in playlist with verified BPM, Key & acoustic features (strictly rate-limited to 15 songs/sec)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                  <span>{isRefreshingAll ? 'Refreshing...' : 'Refresh Data'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-normal hidden md:inline">
                    15/s max
                  </span>
                </button>

                {/* Quick filter in playlist */}
                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter playlist..."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-lg px-3 py-1.5 pl-8 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/60 font-mono">
              <span className="text-zinc-400">
                Sorted by: <strong className="text-cyan-400 uppercase">{sortField}</strong> ({sortOrder})
              </span>
              <span className="text-cyan-400 truncate max-w-[240px]">
                {currentReference ? `Active: "${currentReference.title}"` : 'No track selected'}
              </span>
            </div>
          </div>

          {/* Rate-Limited Live Progress Bar Banner (Up to 15 songs/sec) */}
          {isRefreshingAll && (
            <div className="p-4 rounded-2xl bg-cyan-950/25 border border-cyan-500/40 backdrop-blur-md space-y-2.5 shadow-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-cyan-300 font-mono font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span>
                    Refreshing playlist acoustic features: <strong className="text-white">{refreshProgress?.current || 0}</strong> of <strong className="text-white">{refreshProgress?.total || playlist.length}</strong> tracks
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Rate Limit: 15 songs/sec
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${Math.min(100, Math.round(((refreshProgress?.current || 0) / Math.max(refreshProgress?.total || playlist.length, 1)) * 100))}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span className="truncate max-w-[280px]">
                  {refreshProgress?.currentTitle ? `Analyzing: "${refreshProgress.currentTitle}"` : 'Updating acoustic features & harmonic keys...'}
                </span>
                <span className="font-semibold text-cyan-400">
                  {Math.min(100, Math.round(((refreshProgress?.current || 0) / Math.max(refreshProgress?.total || playlist.length, 1)) * 100))}%
                </span>
              </div>
            </div>
          )}

          {/* Playlist Table */}
          {playlist.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-4">
              <Disc3 className="w-12 h-12 text-zinc-600 mx-auto animate-[spin_10s_linear_infinite]" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Central Playlist is Empty</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Search songs using the audio catalog or use the Editor page to add music.
                </p>
              </div>
              {onNavigateToSearch && (
                <button
                  onClick={onNavigateToSearch}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Go to Music Search</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden shadow-2xl backdrop-blur-md">
              {/* Category Sortable Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/70 text-[11px] font-mono uppercase tracking-wider text-zinc-400 select-none">
                {/* Track / Artist Sort */}
                <button
                  onClick={() => handleSort('title')}
                  className="col-span-5 flex items-center gap-1.5 hover:text-white transition text-left cursor-pointer"
                >
                  <span>Track & Artist</span>
                  {renderSortIcon('title')}
                </button>

                {/* Genre Sort */}
                <button
                  onClick={() => handleSort('genre')}
                  className="col-span-2 flex items-center gap-1.5 hover:text-white transition text-left cursor-pointer"
                >
                  <span>Genre</span>
                  {renderSortIcon('genre')}
                </button>

                {/* Duration Sort */}
                <button
                  onClick={() => handleSort('duration')}
                  className="col-span-1 flex items-center gap-1.5 hover:text-white transition text-left cursor-pointer"
                >
                  <span>Time</span>
                  {renderSortIcon('duration')}
                </button>

                {/* BPM Sort */}
                <button
                  onClick={() => handleSort('bpm')}
                  className="col-span-1 flex items-center gap-1.5 hover:text-white transition text-left cursor-pointer"
                >
                  <span>BPM</span>
                  {renderSortIcon('bpm')}
                </button>

                {/* Key Sort */}
                <button
                  onClick={() => handleSort('key')}
                  className="col-span-2 flex items-center gap-1.5 hover:text-white transition text-left cursor-pointer"
                >
                  <span>Key</span>
                  {renderSortIcon('key')}
                </button>

                {/* Action */}
                <div className="col-span-1 text-right">
                  <span>Action</span>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-zinc-800/60 max-h-[680px] overflow-y-auto">
                {sortedPlaylist.map((song, index) => {
                  const isSelected = currentReference?.id === song.id;
                  const keyColor = getKeyColor(song.camelotKey);

                  return (
                    <div
                      key={song.id}
                      onClick={() => onSelectTrack(song)}
                      className={`group px-4 py-3 cursor-pointer transition flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start sm:items-center relative ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-950/40 via-violet-950/30 to-zinc-900 border-l-4 border-l-cyan-400'
                          : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      {/* Album Art & Track Info */}
                      <div className="sm:col-span-5 w-full flex items-center gap-3">
                        <span className="text-[11px] font-mono text-zinc-500 w-4 shrink-0 text-center">
                          {index + 1}
                        </span>

                        <SongCoverArt
                          url={song.coverArtUrl}
                          songId={song.id}
                          title={song.title}
                          artist={song.artist}
                          size="md"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs font-semibold truncate transition ${
                                isSelected ? 'text-cyan-300 font-bold' : 'text-white group-hover:text-cyan-200'
                              }`}
                            >
                              {song.title}
                            </span>
                            {isSelected && (
                              <span className="shrink-0 text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                                ACTIVE
                              </span>
                            )}
                            {song.lastRefreshedAt && (
                              <span
                                className="shrink-0 text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold"
                                title={`Acoustic data updated: ${new Date(song.lastRefreshedAt).toLocaleTimeString()}`}
                              >
                                VERIFIED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">{song.artist}</div>
                        </div>
                      </div>

                      {/* Genre */}
                      <div className="sm:col-span-2 flex items-center">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 truncate">
                          {song.genre}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="sm:col-span-1 text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500 sm:hidden" />
                        <span>{song.durationFormatted}</span>
                      </div>

                      {/* BPM */}
                      <div className="sm:col-span-1">
                        <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          {song.bpm}
                        </span>
                      </div>

                      {/* Key */}
                      <div className="sm:col-span-2">
                        <span
                          className="font-mono text-xs font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${keyColor}18`,
                            borderColor: `${keyColor}40`,
                            color: keyColor
                          }}
                        >
                          <span>{song.camelotKey}</span>
                          <span className="text-[10px] opacity-75">({song.songKey})</span>
                        </span>
                      </div>

                      {/* Action: Per-track Refresh + Delete */}
                      <div className="sm:col-span-1 flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshTrack(song);
                          }}
                          disabled={isRefreshingAll || refreshingTrackId === song.id}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            refreshingTrackId === song.id
                              ? 'text-cyan-400 bg-cyan-950/60'
                              : 'text-zinc-500 hover:text-cyan-300 hover:bg-cyan-950/30'
                          }`}
                          title="Refresh acoustic features & key for this song (15/s limit)"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              refreshingTrackId === song.id ? 'animate-spin text-cyan-400' : ''
                            }`}
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFromPlaylist(song.id);
                            showNotice(`Removed "${song.title}" from Central Playlist`);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Remove from Central Playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: Sidebar (No "TOP RIGHT WINDOW" label, no waveform) */}
        {/* ============================================================== */}
        <aside className="lg:col-span-5 space-y-6">
          {/* ============================================================== */}
          {/* ACTIVE REFERENCE TRACK INSPECTOR (Compact layout, same info) */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-zinc-900/90 border border-cyan-500/30 p-3.5 shadow-xl backdrop-blur-xl relative overflow-hidden space-y-2.5">
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Compact Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  ACTIVE REFERENCE TRACK
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {currentReference && (
                  <button
                    onClick={() => handleRefreshTrack(currentReference)}
                    disabled={isRefreshingAll || refreshingTrackId === currentReference.id}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-cyan-950/60 text-zinc-300 hover:text-cyan-300 border border-zinc-700/80 hover:border-cyan-500/40 transition cursor-pointer flex items-center gap-1"
                    title="Refresh acoustic features for active track (15/s limit)"
                  >
                    <RefreshCw
                      className={`w-2.5 h-2.5 ${
                        refreshingTrackId === currentReference.id ? 'animate-spin text-cyan-400' : ''
                      }`}
                    />
                    <span>Refresh</span>
                  </button>
                )}
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Now Selected
                </span>
              </div>
            </div>

            {currentReference ? (
              <div className="space-y-2.5">
                {/* Track Row (Album Art + Title + Artist + Year/Duration) */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                  <SongCoverArt
                    url={currentReference.coverArtUrl}
                    songId={currentReference.id}
                    title={currentReference.title}
                    artist={currentReference.artist}
                    size="md"
                    className="shadow-lg ring-1 ring-cyan-500/30 shrink-0 w-12 h-12"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white tracking-tight truncate leading-tight">
                      {currentReference.title}
                    </div>
                    <div className="text-xs text-zinc-300 font-medium truncate mt-0.5">
                      {currentReference.artist}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 pt-0.5">
                      <span>Released: {currentReference.releaseYear}</span>
                      <span>•</span>
                      <span>{currentReference.durationFormatted}</span>
                      <span>•</span>
                      <span className="text-zinc-400 truncate">{currentReference.genre}</span>
                    </div>
                  </div>
                </div>

                {/* Compact Spec Grid (4 items: Tempo, Key, Genre, Duration & Year) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* BPM */}
                  <div className="p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col justify-between">
                    <div className="text-[9px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>TEMPO</span>
                      <Flame className="w-2.5 h-2.5 text-cyan-400" />
                    </div>
                    <div className="text-sm font-bold font-mono text-cyan-300 flex items-baseline gap-1 mt-0.5">
                      <span>{currentReference.bpm}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">BPM</span>
                    </div>
                  </div>

                  {/* Musical Key */}
                  <div
                    className="p-2 rounded-lg border flex flex-col justify-between"
                    style={{
                      backgroundColor: `${getKeyColor(currentReference.camelotKey)}12`,
                      borderColor: `${getKeyColor(currentReference.camelotKey)}35`
                    }}
                  >
                    <div className="text-[9px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>KEY</span>
                      <Compass
                        className="w-2.5 h-2.5"
                        style={{ color: getKeyColor(currentReference.camelotKey) }}
                      />
                    </div>
                    <div
                      className="text-sm font-bold font-mono flex items-baseline gap-1 mt-0.5 truncate"
                      style={{ color: getKeyColor(currentReference.camelotKey) }}
                    >
                      <span>{currentReference.camelotKey}</span>
                      <span className="text-[10px] font-normal opacity-85 truncate">
                        ({currentReference.songKey})
                      </span>
                    </div>
                  </div>

                  {/* Genre */}
                  <div className="p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col justify-between">
                    <div className="text-[9px] font-mono text-zinc-400">GENRE</div>
                    <div className="text-[11px] font-semibold text-zinc-200 truncate mt-0.5">
                      {currentReference.genre}
                    </div>
                  </div>

                  {/* Duration & Year */}
                  <div className="p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col justify-between">
                    <div className="text-[9px] font-mono text-zinc-400">DURATION & YEAR</div>
                    <div className="text-[11px] font-mono font-medium text-zinc-300 flex items-center gap-1 mt-0.5 truncate">
                      <span>{currentReference.durationFormatted}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{currentReference.releaseYear}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-zinc-500">
                Select a song on the left to inspect
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* RECOMMENDATION AREA WITH TONALITY & COUNT SLIDERS (UP TO 20) */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-zinc-900/90 border border-violet-500/30 p-4 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-3">
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-semibold">
                  PLAYLIST RECOMMENDATION & RANDOMIZER
                </h3>
              </div>
            </div>

            {/* Filter Mode Selector Buttons (Compact) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>FILTER MODES (MULTI-SELECT):</span>
                <span className="text-violet-400 font-semibold">
                  {activeFilters.length === 0 ? 'None (Broad)' : `${activeFilters.length} Active`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['BPM', 'KEY', 'Genre'] as RandomizeFilterOption[]).map((option) => {
                  const isChecked = activeFilters.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleFilter(option)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold font-mono transition flex items-center justify-center gap-1 cursor-pointer border ${
                        isChecked
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-sm'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? 'bg-white' : 'bg-zinc-600'}`} />
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NEW: TONALITY FILTER SLIDER (Minor, Mixed, Major) */}
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  TONALITY FILTER SLIDER:
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  tonalityFilter === 'minor'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : tonalityFilter === 'major'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                }`}>
                  {tonalityFilter === 'minor' ? 'MINOR (A KEYS)' : tonalityFilter === 'major' ? 'MAJOR (B KEYS)' : 'MIXED (ALL)'}
                </span>
              </div>

              {/* 3-step slider: 0 = minor, 1 = mixed, 2 = major */}
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                value={tonalityFilter === 'minor' ? 0 : tonalityFilter === 'major' ? 2 : 1}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  handleTonalityChange(v === 0 ? 'minor' : v === 2 ? 'major' : 'mixed');
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />

              {/* Clickable slider ticks */}
              <div className="flex justify-between text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => handleTonalityChange('minor')}
                  className={`transition cursor-pointer px-1 py-0.5 rounded ${
                    tonalityFilter === 'minor' ? 'text-cyan-300 font-bold bg-cyan-500/10' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  ◀ Minor
                </button>
                <button
                  type="button"
                  onClick={() => handleTonalityChange('mixed')}
                  className={`transition cursor-pointer px-1 py-0.5 rounded ${
                    tonalityFilter === 'mixed' ? 'text-violet-300 font-bold bg-violet-500/10' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  • Mixed •
                </button>
                <button
                  type="button"
                  onClick={() => handleTonalityChange('major')}
                  className={`transition cursor-pointer px-1 py-0.5 rounded ${
                    tonalityFilter === 'major' ? 'text-amber-300 font-bold bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Major ▶
                </button>
              </div>
            </div>

            {/* Increasing Slider (Up to 20 songs) - Compact */}
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  RECOMMEND COUNT SLIDER:
                </span>
                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px] border border-violet-500/30">
                  {recommendCount} {recommendCount === 1 ? 'Track' : 'Tracks'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={recommendCount}
                onChange={(e) => setRecommendCount(parseInt(e.target.value, 10))}
                className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                <span>1 track</span>
                <span>10 tracks</span>
                <span>20 tracks (Max)</span>
              </div>
            </div>

            {/* Action Buttons - Compact */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={handleFindClosestMatch}
                disabled={isRolling || playlist.length === 0}
                className="py-2 px-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/20 cursor-pointer border border-violet-400/30"
              >
                <SlidersHorizontal className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                <span>FIND CLOSEST ({recommendCount})</span>
              </button>

              <button
                onClick={handlePureRandom}
                disabled={isRolling || playlist.length === 0}
                className="py-2 px-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 hover:border-fuchsia-500 text-fuchsia-300 hover:text-white font-semibold text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-inner"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                <span>🎲 RANDOM ({recommendCount})</span>
              </button>
            </div>

            {/* Recommended Songs Display List */}
            {recommendedResults.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>RECOMMENDED RESULTS (DESCENDING ORDER):</span>
                  <span className="text-violet-300 font-bold">{recommendedResults.length} matches</span>
                </div>

                {recommendedResults.map((result, idx) => {
                  const mixedInfo = getAllMixedPartnersForSong(result.song.id, mixes);
                  const isMixedWithReference = currentReference
                    ? areSongsMixedTogether(currentReference.id, result.song.id, mixes).isMixed
                    : false;
                  const hasBeenMixed = isMixedWithReference || mixedInfo.partnerSongs.length > 0;

                  return (
                    <div
                      key={`${result.song.id}-${idx}`}
                      className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-violet-500/40 transition space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">#{idx + 1}</span>
                          <SongCoverArt
                            url={result.song.coverArtUrl}
                            songId={result.song.id}
                            title={result.song.title}
                            artist={result.song.artist}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate">
                              {result.song.title}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {result.song.artist}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Already Mixed tag beside percentage match */}
                          {hasBeenMixed && (
                            <div className="relative group/mixed-tag">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition cursor-help ${
                                  isMixedWithReference
                                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                                    : 'bg-zinc-850 text-zinc-300 border border-zinc-700'
                                }`}
                              >
                                <Layers className="w-2.5 h-2.5 text-amber-400" />
                                <span>Already Mixed</span>
                              </span>

                              {/* Hover Tooltip: shows the songs already mixed with the track */}
                              <div className="absolute right-0 top-full mt-1.5 hidden group-hover/mixed-tag:block z-50 w-72 p-3 rounded-xl bg-zinc-950 border border-amber-500/40 shadow-2xl backdrop-blur-2xl text-left pointer-events-none animate-in fade-in duration-150 space-y-2">
                                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Songs Mixed With This Track</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    {mixedInfo.partnerSongs.length} track{mixedInfo.partnerSongs.length !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                {isMixedWithReference && currentReference && (
                                  <div className="px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-mono font-medium">
                                    ★ Mixed together with active track "{currentReference.title}"
                                  </div>
                                )}

                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {mixedInfo.partnerSongs.length > 0 ? (
                                    mixedInfo.partnerSongs.map(partner => (
                                      <div
                                        key={partner.id}
                                        className="flex items-center gap-2 p-1 rounded bg-zinc-900 border border-zinc-800/80 text-[10px]"
                                      >
                                        <SongCoverArt
                                          url={partner.coverArtUrl}
                                          songId={partner.id}
                                          title={partner.title}
                                          artist={partner.artist}
                                          size="xs"
                                        />
                                        <div className="truncate flex-1">
                                          <div className="font-semibold text-white truncate">
                                            {partner.title}
                                          </div>
                                          <div className="text-zinc-400 truncate">
                                            {partner.artist}
                                          </div>
                                        </div>
                                        <span className="text-zinc-500 font-mono shrink-0">
                                          {partner.bpm} BPM
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[10px] text-zinc-500 italic">
                                      Part of a recorded mix
                                    </div>
                                  )}
                                </div>

                                {mixedInfo.mixNames.length > 0 && (
                                  <div className="text-[9px] font-mono text-zinc-500 border-t border-zinc-800/80 pt-1 truncate">
                                    In mix: {mixedInfo.mixNames.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold font-mono">
                            {result.totalScore}%
                          </span>
                        </div>
                      </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-cyan-300 border border-zinc-800">
                        {result.song.bpm} BPM
                      </span>
                      <span
                        className="px-1.5 py-0.2 rounded border"
                        style={{
                          backgroundColor: `${getKeyColor(result.song.camelotKey)}15`,
                          borderColor: `${getKeyColor(result.song.camelotKey)}35`,
                          color: getKeyColor(result.song.camelotKey)
                        }}
                      >
                        {result.song.camelotKey} ({result.song.songKey})
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 truncate max-w-[120px]">
                        {result.song.genre}
                      </span>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => {
                          onSelectTrack(result.song);
                          showNotice(`Set "${result.song.title}" as active reference track!`);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Set as Active Track</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800 text-center text-xs text-zinc-500">
                {playlist.length < 2
                  ? 'Add at least 2 songs to your central playlist to run recommendations.'
                  : 'Click "FIND CLOSEST" or "RANDOM" to generate recommendations.'}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
