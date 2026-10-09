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
  Laptop,
  Download,
  Upload,
  FileText
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
  const [importedData, setImportedData] = useState<{
    exportedAt?: number;
    activities?: ActivityHistoryItem[];
    recommendations?: RecommendationHistoryEntry[];
    totalActivities?: number;
    totalRecommendations?: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history/activities?limit=500');
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
    const label = target === 'all' ? 'all 500 history actions' : `${target} history actions`;
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

  const handleExportHistory = () => {
    const exportPayload = {
      exportedAt: Date.now(),
      formattedDate: new Date().toLocaleString(),
      totalActivities: activities.length,
      totalRecommendations: recHistory.length,
      activities,
      recommendations: recHistory
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musicmix_history_backup_500_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Successfully exported history backup file!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setImportedData({
          exportedAt: json.exportedAt || Date.now(),
          activities: json.activities || [],
          recommendations: json.recommendations || json.history || [],
          totalActivities: (json.activities || []).length,
          totalRecommendations: (json.recommendations || json.history || []).length
        });
        showToast('Successfully imported and parsed history file!');
      } catch (err) {
        console.error('Failed to parse imported history JSON:', err);
        showToast('Error parsing imported history JSON file');
      }
    };
    reader.readAsText(file);
  };

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
      description: 'Harmonic and random track recommendation runs, tonality filtering, and closest matches with match percentages',
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

  const filteredRecs = recHistory.filter(rec => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      rec.referenceTrack.title.toLowerCase().includes(q) ||
      rec.referenceTrack.artist.toLowerCase().includes(q) ||
      rec.mode.toLowerCase().includes(q) ||
      rec.recommendations.some(r => r.song.title.toLowerCase().includes(q) || r.song.artist.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
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
              <span>CENTRAL ACTIVITY AUDIT LOG • PRESERVES LAST 500 ACTIONS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Activity History Hub</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {totalCount} / 500 Saved
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Every action is recorded with precise timestamps, Tailscale / client IP addresses, match percentages for recommendations, and detailed parameters across all categories.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
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

            <button
              onClick={handleExportHistory}
              className="px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export History</span>
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

      {/* OVERVIEW DASHBOARD */}
      {activeCategory === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Category Hubs (Expandable to Dedicated Audit Logs)
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

      {/* DEDICATED EXPANDED CATEGORY HEADER */}
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
                {activeCategory === 'recommendation' ? recHistory.length : filteredActivities.length} Actions Saved
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
          <strong className="text-white">
            {activeCategory === 'recommendation' ? filteredRecs.length : filteredActivities.length}
          </strong>
          <span>of {activeCategory === 'recommendation' ? recHistory.length : activities.length} recorded actions</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RECOMMENDATION HISTORY DEDICATED VIEW (WITH RECOMMENDED SONGS) */}
      {/* ============================================================== */}
      {activeCategory === 'recommendation' ? (
        filteredRecs.length === 0 ? (
          <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-4">
            <Sparkles className="w-12 h-12 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No Recommendation History Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Generate harmonic or random recommendations in the studio to populate recommendation audits with match percentages and cover art.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecs.map((rec) => {
              const isExpanded = expandedItemId === rec.id;

              return (
                <div
                  key={rec.id}
                  className="rounded-2xl bg-zinc-900/90 border border-violet-500/30 hover:border-violet-500/60 transition overflow-hidden shadow-xl backdrop-blur-md"
                >
                  {/* Recommendation Entry Row */}
                  <div
                    onClick={() => setExpandedItemId(isExpanded ? null : rec.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <SongCoverArt
                        url={rec.referenceTrack.coverArtUrl}
                        songId={rec.referenceTrack.id}
                        title={rec.referenceTrack.title}
                        artist={rec.referenceTrack.artist}
                        size="md"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 uppercase">
                            {rec.mode} RUN
                          </span>
                          <span className="text-xs font-mono text-cyan-400">
                            {rec.recommendations.length} Recommended Tracks
                          </span>
                          {rec.filterOptions?.length > 0 && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                              Filters: {rec.filterOptions.join(', ')}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-violet-300 transition truncate">
                          Ref: {rec.referenceTrack.title} — <span className="text-zinc-400">{rec.referenceTrack.artist}</span>
                        </h3>
                        {/* Compact recommended songs pill list */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {rec.recommendations.map((match, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                              <span className="truncate max-w-[120px]">{match.song.title}</span>
                              <span className="text-violet-400 font-bold">{match.totalScore}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800/80">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400"
                        title="Tailscale VPN Client IP"
                      >
                        <Laptop className="w-3 h-3 text-cyan-400" />
                        <span>{rec.ipAddress || '100.64.0.1 (Tailscale)'}</span>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-xs font-semibold text-white">
                          {formatTimeAgo(rec.timestamp)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {rec.formattedDate}
                        </div>
                      </div>

                      <div className="text-zinc-500 group-hover:text-white transition">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Recommendation Drawer */}
                  {isExpanded && (
                    <div className="p-5 bg-zinc-950 border-t border-zinc-800 space-y-4 animate-in fade-in slide-in-from-top-1 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 block">RUN ID</span>
                          <span className="text-zinc-200">{rec.id}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 block">EXACT TIMESTAMP</span>
                          <span className="text-cyan-300">{new Date(rec.timestamp).toISOString()}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 block">CLIENT VPN / IP</span>
                          <span className="text-emerald-400">{rec.ipAddress || '100.64.0.1 (Tailscale)'}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-mono font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Detailed Recommended Tracks & Harmonic Match Scores</span>
                        </h4>

                        <div className="grid grid-cols-1 gap-2.5">
                          {rec.recommendations.map((match, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-violet-500/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-mono text-zinc-500 font-bold w-5 text-center">
                                  #{idx + 1}
                                </span>
                                <SongCoverArt
                                  url={match.song.coverArtUrl}
                                  songId={match.song.id}
                                  title={match.song.title}
                                  artist={match.song.artist}
                                  size="md"
                                />
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-white text-sm truncate">{match.song.title}</span>
                                    <span className="text-xs text-zinc-400 truncate">by {match.song.artist}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 border border-zinc-700">
                                      {match.song.bpm} BPM
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-violet-300 border border-zinc-700">
                                      {match.song.camelotKey || match.song.songKey}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                      {match.song.genre}
                                    </span>
                                    <span className="text-zinc-500">({match.keyCompatibility})</span>
                                  </div>
                                  {match.reasons && match.reasons.length > 0 && (
                                    <div className="text-[11px] text-emerald-400 italic">
                                      ✓ {match.reasons.join(' • ')}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                                <div className="text-right">
                                  <div className="text-base font-extrabold font-mono text-violet-400">
                                    {match.totalScore}%
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-500">
                                    Match Score
                                  </div>
                                </div>

                                {onSelectTrackForStudio && (
                                  <button
                                    onClick={() => onSelectTrackForStudio(match.song)}
                                    className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-200 border border-violet-500/40 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    <span>Inspect</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ============================================================== */
        /* STANDARD ACTIVITY FEED LIST (SEARCH, EDITING, MIXES, DATABASE)   */
        /* ============================================================== */
        filteredActivities.length === 0 ? (
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
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400"
                        title="Tailscale VPN Client IP"
                      >
                        <Laptop className="w-3 h-3 text-cyan-400" />
                        <span>{act.ipAddress || '100.64.0.1 (Tailscale)'}</span>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-[11px] font-semibold text-white">
                          {formatTimeAgo(act.timestamp)}
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          {act.formattedDate}
                        </div>
                      </div>

                      <div className="text-zinc-500 group-hover:text-white transition">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detailed Drawer with Robust Metrics & Parameters */}
                  {isExpanded && (
                    <div className="p-4 bg-zinc-950/90 border-t border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-1 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 block">ACTION ID & CATEGORY</span>
                          <span className="text-zinc-200">{act.id} ({act.category})</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 block">EXACT TIMESTAMP (UTC)</span>
                          <span className="text-cyan-300">{new Date(act.timestamp).toISOString()}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 block">CLIENT VPN / TAILSCALE IP</span>
                          <span className="text-emerald-400">{act.ipAddress || '100.64.0.1 (Tailscale)'}</span>
                        </div>
                      </div>

                      {act.song && (
                        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <SongCoverArt
                              url={act.song.coverArtUrl}
                              songId={act.song.id}
                              title={act.song.title}
                              artist={act.song.artist}
                              size="md"
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-semibold text-white text-sm truncate">{act.song.title}</div>
                              <div className="text-xs text-zinc-400 truncate">by {act.song.artist}</div>
                              <div className="text-[11px] font-mono text-zinc-500">
                                {act.song.bpm} BPM • {act.song.camelotKey || act.song.songKey} • {act.song.genre}
                              </div>
                            </div>
                          </div>

                          {onSelectTrackForStudio && (
                            <button
                              onClick={() => onSelectTrackForStudio(act.song!)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-violet-950 text-violet-300 hover:text-white border border-zinc-700 hover:border-violet-500 text-xs font-mono transition cursor-pointer flex items-center gap-1"
                            >
                              <span>Inspect in Studio</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {act.songs && act.songs.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Associated Song Batch ({act.songs.length}):</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {act.songs.map((s, i) => (
                              <div key={i} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
                                <SongCoverArt url={s.coverArtUrl} songId={s.id} title={s.title} artist={s.artist} size="sm" />
                                <div className="min-w-0">
                                  <div className="font-medium text-white truncate text-xs">{s.title}</div>
                                  <div className="text-[10px] text-zinc-400 truncate">{s.artist} • {s.bpm} BPM</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {act.details && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Detailed Parameters & Audit Payload:</span>
                          <pre className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
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
        )
      )}

      {/* ============================================================== */}
      {/* IMPORT HISTORY FILE VIEWER AT THE BOTTOM OF THE PAGE           */}
      {/* ============================================================== */}
      <div className="mt-12 pt-8 border-t border-zinc-800/80 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Import & Inspect History Backup File</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Upload a previously exported MusicMix history JSON backup file to browse, inspect, and analyze its records right here.
            </p>
          </div>

          <label className="px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer flex items-center gap-2 shrink-0">
            <FileText className="w-4 h-4" />
            <span>Select History JSON File...</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {importedData && (
          <div className="rounded-2xl bg-zinc-900 border border-cyan-500/40 p-6 space-y-6 animate-in fade-in duration-300 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Imported History Vault Analyzer</h3>
                  <p className="text-xs font-mono text-cyan-400">
                    Exported Date: {new Date(importedData.exportedAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {importedData.totalActivities || (importedData.activities || []).length} Activities
                </span>
                <span className="px-3 py-1 rounded-lg bg-zinc-800 text-violet-300 border border-zinc-700">
                  {importedData.totalRecommendations || (importedData.recommendations || []).length} Recommendation Runs
                </span>
              </div>
            </div>

            {/* Imported Recommendations Preview */}
            {importedData.recommendations && importedData.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-violet-300 uppercase">
                  Imported Recommendation History ({importedData.recommendations.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {importedData.recommendations.slice(0, 4).map((rec, i) => (
                    <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SongCoverArt url={rec.referenceTrack.coverArtUrl} songId={rec.referenceTrack.id} title={rec.referenceTrack.title} artist={rec.referenceTrack.artist} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{rec.referenceTrack.title}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{rec.recommendations.length} matches • {rec.mode}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{new Date(rec.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Imported Activities Preview */}
            {importedData.activities && importedData.activities.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase">
                  Imported Activity Feed ({importedData.activities.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                  {importedData.activities.slice(0, 10).map((act, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300">{act.category}</span>
                        <span className="font-medium text-white truncate">{act.action}: {act.summary}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">{act.formattedDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
