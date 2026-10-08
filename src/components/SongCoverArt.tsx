import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface SongCoverArtProps {
  url?: string;
  songId?: string;
  title: string;
  artist?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const SongCoverArt: React.FC<SongCoverArtProps> = ({
  url,
  songId,
  title,
  artist,
  size = 'md',
  className = ''
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(url);
  const [hasError, setHasError] = useState(false);
  const [hasRetriedServer, setHasRetriedServer] = useState(false);

  useEffect(() => {
    setCurrentSrc(url);
    setHasError(false);
    setHasRetriedServer(false);
  }, [url]);

  const sizeClasses = {
    xs: 'w-6 h-6 rounded text-[10px]',
    sm: 'w-8 h-8 rounded-md text-xs',
    md: 'w-10 h-10 rounded-lg text-sm',
    lg: 'w-16 h-16 rounded-xl text-base',
    xl: 'w-36 h-36 rounded-2xl text-xl'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-7 h-7',
    xl: 'w-12 h-12'
  };

  // "Make it so that songs in the database without album art will try again if it needs to be displayed."
  useEffect(() => {
    if (!currentSrc && !hasRetriedServer) {
      const targetId = songId || title;
      if (targetId) {
        setHasRetriedServer(true);
        const queryParams = new URLSearchParams();
        if (title) queryParams.set('title', title);
        if (artist) queryParams.set('artist', artist);
        setCurrentSrc(`/api/covers/${encodeURIComponent(targetId)}?${queryParams.toString()}`);
      }
    }
  }, [currentSrc, songId, title, artist, hasRetriedServer]);

  const handleError = () => {
    // If initial image load fails, try server cover endpoint with search parameters once
    if (!hasRetriedServer) {
      setHasRetriedServer(true);
      const targetId = songId || title;
      const queryParams = new URLSearchParams();
      if (title) queryParams.set('title', title);
      if (artist) queryParams.set('artist', artist);
      setCurrentSrc(`/api/covers/${encodeURIComponent(targetId)}?${queryParams.toString()}`);
    } else {
      setHasError(true);
    }
  };

  if (!currentSrc || hasError) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 text-cyan-400 shadow-inner select-none ${className}`}
        title={`${title} (Cover Placeholder)`}
      >
        <Music className={`${iconSizes[size]} text-zinc-500`} />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} shrink-0 overflow-hidden relative border border-zinc-800/80 shadow-md ${className}`}>
      <img
        src={currentSrc}
        alt={`${title} cover`}
        loading="lazy"
        onError={handleError}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
};
