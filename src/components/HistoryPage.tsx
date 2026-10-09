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
  ArrowRight,
  Search,
  Edit3,
  Layers,
  Database,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { ActivityHistoryItem, ActivityCategory, RecommendationHistoryEntry, Song } from '../types/music';
import { SongCoverArt } from './SongCoverArt';
import { getKeyColor } from '../utils/harmonic';

interface HistoryPageProps {
  onSelectTrackForStudio?: (song: Song) => void;
}

type ViewCategoryMode = 'overview' | ActivityCategory;

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onSelectTrackForStudio
}) => {
  const [activities, setActivities] = useState<ActivityHistoryItem[]>([]);
  const [recHistory, setRecHistory] = useState<RecommendationHistoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<ActivityCategory, number>>({
    recommendation: 0,
    search: 0,
    editing: 0,
    mixes: 0,
    database: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ViewCategoryMode>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history/activities?limit=200');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setActivities(data.activities || []);
          setTotalCount(data.totalCount || (data.activities || []).length);
          if (data.categoryCounts) {
            setCategoryCounts(data.categoryCounts);
          }
        }
      }

      // Also fetch recommendation history for detailed harmonic sets
      const recRes = await fetch('/api/history');
      if (recRes.ok) {
        const recData = await recRes.json();
        if (recData && Array.isArray(recData.history)) {
          setRecHistory(recData.history);
        }
      }
    } catch (err) {
      console.error('Failed to load activity history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();

    const handleUpdate = () => {
      loadActivities();
    };

    window.addEventListener('musicmix:history_updated', handleUpdate);
    return () => {
      window.removeEventListener('musicmix:history_updated', handleUpdate);
    };
  }, []);

  const handleClear = async (categoryToClear?: ActivityCategory | 'all') => {
    const target = categoryToClear || (activeCategory === 'overview' ? 'all' : activeCategory);
    const label = target === 'all' ? 'all 200 history actions' : `${target} history actions`;
    if (!window.confirm(`Are you sure you want to clear ${label}?`)) return;

    try {
      const url = target === 'all' ? '/api/history/activities' : `/api/history/activities?category=${target}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Cleared ${label}!`);
        await loadActivities();
      }
    } catch (err) {
      console.error('Failed to clear activities:', err);
      showToast('Error clearing history');
    }
  };

  // Helper to format timestamps nicely (relative + absolute)
  const formatTimeAgo = (timestamp: number): string => {
    const diff = Math.max(0, Date.now() - timestamp);
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Category visual metadata
  const categoryConfig: Record<ActivityCategory, {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeClass: string;
    borderClass: string;
    bgClass: string;
  }> = {
    recommendation: {
      title: 'Recommendation History',
      description: 'Harmonic and random track recommendation runs, tonality filtering, and closest matches',
      icon: Sparkles,
      accentColor: '#8b5cf6',
      badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
      borderClass: 'border-violet-500/30 hover:border-violet-500/60',
      bgClass: 'bg-violet-950/20'
    },
    search: {
      title: 'Search History',
      description: 'Audio queries across verified catalog, popular streaming hits, and local database',
      icon: Search,
      accentColor: '#06b6d4',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      borderClass: 'border-cyan-500/30 hover:border-cyan-500/60',
      bgClass: 'bg-cyan-950/20'
    },
    editing: {
      title: 'Editing & Playlist History',
      description: 'Songs added/removed, metadata edits, and rate-limited acoustic data refreshes (15/s limit)',
      icon: Edit3,
      accentColor: '#10b981',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      borderClass: 'border-emerald-500/30 hover:border-emerald-500/60',
      bgClass: 'bg-emerald-950/20'
    },
    mixes: {
      title: 'Mixes History',
      description: 'Track pairing sessions, recorded DJ transitions, and mix library adjustments',
      icon: Layers,
      accentColor: '#f59e0b',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      borderClass: 'border-amber-500/30 hover:border-amber-500/60',
      bgClass: 'bg-amber-950/20'
    },
    database: {
      title: 'Database Pull & Vault History',
      description: 'Database vault snapshots created, backups pulled, sync restores, and storage commits',
      icon: Database,
      accentColor: '#d946ef',
      badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
      borderClass: 'border-fuchsia-500/30 hover:border-fuchsia-500/60',
      bgClass: 'bg-fuchsia-950/20'
    }
  };

  // Filter activities based on activeCategory and searchFilter
  const filteredActivities = activities.filter(item => {
    if (activeCategory !== 'overview' && item.category !== activeCategory) {
      return false;
    }
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.action.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      (item.ipAddress && item.ipAddress.toLowerCase().includes(q)) ||
      (item.song && (item.song.title.toLowerCase().includes(q) || item.song.artist.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-zinc-900 border border-cyan-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-medium text-white">{notice}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <History className="w-4 h-4" />
              <span>CENTRAL ACTIVITY AUDIT LOG • PRESERVES LAST 200 ACTIONS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Activity History Hub</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {totalCount} / 200 Saved
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Every action is recorded with precise timestamps, Tailscale / client IP addresses, and detailed parameters across Recommendations, Searches, Editing, Mixes, and Database pulls.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeCategory !== 'overview' && (
              <button
                onClick={() => setActiveCategory('overview')}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-zinc-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Categories</span>
              </button>
            )}

            <button
              onClick={loadActivities}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-zinc-700/60"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {activities.length > 0 && (
              <button
                onClick={() => handleClear()}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear {activeCategory === 'overview' ? 'All' : 'Category'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setActiveCategory('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold font-mono transition flex items-center gap-2 cursor-pointer shrink-0 border ${
            activeCategory === 'overview'
              ? 'bg-zinc-800 text-white border-cyan-500/50 shadow-md'
              : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>All History ({totalCount})</span>
        </button>

        {(['recommendation', 'search', 'editing', 'mixes', 'database'] as ActivityCategory[]).map(cat => {
          const cfg = categoryConfig[cat];
          const Icon = cfg.icon;
          const isSelected = activeCategory === cat;
          const count = categoryCounts[cat] || 0;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold font-mono transition flex items-center gap-2 cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-md'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <span style={{ color: cfg.accentColor }} className="flex items-center">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span>{cfg.title.replace(' History', '')}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${cfg.badgeClass}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* OVERVIEW DASHBOARD: 5 CATEGORY CARDS (CLICK TO EXPAND EACH)   */}
      {/* ============================================================== */}
      {activeCategory === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Category Hubs (Expandable to Dedicated Pages)
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              Click any card to expand full audit log
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(['recommendation', 'search', 'editing', 'mixes', 'database'] as ActivityCategory[]).map(cat => {
              const cfg = categoryConfig[cat];
              const Icon = cfg.icon;
              const count = categoryCounts[cat] || 0;
              const catActivities = activities.filter(a => a.category === cat);
              const latest = catActivities[0];

              return (
                <div
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-2xl p-5 border ${cfg.borderClass} ${cfg.bgClass} backdrop-blur-md transition shadow-xl cursor-pointer flex flex-col justify-between group hover:scale-[1.01]`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center border"
                          style={{
                            backgroundColor: `${cfg.accentColor}20`,
                            borderColor: `${cfg.accentColor}40`
                          }}
                        >
                          <span style={{ color: cfg.accentColor }} className="flex items-center">
                            <Icon className="w-4 h-4" />
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                          {cfg.title}
                        </h3>
                      </div>

                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                        {count} Actions
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {cfg.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-zinc-800/80 space-y-2">
                    {latest ? (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase flex items-center justify-between">
                          <span>Latest Action:</span>
                          <span className="text-zinc-400">{formatTimeAgo(latest.timestamp)}</span>
                        </div>
                        <div className="text-xs font-medium text-zinc-200 truncate">
                          {latest.summary}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-zinc-600 italic">
                        No actions recorded yet in this category
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-end text-xs font-mono font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform gap-1">
                      <span>Expand Dedicated Page</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DEDICATED EXPANDED CATEGORY HEADER                             */}
      {/* ============================================================== */}
      {activeCategory !== 'overview' && (
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                style={{
                  backgroundColor: `${categoryConfig[activeCategory].accentColor}20`,
                  borderColor: `${categoryConfig[activeCategory].accentColor}40`
                }}
              >
                <span style={{ color: categoryConfig[activeCategory].accentColor }} className="flex items-center">
                  {React.createElement(categoryConfig[activeCategory].icon, {
                    className: 'w-5 h-5'
                  })}
                </span>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {categoryConfig[activeCategory].title}
                </h2>
                <p className="text-xs text-zinc-400">
                  {categoryConfig[activeCategory].description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${categoryConfig[activeCategory].badgeClass}`}>
                {filteredActivities.length} Actions Saved
              </span>
              <button
                onClick={() => handleClear(activeCategory)}
                className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono transition cursor-pointer"
              >
                Clear Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by action, track, keyword, or IP address..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>Showing</span>
          <strong className="text-white">{filteredActivities.length}</strong>
          <span>of {activities.length} recorded actions</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ACTIVITY FEED LIST (TIMESTAMPS, IP, METRICS & EXPANDABLE)       */}
      {/* ============================================================== */}
      {filteredActivities.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-4">
          <History className="w-12 h-12 text-zinc-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No Activity Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchFilter
                ? 'No activity matches your search query. Try clearing the filter.'
                : 'Actions performed across the application will be automatically captured here with timestamps and network IP.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => {
            const cfg = categoryConfig[act.category];
            const isExpanded = expandedItemId === act.id;
            const Icon = cfg.icon;

            return (
              <div
                key={act.id}
                className="rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition overflow-hidden shadow-lg backdrop-blur-md"
              >
                {/* Main Action Row */}
                <div
                  onClick={() => setExpandedItemId(isExpanded ? null : act.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 sm:mt-0"
                      style={{
                        backgroundColor: `${cfg.accentColor}18`,
                        borderColor: `${cfg.accentColor}35`
                      }}
                    >
                      <span style={{ color: cfg.accentColor }} className="flex items-center">
                        <Icon className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${cfg.badgeClass}`}>
                          {act.category.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                          {act.action}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 truncate">
                        {act.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                    {/* Tailscale / Client IP Badge */}
                    <div
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400"
                      title="Tailscale VPN Client IP"
                    >
                      <Laptop className="w-3 h-3 text-cyan-400" />
                      <span>{act.ipAddress || '100.64.0.1 (Tailscale)'}</span>
                    </div>

                    {/* Timestamp Badges */}
                    <div className="text-right font-mono">
                      <div className="text-[11px] font-semibold text-white">
                        {formatTimeAgo(act.timestamp)}
                      </div>
                      <div className="text-[9px] text-zinc-500">
                        {act.formattedDate}
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <div className="text-zinc-500 group-hover:text-white transition">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-1 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                        <span className="text-zinc-500 block">ACTION ID</span>
                        <span className="text-zinc-200">{act.id}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                        <span className="text-zinc-500 block">EXACT TIMESTAMP</span>
                        <span className="text-cyan-300">{new Date(act.timestamp).toISOString()}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                        <span className="text-zinc-500 block">CLIENT NETWORK / IP</span>
                        <span className="text-emerald-400">{act.ipAddress || '100.64.0.1 (Tailscale)'}</span>
                      </div>
                    </div>

                    {/* Associated Song Details if available */}
                    {act.song && (
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <SongCoverArt
                            url={act.song.coverArtUrl}
                            songId={act.song.id}
                            title={act.song.title}
                            artist={act.song.artist}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{act.song.title}</div>
                            <div className="text-[11px] text-zinc-400 truncate">{act.song.artist}</div>
                          </div>
                        </div>

                        {onSelectTrackForStudio && (
                          <button
                            onClick={() => onSelectTrackForStudio(act.song!)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-violet-950 text-violet-300 hover:text-white border border-zinc-700 hover:border-violet-500 text-xs font-mono transition cursor-pointer"
                          >
                            Inspect in Studio
                          </button>
                        )}
                      </div>
                    )}

                    {/* Additional Details Payload if available */}
                    {act.details && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Parameters / Metadata:</span>
                        <pre className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                          {JSON.stringify(act.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
