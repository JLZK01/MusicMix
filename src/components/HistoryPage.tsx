import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  Trash2,
  Network,
  Clock,
  Sparkles,
  Shuffle,
  SlidersHorizontal,
  Loader2,
  Disc3,
  ArrowRight
} from 'lucide-react';
import { RecommendationHistoryEntry, Song } from '../types/music';
import { SongCoverArt } from './SongCoverArt';
import { getKeyColor } from '../utils/harmonic';

interface HistoryPageProps {
  onSelectTrackForStudio?: (song: Song) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onSelectTrackForStudio
}) => {
  const [history, setHistory] = useState<RecommendationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all recommendation history?')) return;
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const filteredHistory = history.filter(item => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.ipAddress.toLowerCase().includes(q) ||
      item.referenceTrack.title.toLowerCase().includes(q) ||
      item.referenceTrack.artist.toLowerCase().includes(q) ||
      item.recommendations.some(r => r.song.title.toLowerCase().includes(q) || r.song.artist.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <History className="w-4 h-4" />
              <span>TAILSCALE & CLIENT RECOMMENDATION AUDIT LOG</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Recommendation History (Last 100 Sets)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Every set of random and harmonic recommendations is captured with the active reference track, resulting recommendations, timestamp, and Tailscale / network IP address.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadHistory}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by IP address, song title, or artist..."
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
          />
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Showing {filteredHistory.length} of {history.length} logged recommendation sets
        </div>
      </div>

      {/* History List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-zinc-400 font-mono">Loading recommendation history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="py-16 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
          <Disc3 className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Recommendation History Recorded Yet</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            When someone rolls a recommendation on the Central Playlist, the reference track, recommendations, and Tailscale IP address will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item, idx) => (
            <div
              key={item.id || idx}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-xl backdrop-blur-md space-y-4 hover:border-zinc-700 transition"
            >
              {/* Header: IP Address, Mode, Timestamp */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 text-cyan-300 font-bold">
                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                    <span>IP: {item.ipAddress}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {item.mode === 'random' ? (
                      <span className="flex items-center gap-1 text-fuchsia-300">
                        <Shuffle className="w-3 h-3" />
                        <span>Pure Random</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-violet-300">
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Filtered ({item.filterOptions.join(', ') || 'Harmonic'})</span>
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-zinc-500 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  <span>{item.formattedDate}</span>
                </div>
              </div>

              {/* Reference Track Card */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SongCoverArt
                    url={item.referenceTrack.coverArtUrl}
                    songId={item.referenceTrack.id}
                    title={item.referenceTrack.title}
                    artist={item.referenceTrack.artist}
                    size="md"
                  />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      REFERENCE TRACK
                    </div>
                    <div className="text-sm font-bold text-white">
                      {item.referenceTrack.title}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {item.referenceTrack.artist}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-zinc-950 text-cyan-300 border border-zinc-800">
                    {item.referenceTrack.bpm} BPM
                  </span>
                  <span
                    className="px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${getKeyColor(item.referenceTrack.camelotKey)}15`,
                      borderColor: `${getKeyColor(item.referenceTrack.camelotKey)}35`,
                      color: getKeyColor(item.referenceTrack.camelotKey)
                    }}
                  >
                    {item.referenceTrack.camelotKey}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                    {item.referenceTrack.genre}
                  </span>
                </div>
              </div>

              {/* Recommended Tracks List */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-mono text-zinc-400">
                  RECOMMENDED RESULTS ({item.recommendations.length} TRACKS):
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {item.recommendations.map((rec, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SongCoverArt
                          url={rec.song.coverArtUrl}
                          songId={rec.song.id}
                          title={rec.song.title}
                          artist={rec.song.artist}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">
                            {rec.song.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {rec.song.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300 border border-zinc-800">
                          {rec.song.bpm} BPM
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold">
                          {rec.totalScore}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
