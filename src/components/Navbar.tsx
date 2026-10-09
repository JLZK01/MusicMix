import React from 'react';
import { Search, ListMusic, Disc3, Home, Database, Edit3, History, Layers, TrendingUp } from 'lucide-react';

export type ActiveView = 'search' | 'charts' | 'playlist' | 'editor' | 'mixes' | 'history' | 'database';

interface NavbarProps {
  currentView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  playlistCount: number;
  mixesCount?: number;
  activeClientsCount: number;
  isConnected: boolean;
  onReturnToHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  playlistCount,
  mixesCount = 0,
  activeClientsCount,
  isConnected,
  onReturnToHome
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToHome}
            className="flex items-center gap-2.5 text-left group hover:opacity-90 transition cursor-pointer"
            title="Return to Main Welcome Page"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-0.5 shadow-md shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Disc3 className="w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-700" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-tight">MusicMix</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-cyan-400 border border-zinc-700/60">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">Central Music Hub</p>
            </div>
          </button>
        </div>

        {/* View Switcher Tabs (Search, Central Playlist, Editor, History, Database Vault) */}
        <nav className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 shadow-inner overflow-x-auto">
          {/* Tab 1: Search */}
          <button
            onClick={() => onViewChange('search')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              currentView === 'search'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Search</span>
          </button>

          {/* Tab 2: Top Charts */}
          <button
            onClick={() => onViewChange('charts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              currentView === 'charts'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
            title="Streaming & social media viral music charts"
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Top Charts</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              HOT
            </span>
          </button>

          {/* Tab 3: Central Playlist */}
          <button
            onClick={() => onViewChange('playlist')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer relative shrink-0 ${
              currentView === 'playlist'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5 text-violet-400" />
            <span>Central Playlist</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                playlistCount > 0
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {playlistCount}
            </span>
          </button>

          {/* Tab 3: Editor */}
          <button
            onClick={() => onViewChange('editor')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              currentView === 'editor'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Editor</span>
          </button>

          {/* Tab 4: Mixes Tracker */}
          <button
            onClick={() => onViewChange('mixes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 relative ${
              currentView === 'mixes'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
            title="Track songs already mixed together"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Mixes</span>
            {mixesCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {mixesCount}
              </span>
            )}
          </button>

          {/* Tab 5: History */}
          <button
            onClick={() => onViewChange('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              currentView === 'history'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
            title="Recommendation history log with Tailscale IP addresses"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>History</span>
          </button>

          {/* Tab 5: Database Vault */}
          <button
            onClick={() => onViewChange('database')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              currentView === 'database'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
            title="Database export and restore"
          >
            <Database className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Database Vault</span>
          </button>
        </nav>

        {/* Right Status */}
        <div className="flex items-center gap-3">
          {/* Live Sync Status Pill */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono border backdrop-blur-md ${
              isConnected
                ? 'bg-zinc-900/90 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900/90 border-amber-500/30 text-amber-300'
            }`}
            title={isConnected ? 'Connected with live sync' : 'Reconnecting...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isConnected ? `${activeClientsCount} Device${activeClientsCount > 1 ? 's' : ''} Synced` : 'Connecting'}
            </span>
          </div>

          {/* Home icon button */}
          <button
            onClick={onReturnToHome}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
            title="Return to Welcome Screen"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
