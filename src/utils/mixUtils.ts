import { Song, SongMix } from '../types/music';

/**
 * Returns all mixes that contain the given song ID
 */
export function getMixesForSong(songId: string, mixes: SongMix[]): SongMix[] {
  if (!songId || !mixes) return [];
  return mixes.filter(m => m.songIds.includes(songId));
}

/**
 * Returns whether two songs have been mixed together in any recorded mix
 */
export function areSongsMixedTogether(songId1: string, songId2: string, mixes: SongMix[]): {
  isMixed: boolean;
  sharedMixes: SongMix[];
  partnerSongs: Song[];
} {
  if (!songId1 || !songId2 || !mixes) {
    return { isMixed: false, sharedMixes: [], partnerSongs: [] };
  }

  const shared = mixes.filter(
    m => m.songIds.includes(songId1) && m.songIds.includes(songId2)
  );

  if (shared.length === 0) {
    return { isMixed: false, sharedMixes: [], partnerSongs: [] };
  }

  // Collect partner songs from shared mixes (excluding songId1)
  const partnerMap = new Map<string, Song>();
  for (const mix of shared) {
    for (const song of mix.songs) {
      if (song.id !== songId1 && !partnerMap.has(song.id)) {
        partnerMap.set(song.id, song);
      }
    }
  }

  return {
    isMixed: true,
    sharedMixes: shared,
    partnerSongs: Array.from(partnerMap.values())
  };
}

/**
 * Returns all unique songs that have been mixed with the given song across any mix
 */
export function getAllMixedPartnersForSong(songId: string, mixes: SongMix[]): {
  mixesCount: number;
  partnerSongs: Song[];
  mixNames: string[];
} {
  if (!songId || !mixes) {
    return { mixesCount: 0, partnerSongs: [], mixNames: [] };
  }

  const containingMixes = mixes.filter(m => m.songIds.includes(songId));
  const partnerMap = new Map<string, Song>();
  const mixNames: string[] = [];

  for (const mix of containingMixes) {
    mixNames.push(mix.name);
    for (const song of mix.songs) {
      if (song.id !== songId && !partnerMap.has(song.id)) {
        partnerMap.set(song.id, song);
      }
    }
  }

  return {
    mixesCount: containingMixes.length,
    partnerSongs: Array.from(partnerMap.values()),
    mixNames
  };
}
