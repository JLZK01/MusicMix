import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Flame,
  Plus,
  Check,
  Disc3,
  ExternalLink,
  Search,
  ArrowLeft,
  Music2,
  SlidersHorizontal,
  Share2
} from 'lucide-react';
import { Song, ChartTrack, ServiceChart, TopChartsData, ChartServiceId } from '../types/music';
import { SongCoverArt } from './SongCoverArt';
import { getKeyColor } from '../utils/harmonic';

interface TopChartsPageProps {
  playlist: Song[];
  onToggleLike?: (song: Song) => void;
  onAddToPlaylist?: (song: Song) => void;
  onSelectTrackForStudio?: (song: Song) => void;
}

export const TopChartsPage: React.FC<TopChartsPageProps> = ({
  playlist,
  onToggleLike,
  onAddToPlaylist,
  onSelectTrackForStudio
}) => {
  const [chartsData, setChartsData] = useState<TopChartsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<ChartServiceId | 'overview'>('overview');
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshingServiceId, setRefreshingServiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  // Fetch charts data from API
  const fetchCharts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/charts');
      if (res.ok) {
        const data = await res.json();
        if (data && data.charts) {
          setChartsData(data.charts);
        }
      }
    } catch (err) {
      console.error('Failed to load top charts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCharts();

    // Listen to real-time charts updates broadcasted by server
    const handleChartsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.charts) {
        setChartsData(detail.charts);
      }
    };

    window.addEventListener('musicmix:charts_updated', handleChartsUpdate);
    return () => {
      window.removeEventListener('musicmix:charts_updated', handleChartsUpdate);
    };
  }, []);

  // Refresh All services
  const handleRefreshAll = async () => {
    if (isRefreshingAll) return;
    setIsRefreshingAll(true);
    try {
      const res = await fetch('/api/charts/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        if (data.charts) {
          setChartsData(data.charts);
        }
        showToast(`Refreshed all streaming & viral charts! Timestamp: ${data.timestampFormatted || new Date().toLocaleTimeString()}`);
      } else {
        showToast('Failed to refresh all charts');
      }
    } catch (err) {
      console.error('Error refreshing all charts:', err);
      showToast('Network error during charts refresh');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Refresh Single Service
  const handleRefreshSingleService = async (sId: ChartServiceId) => {
    if (refreshingServiceId === sId || isRefreshingAll) return;
    setRefreshingServiceId(sId);
    try {
      const res = await fetch('/api/charts/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: sId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.charts) {
          setChartsData(data.charts);
        }
        const sName = data.charts?.services[sId]?.serviceName || sId;
        const time = data.charts?.services[sId]?.formattedLastRefreshed || new Date().toLocaleTimeString();
        showToast(`Refreshed ${sName}! Updated at: ${time}`);
      } else {
        showToast(`Failed to refresh ${sId} chart`);
      }
    } catch (err) {
      console.error(`Error refreshing chart for ${sId}:`, err);
      showToast(`Error refreshing ${sId}`);
    } finally {
      setRefreshingServiceId(null);
    }
  };

  // Add a chart track to central playlist
  const handleAddTrack = async (chartTrack: ChartTrack) => {
    const songToAdd = chartTrack.song;
    setAddedTrackIds(prev => new Set(prev).add(songToAdd.id));

    if (onAddToPlaylist) {
      onAddToPlaylist(songToAdd);
    } else {
      try {
        await fetch('/api/playlist/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(songToAdd)
        });
      } catch (err) {
        console.warn('Could not add track to playlist:', err);
      }
    }

    showToast(`Added "${songToAdd.title}" by ${songToAdd.artist} to Central Playlist!`);
  };

  const isTrackInPlaylist = (songId: string) => {
    return playlist.some(p => p.id === songId) || addedTrackIds.has(songId);
  };

  const renderRankChange = (track: ChartTrack) => {
    switch (track.change) {
      case 'up':
        return (
          <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <ArrowUp className="w-2.5 h-2.5" />
            <span>+{track.changeAmount || 1}</span>
          </span>
        );
      case 'down':
        return (
          <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
            <ArrowDown className="w-2.5 h-2.5" />
            <span>-{track.changeAmount || 1}</span>
          </span>
        );
      case 'new':
        return (
          <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
            NEW
          </span>
        );
      case 'same':
      default:
        return (
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
            <Minus className="w-2.5 h-2.5 inline" />
          </span>
        );
    }
  };

  const servicesList: { id: ChartServiceId; name: string; type: 'streaming' | 'social' | 'discovery'; icon: string }[] = [
    { id: 'spotify', name: 'Spotify Top 50', type: 'streaming', icon: '🎧' },
    { id: 'apple', name: 'Apple Music Top 100', type: 'streaming', icon: '🍎' },
    { id: 'billboard', name: 'Billboard Hot 100', type: 'streaming', icon: '🏆' },
    { id: 'tiktok', name: 'TikTok Viral Trends', type: 'social', icon: '📱' },
    { id: 'youtube', name: 'YouTube Trending', type: 'social', icon: '▶️' },
    { id: 'shazam', name: 'Shazam Discoveries', type: 'discovery', icon: '⚡' }
  ];

  if (isLoading && !chartsData) {
    return (
      <div className="py-24 text-center space-y-4">
        <Disc3 className="w-12 h-12 text-cyan-400 mx-auto animate-spin" />
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Aggregating Top Music Charts...</h3>
          <p className="text-xs text-zinc-400">Pulling live streaming hits, Billboard Hot 100, and TikTok viral audio</p>
        </div>
      </div>
    );
  }

  const services = chartsData?.services;
  const currentSubService = selectedServiceId !== 'overview' && services ? services[selectedServiceId] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {noticeMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-zinc-900 border border-cyan-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-medium text-white">{noticeMessage}</span>
        </div>
      )}

      {/* Main Header / Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <TrendingUp className="w-4 h-4" />
              <span>MULTI-PLATFORM STREAMING & SOCIAL AUDIO INTELLIGENCE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Top Charts & Trending Hits</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                LIVE
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Consolidated real-time music rankings across leading music streaming giants (Spotify, Apple Music, Billboard) and social media viral trends (TikTok, YouTube, Shazam).
            </p>
            {chartsData?.formattedLastRefreshedAll && (
              <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Last Refreshed All:</span>
                <span className="text-cyan-300 font-semibold">{chartsData.formattedLastRefreshedAll}</span>
              </div>
            )}
          </div>

          {/* Action Toolbar on Hero */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {selectedServiceId !== 'overview' && (
              <button
                onClick={() => setSelectedServiceId('overview')}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-zinc-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Charts Overview</span>
              </button>
            )}

            {/* Refresh All Button */}
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAll ? 'Refreshing All Services...' : 'Refresh All Charts'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Service Selection Tabs / Sub-Page Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedServiceId('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold font-mono transition flex items-center gap-2 cursor-pointer shrink-0 border ${
            selectedServiceId === 'overview'
              ? 'bg-zinc-800 text-white border-cyan-500/50 shadow-md'
              : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>All Platforms Overview</span>
        </button>

        {servicesList.map(s => {
          const isSelected = selectedServiceId === s.id;
          const serviceData = services ? services[s.id] : null;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedServiceId(s.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold font-mono transition flex items-center gap-2 cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-md'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.name}</span>
              {serviceData && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  {serviceData.tracks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* VIEW MODE 1: MAIN OVERVIEW PAGE (ALL SERVICES)                  */}
      {/* ============================================================== */}
      {selectedServiceId === 'overview' && services && (
        <div className="space-y-8">
          {/* Global Hot Tracks Consensus Banner */}
          {chartsData?.globalHotTracks && chartsData.globalHotTracks.length > 0 && (
            <div className="rounded-2xl bg-zinc-900/70 border border-amber-500/30 p-5 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Cross-Platform Consensus Hits
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Tracks dominating charts simultaneously across streaming giants and viral social networks
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  TRENDING EVERYWHERE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chartsData.globalHotTracks.slice(0, 6).map((hot, idx) => {
                  const keyColor = getKeyColor(hot.song.camelotKey);
                  const inPlaylist = isTrackInPlaylist(hot.song.id);

                  return (
                    <div
                      key={`hot-${hot.id}-${idx}`}
                      className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-amber-500/40 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold text-amber-400 w-5 shrink-0 text-center">
                          #{idx + 1}
                        </span>

                        <SongCoverArt
                          url={hot.song.coverArtUrl}
                          songId={hot.song.id}
                          title={hot.song.title}
                          artist={hot.song.artist}
                          size="md"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate group-hover:text-amber-200 transition">
                            {hot.song.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {hot.song.artist}
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded border"
                              style={{
                                backgroundColor: `${keyColor}15`,
                                borderColor: `${keyColor}40`,
                                color: keyColor
                              }}
                            >
                              {hot.song.camelotKey} • {hot.song.bpm} BPM
                            </span>
                            {hot.streamsOrViews && (
                              <span className="text-[9px] font-mono text-zinc-500 truncate">
                                {hot.streamsOrViews}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddTrack(hot)}
                        disabled={inPlaylist}
                        className={`p-2 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                          inPlaylist
                            ? 'bg-zinc-800 text-zinc-500 cursor-default'
                            : 'bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 border border-zinc-800'
                        }`}
                        title={inPlaylist ? 'Already in Central Playlist' : 'Add to Central Playlist'}
                      >
                        {inPlaylist ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid of All 6 Platforms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Platform Charts Overview</h2>
                <p className="text-xs text-zinc-400">Click any service to view the complete interactive sub-page</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Object.keys(services) as ChartServiceId[]).map(sId => {
                const service = services[sId];
                if (!service) return null;
                const isRefreshingThis = refreshingServiceId === sId;

                return (
                  <div
                    key={sId}
                    className="rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition shadow-xl overflow-hidden flex flex-col justify-between"
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: service.accentColor }} />
                          <h3 className="text-xs font-bold font-mono text-white tracking-wide uppercase">
                            {service.serviceName}
                          </h3>
                        </div>

                        {/* Individual Service Refresh Button */}
                        <button
                          onClick={() => handleRefreshSingleService(sId)}
                          disabled={isRefreshingThis || isRefreshingAll}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
                          title={`Refresh ${service.serviceName}`}
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshingThis ? 'animate-spin text-cyan-400' : ''}`} />
                        </button>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-1">{service.tagline}</p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>Updated: {service.formattedLastRefreshed || 'Just now'}</span>
                        </span>
                        <span className="text-zinc-400">{service.tracks.length} tracks</span>
                      </div>
                    </div>

                    {/* Top 4 Track Previews */}
                    <div className="p-3 divide-y divide-zinc-800/50 flex-1">
                      {service.tracks.slice(0, 4).map((t) => {
                        const inPlaylist = isTrackInPlaylist(t.song.id);
                        return (
                          <div
                            key={t.id}
                            className="py-2 flex items-center justify-between gap-2.5 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[11px] font-mono font-bold text-zinc-400 w-4 text-center shrink-0">
                                {t.rank}
                              </span>

                              <SongCoverArt
                                url={t.song.coverArtUrl}
                                songId={t.song.id}
                                title={t.song.title}
                                artist={t.song.artist}
                                size="sm"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition">
                                  {t.song.title}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {t.song.artist}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {renderRankChange(t)}
                              <button
                                onClick={() => handleAddTrack(t)}
                                disabled={inPlaylist}
                                className={`p-1 rounded text-xs transition cursor-pointer ${
                                  inPlaylist
                                    ? 'text-emerald-400 bg-emerald-500/10'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                                title={inPlaylist ? 'In Playlist' : 'Add to Playlist'}
                              >
                                {inPlaylist ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Footer: Explore Sub-Page Button */}
                    <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/40">
                      <button
                        onClick={() => setSelectedServiceId(sId)}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 hover:text-white text-zinc-200 text-xs font-medium font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>View Full {service.serviceName} ({service.tracks.length})</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW MODE 2: DEDICATED SUB-PAGE FOR A SPECIFIC SERVICE         */}
      {/* ============================================================== */}
      {selectedServiceId !== 'overview' && currentSubService && (
        <div className="space-y-6">
          {/* Sub-Page Top Header Bar */}
          <div
            className="rounded-2xl p-6 border shadow-2xl backdrop-blur-xl relative overflow-hidden"
            style={{
              backgroundColor: '#121216',
              borderColor: `${currentSubService.accentColor}40`
            }}
          >
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ backgroundColor: currentSubService.accentColor }}
            />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentSubService.accentColor }}
                  />
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {currentSubService.serviceName}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300">{currentSubService.tagline}</p>
                <div className="flex items-center gap-3 pt-1 text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Last Refreshed:</span>
                    <strong className="text-white">
                      {currentSubService.formattedLastRefreshed || 'Just now'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>{currentSubService.tracks.length} Ranked Tracks</span>
                </div>
              </div>

              {/* Sub-page Specific Refresh Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRefreshSingleService(currentSubService.serviceId)}
                  disabled={refreshingServiceId === currentSubService.serviceId}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs font-mono transition flex items-center gap-2 border border-zinc-700 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      refreshingServiceId === currentSubService.serviceId ? 'animate-spin text-cyan-400' : ''
                    }`}
                  />
                  <span>
                    {refreshingServiceId === currentSubService.serviceId
                      ? 'Refreshing...'
                      : `Refresh ${currentSubService.serviceName}`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Page Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter tracks within ${currentSubService.serviceName}...`}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <span>Showing</span>
              <strong className="text-white">
                {
                  currentSubService.tracks.filter(t =>
                    !searchQuery ||
                    t.song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.song.genre.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length
                }
              </strong>
              <span>of {currentSubService.tracks.length} tracks</span>
            </div>
          </div>

          {/* Sub-Page Tracks Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/70 text-[11px] font-mono uppercase tracking-wider text-zinc-400 select-none">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-4">Track & Artist</div>
              <div className="col-span-2">Chart Metric & Trend</div>
              <div className="col-span-2">Musical Key</div>
              <div className="col-span-1">BPM</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-zinc-800/60">
              {currentSubService.tracks
                .filter(t =>
                  !searchQuery ||
                  t.song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.song.genre.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((track) => {
                  const keyColor = getKeyColor(track.song.camelotKey);
                  const inPlaylist = isTrackInPlaylist(track.song.id);

                  return (
                    <div
                      key={track.id}
                      className="px-4 py-3.5 hover:bg-zinc-900/50 transition flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start sm:items-center relative group"
                    >
                      {/* Rank & Movement */}
                      <div className="sm:col-span-1 flex items-center justify-start sm:justify-center gap-1.5 w-full sm:w-auto">
                        <span className="font-mono text-sm font-bold text-white w-6 text-center">
                          #{track.rank}
                        </span>
                        {renderRankChange(track)}
                      </div>

                      {/* Cover & Title */}
                      <div className="sm:col-span-4 w-full flex items-center gap-3">
                        <SongCoverArt
                          url={track.song.coverArtUrl}
                          songId={track.song.id}
                          title={track.song.title}
                          artist={track.song.artist}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition">
                            {track.song.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {track.song.artist}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 truncate">
                            {track.song.genre} • {track.song.durationFormatted}
                          </div>
                        </div>
                      </div>

                      {/* Chart Metric & Reason */}
                      <div className="sm:col-span-2 space-y-1">
                        {track.streamsOrViews && (
                          <div className="text-[11px] font-mono font-semibold text-cyan-300">
                            {track.streamsOrViews}
                          </div>
                        )}
                        {track.trendReason && (
                          <div className="text-[10px] text-zinc-400 line-clamp-1 italic">
                            "{track.trendReason}"
                          </div>
                        )}
                        {track.peakRank && (
                          <div className="text-[9px] font-mono text-zinc-500">
                            Peak #{track.peakRank} • {track.weeksOnChart || 1} wks
                          </div>
                        )}
                      </div>

                      {/* Musical Key */}
                      <div className="sm:col-span-2">
                        <span
                          className="font-mono text-xs font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${keyColor}18`,
                            borderColor: `${keyColor}40`,
                            color: keyColor
                          }}
                        >
                          <span>{track.song.camelotKey}</span>
                          <span className="text-[10px] opacity-75">({track.song.songKey})</span>
                        </span>
                      </div>

                      {/* BPM */}
                      <div className="sm:col-span-1">
                        <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          {track.song.bpm}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="sm:col-span-2 flex items-center justify-end gap-1.5 w-full sm:w-auto pt-2 sm:pt-0">
                        {onSelectTrackForStudio && (
                          <button
                            onClick={() => onSelectTrackForStudio(track.song)}
                            className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-violet-950/70 text-violet-300 hover:text-white border border-zinc-800 hover:border-violet-500/40 text-[11px] font-mono transition cursor-pointer"
                            title="Inspect in Harmonic Randomizer"
                          >
                            Mix
                          </button>
                        )}

                        <button
                          onClick={() => handleAddTrack(track)}
                          disabled={inPlaylist}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition cursor-pointer flex items-center gap-1 ${
                            inPlaylist
                              ? 'bg-zinc-800 text-zinc-500 cursor-default border border-zinc-700/50'
                              : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-zinc-950 border border-cyan-500/40'
                          }`}
                        >
                          {inPlaylist ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>In Playlist</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
