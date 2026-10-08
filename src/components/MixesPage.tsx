import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Music2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Flame,
  Info,
  Calendar,
  X,
  Share2
} from 'lucide-react';
import { Song, SongMix } from '../types/music';
import { SongCoverArt } from './SongCoverArt';
import { getKeyColor, formatKeyDisplay, calculateBpmCompatibility, calculateKeyCompatibility } from '../utils/harmonic';
import { getMixesForSong } from '../utils/mixUtils';

interface MixesPageProps {
  playlist: Song[];
  mixes: SongMix[];
  onRecordMix: (songIds: string[], name?: string, notes?: string) => Promise<void>;
  onDeleteMix: (mixId: string) => Promise<void>;
  onSelectTrack?: (song: Song) => void;
}

export const MixesPage: React.FC<MixesPageProps> = ({
  playlist,
  mixes,
  onRecordMix,
  onDeleteMix,
  onSelectTrack
}) => {
  // State for playlist selection & search
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [mixSearch, setMixSearch] = useState('');
  const [customMixName, setCustomMixName] = useState('');
  const [mixNotes, setMixNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Filter playlist tracks by search term
  const filteredPlaylist = useMemo(() => {
    const q = playlistSearch.toLowerCase().trim();
    if (!q) return playlist;
    return playlist.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.camelotKey.toLowerCase().includes(q) ||
        s.bpm.toString().includes(q)
    );
  }, [playlist, playlistSearch]);

  // Filter recorded mixes by song title, artist, or mix name
  const filteredMixes = useMemo(() => {
    const q = mixSearch.toLowerCase().trim();
    if (!q) return mixes;
    return mixes.filter(m => {
      if (m.name.toLowerCase().includes(q)) return true;
      if (m.notes && m.notes.toLowerCase().includes(q)) return true;
      return m.songs.some(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q)
      );
    });
  }, [mixes, mixSearch]);

  // Selected songs ordered by selection order
  const selectedSongs = useMemo(() => {
    const map = new Map(playlist.map(s => [s.id, s]));
    return selectedSongIds.map(id => map.get(id)).filter((s): s is Song => Boolean(s));
  }, [selectedSongIds, playlist]);

  // Toggle selection of a single song
  const toggleSelectSong = (id: string) => {
    setSelectedSongIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredPlaylist.map(s => s.id);
    setSelectedSongIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearSelection = () => {
    setSelectedSongIds([]);
  };

  // Submit new mix
  const handleCreateMix = async () => {
    if (selectedSongIds.length < 2) {
      showNotice('⚠️ Please select at least 2 songs to record a mix.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecordMix(
        selectedSongIds,
        customMixName.trim() || undefined,
        mixNotes.trim() || undefined
      );
      showNotice(`🎉 Recorded mix with ${selectedSongIds.length} songs!`);
      setSelectedSongIds([]);
      setCustomMixName('');
      setMixNotes('');
    } catch (err) {
      console.error('Failed to record mix:', err);
      showNotice('❌ Failed to record mix. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle mix deletion
  const handleDeleteMix = async (mixId: string) => {
    try {
      await onDeleteMix(mixId);
      showNotice('Mix removed from tracker');
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete mix:', err);
      showNotice('❌ Failed to delete mix');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Introduction */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 border border-amber-500/30 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Mixes Studio & Tracker
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
                {mixes.length} Recorded Mix{mixes.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <p className="text-xs md:text-sm text-zinc-400 max-w-2xl">
              Track what songs have already been mixed together. Select groups of tracks from your central playlist,
              click <strong className="text-amber-300 font-medium">Add Together Into Mix</strong>, and search through past mixed combinations.
            </p>
          </div>

          {actionNotice && (
            <div className="px-3.5 py-2 rounded-xl bg-zinc-950/90 border border-amber-500/40 text-amber-300 text-xs font-medium shadow-lg flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{actionNotice}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left Playlist & Multi-Select, Right Mixes Tracker Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN (7 COLS): PLAYLIST BROWSER & GROUP SELECTION */}
        {/* ==================================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* Group Action Builder Bar */}
          <div className="rounded-2xl bg-zinc-900/95 border border-zinc-800 p-4 shadow-xl backdrop-blur-xl space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-semibold uppercase text-zinc-300">
                  Select Songs to Mix Together
                </span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
                    selectedSongIds.length >= 2
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {selectedSongIds.length} Selected
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {filteredPlaylist.length > 0 && (
                  <button
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono transition cursor-pointer"
                  >
                    Select All ({filteredPlaylist.length})
                  </button>
                )}
                {selectedSongIds.length > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Selected Songs Flow Pills */}
            {selectedSongs.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>TRANSITION SEQUENCE ({selectedSongs.length} TRACKS):</span>
                  <span className="text-amber-400 text-[10px]">Click track "×" to remove</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                  {selectedSongs.map((s, idx) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 shadow-sm"
                    >
                      <span className="text-[10px] font-mono text-amber-400 font-bold">#{idx + 1}</span>
                      <SongCoverArt url={s.coverArtUrl} songId={s.id} title={s.title} artist={s.artist} size="xs" />
                      <div className="truncate max-w-[140px]">
                        <span className="font-semibold text-white">{s.title}</span>
                        <span className="text-[10px] text-zinc-400 ml-1">({s.bpm} BPM)</span>
                      </div>
                      <button
                        onClick={() => toggleSelectSong(s.id)}
                        className="text-zinc-400 hover:text-red-400 transition cursor-pointer ml-1"
                        title="Remove from group"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-[11px] text-zinc-500 font-mono text-center">
                Select 2 or more songs below using the checkboxes to link them as a mix.
              </div>
            )}

            {/* Inputs & Add Mix Button */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  placeholder="Mix Title (Optional, e.g. Peak Time Blend)"
                  value={customMixName}
                  onChange={e => setCustomMixName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 text-xs text-white placeholder-zinc-500 outline-none transition"
                />
              </div>
              <div className="sm:col-span-6">
                <input
                  type="text"
                  placeholder="Transition notes (Optional)"
                  value={mixNotes}
                  onChange={e => setMixNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 text-xs text-white placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="sm:col-span-12">
                <button
                  onClick={handleCreateMix}
                  disabled={selectedSongIds.length < 2 || isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isSubmitting
                      ? 'Recording Mix...'
                      : `Add Selected Together Into Mix (${selectedSongIds.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Playlist Filter & List */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 shadow-xl backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-semibold uppercase text-zinc-300">
                  Playlist Songs ({playlist.length})
                </h3>
              </div>

              {/* Search Bar for Playlist */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search playlist tracks..."
                  value={playlistSearch}
                  onChange={e => setPlaylistSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500/50 text-xs text-white placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* Song Selection Table / Cards */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredPlaylist.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                  No tracks found matching "{playlistSearch}"
                </div>
              ) : (
                filteredPlaylist.map((song, idx) => {
                  const isSelected = selectedSongIds.includes(song.id);
                  const songMixes = getMixesForSong(song.id, mixes);
                  const isMixed = songMixes.length > 0;

                  return (
                    <div
                      key={song.id}
                      onClick={() => toggleSelectSong(song.id)}
                      className={`group p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer select-none ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                          : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox */}
                        <div className="shrink-0 text-amber-400">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                          )}
                        </div>

                        {/* Song Cover */}
                        <SongCoverArt
                          url={song.coverArtUrl}
                          songId={song.id}
                          title={song.title}
                          artist={song.artist}
                          size="sm"
                        />

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {song.title}
                            </span>
                            {/* Mix status badge on song */}
                            {isMixed && (
                              <span
                                onClick={e => {
                                  e.stopPropagation();
                                  setMixSearch(song.title);
                                }}
                                className="shrink-0 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium hover:bg-amber-500/25 transition cursor-pointer"
                                title={`Mixed in ${songMixes.length} mix(es). Click to filter mixes!`}
                              >
                                Mixed ({songMixes.length})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {song.artist}
                          </div>
                        </div>
                      </div>

                      {/* Right Specs (BPM, Key, Duration) */}
                      <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300 border border-zinc-800">
                          {song.bpm} BPM
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded border"
                          style={{
                            backgroundColor: `${getKeyColor(song.camelotKey)}15`,
                            borderColor: `${getKeyColor(song.camelotKey)}35`,
                            color: getKeyColor(song.camelotKey)
                          }}
                        >
                          {song.camelotKey}
                        </span>
                        <span className="text-zinc-500 hidden sm:inline">
                          {song.durationFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN (5 COLS): SIDE PANEL TO TRACK WHAT HAS ALREADY BEEN MIXED */}
        {/* ==================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                  RECORDED MIXES SIDE PANEL
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                {mixes.length} Total
              </span>
            </div>

            {/* Search Mixes Input (User Requirement: They can search the mixes by songs) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                <span>SEARCH MIXES BY SONG:</span>
                {mixSearch && (
                  <button
                    onClick={() => setMixSearch('')}
                    className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type song title, artist, or mix name..."
                  value={mixSearch}
                  onChange={e => setMixSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 text-xs text-white placeholder-zinc-500 outline-none transition"
                />
              </div>
            </div>

            {/* Mixes List Container */}
            <div className="space-y-3.5 max-h-[660px] overflow-y-auto pr-1">
              {filteredMixes.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-zinc-300">
                    {mixSearch ? 'No matching mixes found' : 'No recorded mixes yet'}
                  </div>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    {mixSearch
                      ? `Try searching for another song name or clearing the filter.`
                      : `Select 2 or more songs on the left playlist and click "Add Selected Together Into Mix" to log your first combination.`}
                  </p>
                </div>
              ) : (
                filteredMixes.map((mix, mixIdx) => (
                  <div
                    key={mix.id}
                    className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 hover:border-amber-500/40 transition space-y-3 relative group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-500 font-bold">
                            #{mixIdx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate max-w-[210px] sm:max-w-[260px]">
                            {mix.name}
                          </h4>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          <span>{mix.formattedDate}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">{mix.songs.length} tracks</span>
                        </div>
                      </div>

                      {/* Delete Mix Button */}
                      <div>
                        {confirmDeleteId === mix.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <button
                              onClick={() => handleDeleteMix(mix.id)}
                              className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] hover:text-white transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(mix.id)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition cursor-pointer"
                            title="Delete this recorded mix"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Transition Chain */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">
                        MIXED SEQUENCE:
                      </div>

                      <div className="space-y-1.5">
                        {mix.songs.map((song, sIdx) => {
                          const nextSong = mix.songs[sIdx + 1];
                          const transitionScore = nextSong
                            ? calculateKeyCompatibility(song.camelotKey, nextSong.camelotKey).score
                            : null;

                          return (
                            <React.Fragment key={`${mix.id}-${song.id}-${sIdx}`}>
                              <div
                                onClick={() => onSelectTrack && onSelectTrack(song)}
                                className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                                title="Click to view song specs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                    {sIdx + 1}.
                                  </span>
                                  <SongCoverArt
                                    url={song.coverArtUrl}
                                    songId={song.id}
                                    title={song.title}
                                    artist={song.artist}
                                    size="xs"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-white truncate max-w-[160px] sm:max-w-[200px]">
                                      {song.title}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate max-w-[160px] sm:max-w-[200px]">
                                      {song.artist}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                                  <span className="px-1.5 py-0.2 rounded bg-zinc-950 text-cyan-300 border border-zinc-800">
                                    {song.bpm}
                                  </span>
                                  <span
                                    className="px-1.5 py-0.2 rounded border"
                                    style={{
                                      backgroundColor: `${getKeyColor(song.camelotKey)}15`,
                                      borderColor: `${getKeyColor(song.camelotKey)}35`,
                                      color: getKeyColor(song.camelotKey)
                                    }}
                                  >
                                    {song.camelotKey}
                                  </span>
                                </div>
                              </div>

                              {/* Arrow Transition Indicator between tracks */}
                              {nextSong && (
                                <div className="flex items-center justify-center gap-2 py-0.5 text-[9px] font-mono text-zinc-500">
                                  <ArrowRight className="w-3 h-3 text-amber-500/70 rotate-90 sm:rotate-0" />
                                  <span>
                                    Δ {Math.abs(song.bpm - nextSong.bpm)} BPM • Key compatibility:{' '}
                                    <span className="text-amber-400">{transitionScore}%</span>
                                  </span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes if provided */}
                    {mix.notes && (
                      <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-300 italic">
                        "{mix.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
