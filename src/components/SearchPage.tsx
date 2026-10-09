import React, { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Heart,
  Database,
  Radio,
  Clock,
  Calendar,
  Loader2,
  Disc,
  Info,
  History,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Song } from '../types/music';
import { getKeyColor } from '../utils/harmonic';
import { SongCoverArt } from './SongCoverArt';

interface SearchPageProps {
  onToggleLike: (song: Song) => void;
  playlist: Song[];
  databaseSongs: Song[];
  onSelectTrackForStudio?: (song: Song) => void;
}

const LOCAL_STORAGE_KEY = 'musicmix_recent_searches';

export const SearchPage: React.FC<SearchPageProps> = ({
  onToggleLike,
  playlist,
  databaseSongs,
  onSelectTrackForStudio
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchSource, setSearchSource] = useState<string>('');
  const [searchEngine, setSearchEngine] = useState<'popular' | 'reccobeats' | 'database'>('popular');
  const [activeTab, setActiveTab] = useState<'search' | 'database'>('search');
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  // Pagination state (25 songs per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);

  // Filter options state (open by default for quick filtering)
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [filterYearRange, setFilterYearRange] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterBpmRange, setFilterBpmRange] = useState<string>('all');
  const [filterKeyMode, setFilterKeyMode] = useState<string>('all');

  // Local history of the last 10 search queries
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.slice(0, 10);
      }
    } catch (e) {
      console.warn('Failed to parse recent searches from localStorage:', e);
    }
    return ['Daft Punk', 'deadmau5', 'The Weeknd'];
  });

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save recent searches:', e);
      }
      return updated;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== queryToRemove);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update recent searches:', e);
      }
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear recent searches:', e);
    }
  };

  const popularGenres = [
    'Electronic',
    'House',
    'Techno',
    'Synthwave',
    'Hip Hop',
    'Drum & Bass',
    'Pop',
    'Rock',
    'Nu-Disco',
    'Ambient'
  ];

  const suggestedQueries = [
    'Holiday',
    'Green Day',
    'Daft Punk',
    'The Weeknd',
    'deadmau5',
    'Bicep',
    'Dua Lipa',
    'Fred again..',
    'Sub Focus'
  ];

  const handleSearch = async (queryToUse?: string, pageToUse = 1, engineToUse?: 'popular' | 'reccobeats' | 'database') => {
    const q = (queryToUse !== undefined ? queryToUse : searchQuery).trim();
    if (!q) return;

    const engine = engineToUse || searchEngine;
    if (queryToUse !== undefined) {
      setSearchQuery(queryToUse);
    }

    saveRecentSearch(q);
    setCurrentPage(pageToUse);
    setIsSearching(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${pageToUse}&mode=${engine}`);
      const data = await response.json();
      if (data && Array.isArray(data.results)) {
        setSearchResults(data.results);
        setSearchSource(data.source || engine);
        setTotalResults(data.total || data.count || data.results.length);
      }
    } catch (err) {
      console.error('Search request failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery, 1);
    }
  };

  const isSongInPlaylist = (song: Song): boolean => {
    return playlist.some(
      p => p.id === song.id || (p.reccoTrackId && p.reccoTrackId === song.reccoTrackId) ||
           (p.title.toLowerCase() === song.title.toLowerCase() && p.artist.toLowerCase() === song.artist.toLowerCase())
    );
  };

  const handleLikeClick = (song: Song) => {
    const wasLiked = isSongInPlaylist(song);
    onToggleLike(song);
    setRecentNotification(
      wasLiked ? `Removed "${song.title}" from Central Playlist` : `Added "${song.title}" to Central Playlist!`
    );
    setTimeout(() => setRecentNotification(null), 2500);
  };

  // Extract unique genres and artists from current display list for dropdown options
  const baseList = activeTab === 'search' ? searchResults : databaseSongs;
  const availableGenres = Array.from(new Set(baseList.map(s => s.genre).filter(Boolean)));

  // Filter application
  const filteredSongs = baseList.filter(song => {
    // Artist filter
    if (filterArtist.trim()) {
      if (!song.artist.toLowerCase().includes(filterArtist.toLowerCase().trim())) {
        return false;
      }
    }

    // Genre filter
    if (filterGenre !== 'all') {
      if (song.genre.toLowerCase() !== filterGenre.toLowerCase()) {
        return false;
      }
    }

    // Year range filter
    if (filterYearRange !== 'all') {
      const yr = Number(song.releaseYear) || 2020;
      if (filterYearRange === '2020s' && yr < 2020) return false;
      if (filterYearRange === '2010s' && (yr < 2010 || yr > 2019)) return false;
      if (filterYearRange === '2000s' && (yr < 2000 || yr > 2009)) return false;
      if (filterYearRange === '1990s' && (yr < 1990 || yr > 1999)) return false;
      if (filterYearRange === 'pre1990' && yr >= 1990) return false;
    }

    // BPM range filter
    if (filterBpmRange !== 'all') {
      const bpm = Number(song.bpm) || 120;
      if (filterBpmRange === 'slow' && bpm >= 100) return false;
      if (filterBpmRange === 'mid' && (bpm < 100 || bpm > 128)) return false;
      if (filterBpmRange === 'fast' && bpm <= 128) return false;
    }

    // Key mode filter
    if (filterKeyMode !== 'all') {
      const cam = song.camelotKey || '';
      if (filterKeyMode === 'minor' && !cam.endsWith('A')) return false;
      if (filterKeyMode === 'major' && !cam.endsWith('B')) return false;
    }

    return true;
  });

  const isAnyFilterActive =
    filterArtist.trim() !== '' ||
    filterGenre !== 'all' ||
    filterYearRange !== 'all' ||
    filterBpmRange !== 'all' ||
    filterKeyMode !== 'all';

  const resetFilters = () => {
    setFilterArtist('');
    setFilterGenre('all');
    setFilterYearRange('all');
    setFilterBpmRange('all');
    setFilterKeyMode('all');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    handleSearch(searchQuery, newPage, searchEngine);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {recentNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-violet-500/40 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
          <span className="text-xs font-medium">{recentNotification}</span>
        </div>
      )}

      {/* Hero Search Box Header */}
      <div className="relative rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 p-6 md:p-8 shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>
                {searchEngine === 'popular'
                  ? 'TOP HITS & ACOUSTIC CATALOG'
                  : searchEngine === 'reccobeats'
                  ? 'GLOBAL AUDIO CATALOG'
                  : 'LOCAL DATABASE ARCHIVE'}
              </span>
            </div>

            {/* Engine Toggle Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
              <button
                onClick={() => {
                  setSearchEngine('popular');
                  if (searchQuery) handleSearch(searchQuery, 1, 'popular');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  searchEngine === 'popular'
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Ranks by worldwide popularity with verified acoustic features and high-resolution artwork"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Hits</span>
              </button>

              <button
                onClick={() => {
                  setSearchEngine('reccobeats');
                  if (searchQuery) handleSearch(searchQuery, 1, 'reccobeats');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  searchEngine === 'reccobeats'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Search global audio catalog with verified tempo, Camelot key, and acoustic metrics"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio Catalog</span>
              </button>

              <button
                onClick={() => {
                  setSearchEngine('database');
                  if (searchQuery) handleSearch(searchQuery, 1, 'database');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  searchEngine === 'database'
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Search offline cached songs in your local database"
              >
                <Database className="w-3.5 h-3.5 text-violet-400" />
                <span>Saved DB</span>
              </button>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore Tracks with Deep Audio Metadata
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {searchEngine === 'popular' ? (
              <span>
                <strong className="text-amber-300">Top Hits Mode:</strong> Searches top-ranked tracks worldwide with verified acoustic BPM, Camelot harmonic keys, and high-resolution artwork.
              </span>
            ) : searchEngine === 'reccobeats' ? (
              <span>
                <strong className="text-cyan-300">Audio Catalog Mode:</strong> Searches the global acoustic catalog directly with verified BPM, harmonic Camelot keys, danceability, and acoustic energy.
              </span>
            ) : (
              <span>
                <strong className="text-violet-300">Saved DB Mode:</strong> Searches only tracks already stored in your offline central server library.
              </span>
            )}
          </p>

          {/* Search Input Bar */}
          <div className="pt-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  searchEngine === 'popular'
                    ? 'Search top hits, popular tracks, or artists (e.g. Holiday, Paramore, Daft Punk, Blinding Lights)...'
                    : 'Search audio catalog (e.g. That\'s What You Get, Strobe, Daft Punk, Taylor Swift)...'
                }
                className="w-full bg-zinc-900/95 border border-zinc-700/80 focus:border-cyan-500 rounded-xl px-4 py-3.5 pl-11 pr-28 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-inner transition font-medium"
              />
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <button
                onClick={() => handleSearch(searchQuery, 1, searchEngine)}
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SearchIcon className="w-3.5 h-3.5" />}
                <span>{isSearching ? 'Searching' : 'Search'}</span>
              </button>
            </div>
          </div>

          {/* Local Search History (Last 10 Queries) */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <div className="flex items-center gap-1 text-cyan-400 font-mono text-[11px] mr-1">
                <History className="w-3.5 h-3.5" />
                <span>Recent searches:</span>
              </div>
              {recentSearches.map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    handleSearch(item, 1);
                  }}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-cyan-200 hover:text-white border border-cyan-500/25 hover:border-cyan-400 text-[11px] font-medium transition cursor-pointer shadow-sm"
                  title={`Re-search "${item}"`}
                >
                  <span>{item}</span>
                  <button
                    onClick={(e) => removeRecentSearch(e, item)}
                    className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                    title="Remove from search history"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={clearRecentSearches}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono ml-1 underline transition cursor-pointer"
                title="Clear all recent searches"
              >
                Clear
              </button>
            </div>
          )}

          {/* Quick Query Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Popular artists:</span>
            {suggestedQueries.map((item) => (
              <button
                key={item}
                onClick={() => {
                  handleSearch(item, 1);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 border border-zinc-800/80 text-[11px] transition cursor-pointer font-medium"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Quick Genre Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Genres:</span>
            {popularGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => {
                  handleSearch(genre, 1);
                }}
                className="px-2 py-0.5 rounded-md bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-violet-300 border border-zinc-800 text-[11px] transition cursor-pointer"
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs and Metadata Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'search'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Search Results ({searchResults.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'database'
                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Saved Database Archive ({databaseSongs.length})</span>
          </button>

          {/* Toggle Filter Panel Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              isAnyFilterActive || showFilters
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
            title="Filter search results by artist, year, genre, BPM, key"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter Results</span>
            {isAnyFilterActive && (
              <span className="w-2 h-2 rounded-full bg-violet-400" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
          {searchSource && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${searchSource === 'popular_hits' || searchSource === 'charts' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
              <span>
                Source: {
                  searchSource === 'popular_hits' || searchSource === 'top_hits' || searchSource === 'charts'
                    ? 'Top Hits (Audio Intelligence)'
                    : searchSource === 'reccobeats' || searchSource === 'catalog'
                    ? 'Global Audio Engine'
                    : searchSource === 'music_fallback'
                    ? 'Audio Intelligence Engine'
                    : 'Local DB Storage'
                }
              </span>
            </span>
          )}
          <span className="text-zinc-400">
            {filteredSongs.length} tracks • Page {currentPage}
          </span>

          {activeTab === 'search' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isSearching}
                className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-[11px] font-mono border border-zinc-800 transition cursor-pointer flex items-center gap-1"
                title="Previous 25 songs"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={searchResults.length < 25 || isSearching}
                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 text-cyan-300 text-[11px] font-mono border border-cyan-500/30 transition cursor-pointer flex items-center gap-1 font-bold"
                title="Next 25 songs"
              >
                <span>Next</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Result Filters Panel */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300 border-b border-zinc-800 pb-2">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter Results by Metadata
            </span>
            {isAnyFilterActive && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* Filter by Artist */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Artist</label>
              <input
                type="text"
                value={filterArtist}
                onChange={(e) => setFilterArtist(e.target.value)}
                placeholder="Filter artist..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>

            {/* Filter by Year Range */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Release Era / Year</label>
              <select
                value={filterYearRange}
                onChange={(e) => setFilterYearRange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">All Years</option>
                <option value="2020s">2020 & Newer</option>
                <option value="2010s">2010 - 2019</option>
                <option value="2000s">2000 - 2009</option>
                <option value="1990s">1990 - 1999</option>
                <option value="pre1990">Before 1990</option>
              </select>
            </div>

            {/* Filter by Genre */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Genre</label>
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">All Genres</option>
                {availableGenres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Filter by BPM */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">BPM (Tempo)</label>
              <select
                value={filterBpmRange}
                onChange={(e) => setFilterBpmRange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">All Tempos</option>
                <option value="slow">Slow (&lt; 100 BPM)</option>
                <option value="mid">Mid (100 - 128 BPM)</option>
                <option value="fast">Fast (&gt; 128 BPM)</option>
              </select>
            </div>

            {/* Filter by Key Mode */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Harmonic Mode</label>
              <select
                value={filterKeyMode}
                onChange={(e) => setFilterKeyMode(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">All Musical Keys</option>
                <option value="minor">Minor Keys (A)</option>
                <option value="major">Major Keys (B)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Songs Table / Cards */}
      {isSearching ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-zinc-300 font-medium">Analyzing acoustic metadata & harmonic keys...</p>
          <p className="text-xs text-zinc-500">Analyzing acoustic metadata, verified BPM, Camelot keys, and release details</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="py-16 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
          <Disc className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="text-sm text-zinc-300">
            {isAnyFilterActive ? 'No tracks matched your active filters.' : 'No tracks found matching your query.'}
          </p>
          <p className="text-xs text-zinc-500">
            {isAnyFilterActive ? (
              <button onClick={resetFilters} className="text-cyan-400 underline cursor-pointer">
                Reset filters to view all results
              </button>
            ) : (
              'Try searching for an artist name, song title, or genre tag above.'
            )}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden shadow-xl backdrop-blur-md">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 border-b border-zinc-800 bg-zinc-900/70 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            <div className="col-span-4 flex items-center gap-2">Album Art & Track Info</div>
            <div className="col-span-2">Genre</div>
            <div className="col-span-1">Duration</div>
            <div className="col-span-1">BPM</div>
            <div className="col-span-2">Key (Camelot)</div>
            <div className="col-span-1">Year</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-800/60">
            {filteredSongs.map((song, idx) => {
              const inPlaylist = isSongInPlaylist(song);
              const keyColor = getKeyColor(song.camelotKey);

              return (
                <div
                  key={song.id || `${song.title}-${idx}`}
                  className="group px-4 lg:px-5 py-3 hover:bg-zinc-900/50 transition flex flex-col lg:grid lg:grid-cols-12 gap-3 items-start lg:items-center"
                >
                  {/* Album Cover Art (with offline retry) & Track Info */}
                  <div className="lg:col-span-4 w-full flex items-center gap-3">
                    <SongCoverArt
                      url={song.coverArtUrl}
                      songId={song.id}
                      title={song.title}
                      artist={song.artist}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition">
                          {song.title}
                        </span>
                        {inPlaylist && (
                          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40">
                            IN PLAYLIST
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{song.artist}</div>
                    </div>
                  </div>

                  {/* Genre */}
                  <div className="lg:col-span-2 flex items-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 truncate">
                      {song.genre}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="lg:col-span-1 text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-500 lg:hidden" />
                    <span>{song.durationFormatted}</span>
                  </div>

                  {/* BPM */}
                  <div className="lg:col-span-1">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-semibold bg-cyan-950/40 text-cyan-400 border border-cyan-500/20">
                      <span>{song.bpm}</span>
                      <span className="text-[10px] text-cyan-500 font-normal">BPM</span>
                    </div>
                  </div>

                  {/* Musical Key */}
                  <div className="lg:col-span-2">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border"
                      style={{
                        backgroundColor: `${keyColor}18`,
                        borderColor: `${keyColor}40`,
                        color: keyColor
                      }}
                    >
                      <span className="font-bold">{song.camelotKey}</span>
                      <span className="text-[11px] opacity-80">({song.songKey})</span>
                    </div>
                  </div>

                  {/* Year */}
                  <div className="lg:col-span-1 text-xs text-zinc-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-500 lg:hidden" />
                    <span>{song.releaseYear}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="lg:col-span-1 w-full lg:w-auto flex items-center justify-end gap-2 pt-2 lg:pt-0 border-t border-zinc-800/40 lg:border-t-0">
                    {onSelectTrackForStudio && (
                      <button
                        onClick={() => onSelectTrackForStudio(song)}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer hidden sm:block"
                        title="Inspect in Studio / Right Sidebar"
                      >
                        Inspect
                      </button>
                    )}

                    <button
                      onClick={() => handleLikeClick(song)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        inPlaylist
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-300 border-zinc-800'
                      }`}
                      title={inPlaylist ? 'Remove from Central Playlist' : 'Add to Central Playlist'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          inPlaylist ? 'text-rose-400 fill-rose-400' : 'text-zinc-400'
                        }`}
                      />
                      <span className="hidden sm:inline">{inPlaylist ? 'Liked' : 'Like'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Controls (After 25 Songs) */}
      {activeTab === 'search' && searchResults.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-xs text-zinc-400 font-mono">
            Showing Page <strong>{currentPage}</strong> • 25 songs per page
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isSearching}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Page</span>
            </button>

            <span className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-cyan-400">
              {currentPage}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={searchResults.length < 25 || isSearching}
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <span>Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Database storage explanation footer */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-start gap-3 text-xs text-zinc-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-300 font-medium">Automatic Offline Caching & Cover Retry:</strong> Every song in your database caches its album art offline on your Linux server disk (<code className="text-cyan-300 font-mono">data/covers/</code>). Songs missing album art will automatically try again when displayed to find and persist their artwork even in offline environments.
        </p>
      </div>
    </div>
  );
};
