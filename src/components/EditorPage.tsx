import React, { useState } from 'react';
import {
  Edit3,
  Plus,
  Search,
  Upload,
  CheckCircle,
  AlertCircle,
  Trash2,
  X,
  Sparkles,
  Music,
  Clock,
  Flame,
  Compass,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { Song } from '../types/music';
import { SongCoverArt } from './SongCoverArt';
import { getKeyColor, normalizeToCamelot } from '../utils/harmonic';
import { compressAlbumArt } from '../utils/imageCompress';

interface EditorPageProps {
  playlist: Song[];
  onPlaylistUpdated: (updatedPlaylist: Song[]) => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  playlist,
  onPlaylistUpdated
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('Electronic');
  const [bpm, setBpm] = useState<number>(124);
  const [songKey, setSongKey] = useState('A Minor');
  const [camelotKey, setCamelotKey] = useState('8A');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [durationFormatted, setDurationFormatted] = useState('3:30');
  const [coverArtUrl, setCoverArtUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusNotice({ text, type });
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Open form for adding new track
  const handleOpenAddForm = () => {
    setEditingTrackId(null);
    setTitle('');
    setArtist('');
    setGenre('Electronic');
    setBpm(124);
    setSongKey('A Minor');
    setCamelotKey('8A');
    setReleaseYear(new Date().getFullYear());
    setDurationFormatted('3:30');
    setCoverArtUrl('');
    setIsFormOpen(true);
  };

  // Open form for editing existing track
  const handleOpenEditForm = (track: Song) => {
    setEditingTrackId(track.id);
    setTitle(track.title);
    setArtist(track.artist);
    setGenre(track.genre || 'Electronic');
    setBpm(track.bpm || 120);
    setSongKey(track.songKey || 'A Minor');
    setCamelotKey(track.camelotKey || normalizeToCamelot(track.songKey));
    setReleaseYear(Number(track.releaseYear) || 2020);
    setDurationFormatted(track.durationFormatted || '3:30');
    setCoverArtUrl(track.coverArtUrl || '');
    setIsFormOpen(true);
  };

  // Handle image upload and compression
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressAlbumArt(file, 360, 0.82);
      setCoverArtUrl(compressedDataUrl);
      showNotice('Album art uploaded and compressed to standard size', 'success');
    } catch (err) {
      console.error('Image compression error:', err);
      showNotice('Failed to compress album art', 'error');
    } finally {
      setIsCompressing(false);
    }
  };

  // Save Track (Add or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      showNotice('Please fill in both Track Title and Artist Name', 'error');
      return;
    }

    const normCamelot = normalizeToCamelot(camelotKey || songKey);

    const payload: Partial<Song> = {
      title: title.trim(),
      artist: artist.trim(),
      genre: genre.trim() || 'Electronic',
      bpm: Number(bpm) || 120,
      songKey: songKey.trim() || 'A Minor',
      camelotKey: normCamelot,
      releaseYear: Number(releaseYear) || new Date().getFullYear(),
      durationFormatted: durationFormatted.trim() || '3:30',
      coverArtUrl: coverArtUrl.trim() || undefined
    };

    try {
      if (editingTrackId) {
        // Edit existing track
        const res = await fetch(`/api/playlist/track/${encodeURIComponent(editingTrackId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update track');
        const data = await res.json();
        if (data.playlist) {
          onPlaylistUpdated(data.playlist);
        }
        showNotice(`Updated metadata for "${payload.title}"`, 'success');
      } else {
        // Add new track
        const res = await fetch('/api/playlist/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create track');
        const data = await res.json();
        if (data.playlist) {
          onPlaylistUpdated(data.playlist);
        }
        showNotice(`Added "${payload.title}" to Central Playlist & Database`, 'success');
      }

      setIsFormOpen(false);
      setEditingTrackId(null);
    } catch (err) {
      console.error('Save error:', err);
      showNotice('Failed to save track changes', 'error');
    }
  };

  // Delete track from editor
  const handleDeleteTrack = async (id: string, trackTitle: string) => {
    if (!window.confirm(`Delete "${trackTitle}" from Central Playlist?`)) return;
    try {
      const res = await fetch(`/api/playlist/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        onPlaylistUpdated(playlist.filter(s => s.id !== id));
        showNotice(`Removed "${trackTitle}"`, 'success');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Filter tracks
  const filteredTracks = playlist.filter(s => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.songKey.toLowerCase().includes(q) ||
      s.camelotKey.toLowerCase().includes(q) ||
      String(s.bpm).includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {statusNotice && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 ${
            statusNotice.type === 'success'
              ? 'bg-zinc-900 border-cyan-500/40 text-cyan-300'
              : 'bg-zinc-900 border-rose-500/40 text-rose-300'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-cyan-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-medium">{statusNotice.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-violet-400 text-xs font-mono">
              <Edit3 className="w-4 h-4" />
              <span>PLAYLIST METADATA EDITOR & MANUAL REGISTRY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Curate, Edit & Register Music
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Edit metadata for any track in the central playlist or register music manually with compressed album art. All modifications instantly update the central database and synchronize across all connected computers in real-time.
            </p>
          </div>

          <button
            onClick={handleOpenAddForm}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Music Manually</span>
          </button>
        </div>
      </div>

      {/* Modal / Expanded Form: Add or Edit Music */}
      {isFormOpen && (
        <div className="rounded-2xl bg-zinc-900/95 border border-violet-500/40 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h3 className="text-base font-bold text-white">
                {editingTrackId ? 'Edit Track Metadata' : 'Add Music Manually to Playlist & Database'}
              </h3>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Album Art Upload / Preview */}
              <div className="md:col-span-4 space-y-4">
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  Album Cover Art
                </label>

                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-3">
                  <SongCoverArt
                    url={coverArtUrl}
                    title={title || 'New Track'}
                    size="xl"
                    className="ring-2 ring-violet-500/30"
                  />

                  <div className="w-full space-y-2">
                    <label className="block w-full cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <div className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center justify-center gap-2 border border-zinc-700">
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isCompressing ? 'Compressing...' : 'Upload Image (Auto-Compress)'}</span>
                      </div>
                    </label>

                    <div className="text-[10px] text-zinc-500">Or paste direct image URL:</div>
                    <input
                      type="text"
                      value={coverArtUrl}
                      onChange={(e) => setCoverArtUrl(e.target.value)}
                      placeholder="https://.../cover.jpg"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Audio & Track Metadata Fields */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Track Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-mono text-zinc-300">TRACK TITLE *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Around the World"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                {/* Artist Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-mono text-zinc-300">ARTIST NAME *</label>
                  <input
                    type="text"
                    required
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. Daft Punk"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                {/* Genre */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300">GENRE</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g. French House / Electronic"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* BPM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300">TEMPO (BPM)</label>
                  <input
                    type="number"
                    min="40"
                    max="220"
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                {/* Song Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300">STANDARD KEY</label>
                  <input
                    type="text"
                    value={songKey}
                    onChange={(e) => {
                      setSongKey(e.target.value);
                      setCamelotKey(normalizeToCamelot(e.target.value));
                    }}
                    placeholder="e.g. A Minor or C Major"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Camelot Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300">CAMELOT CODE</label>
                  <input
                    type="text"
                    value={camelotKey}
                    onChange={(e) => setCamelotKey(e.target.value.toUpperCase())}
                    placeholder="e.g. 8A or 8B"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300">DURATION (MM:SS)</label>
                  <input
                    type="text"
                    value={durationFormatted}
                    onChange={(e) => setDurationFormatted(e.target.value)}
                    placeholder="e.g. 4:12"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                {/* Release Year */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300">RELEASE YEAR</label>
                  <input
                    type="number"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-violet-600/30 cursor-pointer"
              >
                {editingTrackId ? 'Save Changes' : 'Add to Playlist & Database'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Playlist Search Bar & Track Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search playlist tracks, artists, genres, keys..."
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Showing {filteredTracks.length} of {playlist.length} central tracks
        </div>
      </div>

      {/* Editor Track List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          <div className="col-span-5">Track & Artist</div>
          <div className="col-span-2">Genre</div>
          <div className="col-span-1">BPM</div>
          <div className="col-span-2">Key (Camelot)</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-zinc-800/60 max-h-[700px] overflow-y-auto">
          {filteredTracks.map((track, idx) => {
            const keyColor = getKeyColor(track.camelotKey);

            return (
              <div
                key={track.id}
                className="px-5 py-3 hover:bg-zinc-900/50 transition flex flex-col sm:grid sm:grid-cols-12 gap-3 items-start sm:items-center"
              >
                {/* Album Art, Title, Artist */}
                <div className="sm:col-span-5 w-full flex items-center gap-3">
                  <span className="text-[11px] font-mono text-zinc-500 w-4 shrink-0 text-center">
                    {idx + 1}
                  </span>

                  <SongCoverArt
                    url={track.coverArtUrl}
                    songId={track.id}
                    title={track.title}
                    artist={track.artist}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">
                      {track.title}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {track.artist}
                    </div>
                  </div>
                </div>

                {/* Genre */}
                <div className="sm:col-span-2 text-xs text-zinc-300 truncate">
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    {track.genre}
                  </span>
                </div>

                {/* BPM */}
                <div className="sm:col-span-1 font-mono text-xs text-cyan-400">
                  {track.bpm} BPM
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
                    <span>{track.camelotKey}</span>
                    <span className="text-[10px] opacity-75">({track.songKey})</span>
                  </span>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="sm:col-span-2 w-full sm:w-auto flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-zinc-800/40 sm:border-t-0">
                  <button
                    onClick={() => handleOpenEditForm(track)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-violet-600/30 text-zinc-200 hover:text-violet-300 border border-zinc-700 hover:border-violet-500/40 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                    title="Edit track metadata"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTrack(track.id, track.title)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Remove track"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
