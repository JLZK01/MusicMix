import React, { useState, useEffect } from 'react';
import { Disc3, ArrowRight, Radio, Activity, Music2, Sparkles, Layers, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Song } from '../types/music';

interface LandingPageProps {
  onEnter: () => void;
  activeDevicesCount: number;
  playlistCount: number;
  playlist: Song[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  activeDevicesCount,
  playlistCount,
  playlist
}) => {
  const [isFading, setIsFading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');

  // Filter playlist tracks that have valid cover art
  const songsWithCover = playlist.filter(s => Boolean(s.coverArtUrl));
  const count = songsWithCover.length;

  const handleEnterClick = () => {
    setIsFading(true);
    setTimeout(() => {
      onEnter();
    }, 450);
  };

  const scrollToAfk = () => {
    const afkElem = document.getElementById('afk-splashscreen');
    if (afkElem) {
      afkElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Smooth automatic 2-second right-to-left scroll
  useEffect(() => {
    if (count <= 1) return;

    const interval = setInterval(() => {
      setSlideDir('next');
      setIsSliding(true);

      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % count);
        setIsSliding(false);
      }, 700);
    }, 2000);

    return () => clearInterval(interval);
  }, [count]);

  const handlePrev = () => {
    if (count <= 1 || isSliding) return;
    setSlideDir('prev');
    setIsSliding(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + count) % count);
      setIsSliding(false);
    }, 700);
  };

  const handleNext = () => {
    if (count <= 1 || isSliding) return;
    setSlideDir('next');
    setIsSliding(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % count);
      setIsSliding(false);
    }, 700);
  };

  // Active indices: Prev, Current, Next, and NextNext for smooth right-to-left sliding
  const prevIdx = count > 0 ? (currentIndex - 1 + count) % count : 0;
  const currIdx = count > 0 ? currentIndex % count : 0;
  const nextIdx = count > 0 ? (currentIndex + 1) % count : 0;
  const nextNextIdx = count > 0 ? (currentIndex + 2) % count : 0;
  const prevPrevIdx = count > 0 ? (currentIndex - 2 + count) % count : 0;

  return (
    <div
      className={`min-h-screen bg-zinc-950 text-white flex flex-col justify-between relative overflow-x-hidden transition-opacity duration-500 ${
        isFading ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-[450px] h-[450px] bg-violet-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed top-10 right-10 w-[400px] h-[400px] bg-fuchsia-600/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Grid texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* ==================================================================== */}
      {/* SECTION 1: MAIN HERO VIEW */}
      {/* ==================================================================== */}
      <div className="min-h-screen flex flex-col justify-between relative z-10">
        {/* Top Header */}
        <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Disc3 className="w-5 h-5 text-cyan-400 animate-[spin_8s_linear_infinite]" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                MusicMix
              </span>
              <span className="text-[10px] font-mono ml-2 px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeDevicesCount} Computer{activeDevicesCount !== 1 ? 's' : ''} Synced</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400">
              <Radio className="w-3.5 h-3.5 text-violet-400" />
              <span>{playlistCount} Central Tracks</span>
            </div>
          </div>
        </header>

        {/* Central Hero Section */}
        <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col items-center text-center my-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-8 backdrop-blur-xl shadow-lg shadow-cyan-950/40 animate-pulse">
            <Activity className="w-3.5 h-3.5" />
            <span>REAL-TIME MULTI-COMPUTER AUDIO ARCHITECTURE</span>
          </div>

          {/* Big Title */}
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-8">
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Random
            </span>{' '}
            Music Recommendations
          </h1>

          {/* Enter Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleEnterClick}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-cyan-400/30"
            >
              <Music2 className="w-5 h-5 text-cyan-200 transition-transform group-hover:scale-110" />
              <span>ENTER THE WEBSITE</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Equalizer Wave simulation */}
          <div className="flex items-end justify-center gap-1.5 h-12 mt-12 mb-6">
            {[40, 65, 30, 85, 95, 50, 70, 45, 100, 60, 80, 35, 90, 55, 75, 40].map((height, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500/60 to-violet-500 animate-pulse"
                style={{
                  height: `${height}%`,
                  animationDelay: `${(i * 120) % 800}ms`,
                  animationDuration: `${900 + (i % 5) * 200}ms`
                }}
              />
            ))}
          </div>

          {/* Feature Grid Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-3xl text-left">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
                <Radio className="w-3.5 h-3.5" />
                <span>AUDIO INTELLIGENCE</span>
              </div>
              <p className="text-xs text-zinc-300">Live multi-source cross-checking with verified BPM, Key, Mode, and Acoustic features.</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-mono mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>CENTRAL PLAYLIST</span>
              </div>
              <p className="text-xs text-zinc-300">Multi-client live synchronized playlist across all network computers.</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-mono mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SMART RANDOMIZER</span>
              </div>
              <p className="text-xs text-zinc-300">Filter and randomize by BPM, Key harmonic compatibility, or Genre.</p>
            </div>
          </div>
        </main>

        {/* Scroll down indicator */}
        <div className="pb-8 flex flex-col items-center justify-center text-center">
          <button
            onClick={scrollToAfk}
            className="group flex flex-col items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-cyan-400 transition cursor-pointer"
          >
            <span className="tracking-widest uppercase text-[10px]">Scroll down for AFK Splashscreen</span>
            <ChevronDown className="w-4 h-4 animate-bounce group-hover:text-cyan-400" />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2: SMOOTH HORIZONTAL SCROLLING SPLASHSCREEN */}
      {/* ==================================================================== */}
      <section
        id="afk-splashscreen"
        className="min-h-screen relative z-10 flex flex-col justify-between bg-black/98 border-t border-zinc-900 px-4 sm:px-8 py-10 overflow-hidden"
      >
        {/* Top Header */}
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-white font-bold tracking-wider uppercase text-sm">
              MusicMix Visualizer Lounge
            </span>
          </div>

          <button
            onClick={handleEnterClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <span>Enter MusicMix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Smooth Sliding Carousel Track */}
        <div className="my-auto w-full max-w-7xl mx-auto py-6 overflow-hidden relative">
          {count === 0 ? (
            <div className="text-center py-24 text-zinc-600 font-mono text-sm">
              No playlist songs with album art yet.
            </div>
          ) : (
            <div className="relative w-full flex justify-center overflow-hidden py-4">
              {/* Sliding Track: Smooth continuous glide right-to-left */}
              <div
                className={`flex items-start ${
                  isSliding
                    ? 'transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]'
                    : 'transition-none'
                }`}
                style={{
                  transform: isSliding
                    ? slideDir === 'next'
                      ? 'translateX(-480px)'
                      : 'translateX(480px)'
                    : 'translateX(0px)',
                  willChange: 'transform'
                }}
              >
                {/* 5-slot sliding window: PrevPrev, Prev, Current (Center), Next, NextNext */}
                {[
                  { song: songsWithCover[prevPrevIdx], role: 'prevPrev' },
                  { song: songsWithCover[prevIdx], role: 'prev' },
                  { song: songsWithCover[currIdx], role: 'current' },
                  { song: songsWithCover[nextIdx], role: 'next' },
                  { song: songsWithCover[nextNextIdx], role: 'nextNext' }
                ].map(({ song, role }, slotIdx) => {
                  const isCurrent = role === 'current';
                  const isPrev = role === 'prev';
                  const isNext = role === 'next';
                  const isVisible = isCurrent || isPrev || isNext;

                  return (
                    <div
                      key={`${song.id}-${slotIdx}`}
                      onClick={() => {
                        if (isPrev) handlePrev();
                        if (isNext) handleNext();
                      }}
                      className={`shrink-0 w-[480px] px-4 flex flex-col items-center justify-start text-center transition-opacity duration-700 ${
                        isCurrent
                          ? 'opacity-100 z-20'
                          : isVisible
                          ? 'opacity-40 blur-[0.5px] cursor-pointer z-10'
                          : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      {/* Fixed Dimension Album Art Container (Stationary vertical top baseline) */}
                      <div className="relative group shrink-0">
                        <div
                          className={`w-72 h-72 sm:w-88 sm:h-88 md:w-[400px] md:h-[400px] rounded-3xl overflow-hidden border-2 transition-all duration-700 bg-zinc-950 relative ${
                            isCurrent
                              ? 'border-cyan-500/60 shadow-[0_0_90px_rgba(6,182,212,0.3)] scale-100'
                              : 'border-zinc-800 scale-90'
                          }`}
                        >
                          <img
                            src={song.coverArtUrl}
                            alt={song.title}
                            className="w-full h-full object-cover select-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />
                        </div>

                        {isCurrent && (
                          <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-cyan-500 text-zinc-950 font-bold text-[11px] font-mono shadow-lg shadow-cyan-500/40 uppercase tracking-wider">
                            NOW PLAYING
                          </div>
                        )}
                      </div>

                      {/* Song Title: STRICT FIXED HEIGHT (56px / h-14) with flex vertical centering & line-clamp-2 */}
                      {/* This guarantees the album art NEVER jumps vertically whether title is 1 line or 2 lines! */}
                      <div className="h-14 w-full max-w-sm flex items-center justify-center text-center mt-4 px-2">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 drop-shadow">
                          {song.title}
                        </h2>
                      </div>

                      {/* Artist: STRICT FIXED HEIGHT (24px / h-6) */}
                      <div className="h-6 w-full max-w-sm flex items-center justify-center text-center mt-1 px-2">
                        <p className="text-sm sm:text-base font-medium text-cyan-300/90 truncate max-w-full">
                          {song.artist}
                        </p>
                      </div>

                      {/* Audio Metadata Specs: STRICT FIXED HEIGHT (32px / h-8) */}
                      <div className="h-8 flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 mt-2">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                          {song.genre}
                        </span>
                        <span>•</span>
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-300 font-bold">
                          {song.bpm} BPM
                        </span>
                        <span>•</span>
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-violet-300 font-bold">
                          {song.camelotKey}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Carousel Manual Controls */}
          {count > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handlePrev}
                disabled={isSliding}
                className="p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
                title="Previous track"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
                <span className="text-cyan-400 font-bold">{currentIndex + 1}</span>
                <span>/</span>
                <span>{count}</span>
              </div>

              <button
                onClick={handleNext}
                disabled={isSliding}
                className="p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
                title="Next track"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between text-xs text-zinc-600 font-mono">
          <span>Visual Splashscreen</span>
          <span>Scroll up or click Enter to return to workstation</span>
        </div>
      </section>
    </div>
  );
};
