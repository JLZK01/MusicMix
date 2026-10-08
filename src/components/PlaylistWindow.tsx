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
  ArrowDown
} from 'lucide-react';
import { Song, SongMix, RandomizeFilterOption, HarmonicMatchResult } from '../types/music';
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
  onNavigateToSearch
}) => {
  const [activeFilters, setActiveFilters] = useState<RandomizeFilterOption[]>(['BPM', 'KEY']);
  const [recommendCount, setRecommendCount] = useState<number>(5);
  const [recommendedResults, setRecommendedResults] = useState<HarmonicMatchResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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
    filters: RandomizeFilterOption[]
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
        false
      );
      setRecommendedResults(matches);
    }
  }, [selectedTrack, playlist, recommendCount, activeFilters]);

  const toggleFilter = (option: RandomizeFilterOption) => {
    setActiveFilters(prev => {
      if (prev.includes(option)) {
        return prev.filter(item => item !== option);
      } else {
        return [...prev, option];
      }
    });
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
        false
      );
      setRecommendedResults(matches);
      setIsRolling(false);
      showNotice(`Found top ${matches.length} closest harmonic match${matches.length !== 1 ? 'es' : ''}!`);
      logRecommendationHistory(selectedTrack, matches, 'filtered', activeFilters);
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
        true
      );
      setRecommendedResults(matches);
      setIsRolling(false);
      showNotice(`🎲 Truly randomized ${matches.length} track${matches.length !== 1 ? 's' : ''}!`);
      logRecommendationHistory(selectedTrack, matches, 'random', []);
    }, 280);
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
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

              {/* Quick filter in playlist */}
              <div className="relative w-full sm:w-56">
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

            <div className="text-xs text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/60 font-mono">
              <span className="text-zinc-400">
                Sorted by: <strong className="text-cyan-400 uppercase">{sortField}</strong> ({sortOrder})
              </span>
              <span className="text-cyan-400 truncate max-w-[240px]">
                {currentReference ? `Active: "${currentReference.title}"` : 'No track selected'}
              </span>
            </div>
          </div>

          {/* Playlist Table */}
          {playlist.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-4">
              <Disc3 className="w-12 h-12 text-zinc-600 mx-auto animate-[spin_10s_linear_infinite]" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Central Playlist is Empty</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Search songs from MusicBrainz or use the Editor page to add music.
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
                          <div className="flex items-center gap-1.5">
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

                      {/* Action */}
                      <div className="sm:col-span-1 flex items-center justify-end gap-1.5">
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
          {/* ACTIVE REFERENCE TRACK INSPECTOR */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-zinc-900/90 border border-cyan-500/30 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Window Title (Removed "TOP RIGHT WINDOW" as requested) */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  ACTIVE REFERENCE TRACK
                </h3>
              </div>
            </div>

            {currentReference ? (
              <div className="space-y-4">
                {/* Prominent Album Art & Track Info */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
                  <SongCoverArt
                    url={currentReference.coverArtUrl}
                    songId={currentReference.id}
                    title={currentReference.title}
                    artist={currentReference.artist}
                    size="xl"
                    className="shadow-2xl ring-2 ring-cyan-500/30 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      Now Selected
                    </span>
                    <div className="text-lg font-bold text-white tracking-tight leading-snug truncate">
                      {currentReference.title}
                    </div>
                    <div className="text-xs text-zinc-300 font-medium truncate">
                      {currentReference.artist}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500">
                      Released: {currentReference.releaseYear} • {currentReference.durationFormatted}
                    </div>
                  </div>
                </div>

                {/* Grid of Audio Specifications */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* BPM Card */}
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>TEMPO</span>
                      <Flame className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-cyan-300 flex items-baseline gap-1">
                      <span>{currentReference.bpm}</span>
                      <span className="text-xs text-zinc-400 font-normal">BPM</span>
                    </div>
                  </div>

                  {/* Key Card */}
                  <div
                    className="p-3 rounded-xl border space-y-1"
                    style={{
                      backgroundColor: `${getKeyColor(currentReference.camelotKey)}12`,
                      borderColor: `${getKeyColor(currentReference.camelotKey)}35`
                    }}
                  >
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>MUSICAL KEY</span>
                      <Compass
                        className="w-3 h-3"
                        style={{ color: getKeyColor(currentReference.camelotKey) }}
                      />
                    </div>
                    <div
                      className="text-xl font-bold font-mono flex items-baseline gap-1.5"
                      style={{ color: getKeyColor(currentReference.camelotKey) }}
                    >
                      <span>{currentReference.camelotKey}</span>
                      <span className="text-xs font-normal opacity-85">
                        ({currentReference.songKey})
                      </span>
                    </div>
                  </div>

                  {/* Genre Card */}
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                    <div className="text-[10px] font-mono text-zinc-400">GENRE</div>
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {currentReference.genre}
                    </div>
                  </div>

                  {/* Duration & Year Card */}
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                    <div className="text-[10px] font-mono text-zinc-400">DURATION & YEAR</div>
                    <div className="text-xs font-mono font-medium text-zinc-300 flex items-center gap-1.5">
                      <span>{currentReference.durationFormatted}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{currentReference.releaseYear}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                Select a song on the left to inspect
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* RECOMMENDATION AREA WITH INCREASING SLIDER (UP TO 20) */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-zinc-900/90 border border-violet-500/30 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-4">
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-semibold">
                  PLAYLIST RECOMMENDATION & RANDOMIZER
                </h3>
              </div>
            </div>

            {/* Filter Mode Selector Buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>FILTER MODES (MULTI-SELECT):</span>
                <span className="text-violet-400">
                  {activeFilters.length === 0 ? 'None selected (Broad)' : `${activeFilters.length} Active`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['BPM', 'KEY', 'Genre'] as RandomizeFilterOption[]).map((option) => {
                  const isChecked = activeFilters.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleFilter(option)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        isChecked
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-md shadow-violet-600/30'
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

            {/* Increasing Slider (Up to 20 songs) */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  RECOMMEND COUNT SLIDER:
                </span>
                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                  {recommendCount} {recommendCount === 1 ? 'Track' : 'Tracks'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={recommendCount}
                onChange={(e) => setRecommendCount(parseInt(e.target.value, 10))}
                className="w-full accent-violet-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>1 track</span>
                <span>10 tracks</span>
                <span>20 tracks (Max)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleFindClosestMatch}
                disabled={isRolling || playlist.length === 0}
                className="py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/20 cursor-pointer border border-violet-400/30"
              >
                <SlidersHorizontal className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                <span>FIND CLOSEST ({recommendCount})</span>
              </button>

              <button
                onClick={handlePureRandom}
                disabled={isRolling || playlist.length === 0}
                className="py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 hover:border-fuchsia-500 text-fuchsia-300 hover:text-white font-semibold text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-inner"
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
