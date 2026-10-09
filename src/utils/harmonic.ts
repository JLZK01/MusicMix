import { Song, RandomizeFilterOption, HarmonicMatchResult, TonalityFilterOption } from '../types/music';

// Camelot Wheel mapping and utilities
export const CAMELOT_MAP: Record<string, { camelot: string; standard: string; color: string }> = {
  // Minor Keys (A)
  '1A': { camelot: '1A', standard: 'Ab Minor', color: '#10b981' },
  '2A': { camelot: '2A', standard: 'Eb Minor', color: '#06b6d4' },
  '3A': { camelot: '3A', standard: 'Bb Minor', color: '#0284c7' },
  '4A': { camelot: '4A', standard: 'F Minor', color: '#3b82f6' },
  '5A': { camelot: '5A', standard: 'C Minor', color: '#6366f1' },
  '6A': { camelot: '6A', standard: 'G Minor', color: '#8b5cf6' },
  '7A': { camelot: '7A', standard: 'D Minor', color: '#a855f7' },
  '8A': { camelot: '8A', standard: 'A Minor', color: '#d946ef' },
  '9A': { camelot: '9A', standard: 'E Minor', color: '#ec4899' },
  '10A': { camelot: '10A', standard: 'B Minor', color: '#f43f5e' },
  '11A': { camelot: '11A', standard: 'F# Minor', color: '#f97316' },
  '12A': { camelot: '12A', standard: 'C# Minor', color: '#eab308' },

  // Major Keys (B)
  '1B': { camelot: '1B', standard: 'B Major', color: '#34d399' },
  '2B': { camelot: '2B', standard: 'F# Major', color: '#22d3ee' },
  '3B': { camelot: '3B', standard: 'Db Major', color: '#38bdf8' },
  '4B': { camelot: '4B', standard: 'Ab Major', color: '#60a5fa' },
  '5B': { camelot: '5B', standard: 'Eb Major', color: '#818cf8' },
  '6B': { camelot: '6B', standard: 'Bb Major', color: '#a78bfa' },
  '7B': { camelot: '7B', standard: 'F Major', color: '#c084fc' },
  '8B': { camelot: '8B', standard: 'C Major', color: '#e879f9' },
  '9B': { camelot: '9B', standard: 'G Major', color: '#f472b6' },
  '10B': { camelot: '10B', standard: 'D Major', color: '#fb7185' },
  '11B': { camelot: '11B', standard: 'A Major', color: '#fb923c' },
  '12B': { camelot: '12B', standard: 'E Major', color: '#fde047' },
};

export function normalizeToCamelot(input: string): string {
  if (!input) return '8A';
  const clean = input.trim().toUpperCase();

  if (/^(1[0-2]|[1-9])[AB]$/.test(clean)) {
    return clean;
  }

  for (const [cam, item] of Object.entries(CAMELOT_MAP)) {
    if (clean.includes(item.standard.toUpperCase())) {
      return cam;
    }
  }

  const aliasMap: Record<string, string> = {
    'C MAJ': '8B', 'C MAJOR': '8B', 'C': '8B',
    'A MIN': '8A', 'A MINOR': '8A', 'AM': '8A',
    'G MAJ': '9B', 'G MAJOR': '9B', 'G': '9B',
    'E MIN': '9A', 'E MINOR': '9A', 'EM': '9A',
    'D MAJ': '10B', 'D MAJOR': '10B', 'D': '10B',
    'B MIN': '10A', 'B MINOR': '10A', 'BM': '10A',
    'A MAJ': '11B', 'A MAJOR': '11B', 'A': '11B',
    'F# MIN': '11A', 'F# MINOR': '11A', 'F#M': '11A',
    'E MAJ': '12B', 'E MAJOR': '12B', 'E': '12B',
    'C# MIN': '12A', 'C# MINOR': '12A', 'C#M': '12A',
    'F MAJ': '7B', 'F MAJOR': '7B', 'F': '7B',
    'D MIN': '7A', 'D MINOR': '7A', 'DM': '7A',
    'BB MAJ': '6B', 'BB MAJOR': '6B', 'BB': '6B',
    'G MIN': '6A', 'G MINOR': '6A', 'GM': '6A',
    'EB MAJ': '5B', 'EB MAJOR': '5B', 'EB': '5B',
    'C MIN': '5A', 'C MINOR': '5A', 'CM': '5A',
  };

  for (const [alias, cam] of Object.entries(aliasMap)) {
    if (clean === alias || clean.startsWith(alias)) {
      return cam;
    }
  }

  const hash = Math.abs(clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const num = (hash % 12) + 1;
  const letter = hash % 2 === 0 ? 'A' : 'B';
  return `${num}${letter}`;
}

export function getKeyColor(camelotKey: string): string {
  const norm = normalizeToCamelot(camelotKey);
  return CAMELOT_MAP[norm]?.color || '#a855f7';
}

export function formatKeyDisplay(songKey: string, camelotKey: string): string {
  const cam = normalizeToCamelot(camelotKey || songKey);
  const info = CAMELOT_MAP[cam];
  if (info) {
    return `${cam} (${info.standard})`;
  }
  return songKey || camelotKey;
}

export function calculateKeyCompatibility(
  cam1Str: string,
  cam2Str: string
): { score: number; relation: HarmonicMatchResult['keyCompatibility']; notes: string } {
  const c1 = normalizeToCamelot(cam1Str);
  const c2 = normalizeToCamelot(cam2Str);

  const num1 = parseInt(c1.slice(0, -1), 10);
  const mode1 = c1.slice(-1);
  const num2 = parseInt(c2.slice(0, -1), 10);
  const mode2 = c2.slice(-1);

  if (c1 === c2) {
    return { score: 100, relation: 'exact', notes: 'Exact Key Match' };
  }

  if (num1 === num2 && mode1 !== mode2) {
    return { score: 95, relation: 'relative', notes: `Relative ${mode2 === 'B' ? 'Major' : 'Minor'} Harmonic Match` };
  }

  let diff = Math.abs(num1 - num2);
  if (diff > 6) {
    diff = 12 - diff;
  }

  if (diff === 1 && mode1 === mode2) {
    return { score: 90, relation: 'adjacent', notes: 'Adjacent Harmonic Step (±1)' };
  }

  if (diff === 1 && mode1 !== mode2) {
    return { score: 75, relation: 'compatible', notes: 'Diagonal Harmonic Transition' };
  }

  if (diff === 2 && mode1 === mode2) {
    return { score: 70, relation: 'energy', notes: 'Harmonic Energy Shift (±2)' };
  }

  const score = Math.max(10, Math.round(60 - diff * 8));
  return { score, relation: 'distant', notes: `Distant Key (${diff} steps away)` };
}

export function calculateBpmCompatibility(bpm1: number, bpm2: number): { score: number; bpmDiff: number } {
  if (!bpm1 || !bpm2) return { score: 50, bpmDiff: 0 };

  const directDiff = Math.abs(bpm1 - bpm2);
  const halfDiff = Math.abs(bpm1 - bpm2 * 2);
  const doubleDiff = Math.abs(bpm1 * 2 - bpm2);
  const minDiff = Math.min(directDiff, halfDiff, doubleDiff);

  let score = 100;
  if (minDiff <= 2) {
    score = 100;
  } else if (minDiff <= 4) {
    score = 95;
  } else if (minDiff <= 8) {
    score = 85;
  } else if (minDiff <= 15) {
    score = 70;
  } else if (minDiff <= 25) {
    score = 50;
  } else {
    score = Math.max(10, Math.round(100 - minDiff * 1.8));
  }

  return { score, bpmDiff: directDiff };
}

export function calculateGenreCompatibility(genre1: string, genre2: string): { score: number; match: boolean } {
  if (!genre1 || !genre2) return { score: 40, match: false };

  const g1 = genre1.toLowerCase().trim();
  const g2 = genre2.toLowerCase().trim();

  if (g1 === g2) {
    return { score: 100, match: true };
  }

  if (g1.includes(g2) || g2.includes(g1)) {
    return { score: 85, match: true };
  }

  const families: string[][] = [
    ['house', 'deep house', 'tech house', 'progressive house', 'dance', 'electronic', 'techno', 'edm'],
    ['techno', 'minimal techno', 'acid techno', 'trance', 'electronic'],
    ['hip hop', 'rap', 'trap', 'r&b', 'urban'],
    ['rock', 'alternative', 'indie rock', 'hard rock', 'punk'],
    ['pop', 'synthpop', 'dance-pop', 'electropop'],
    ['ambient', 'chillout', 'downtempo', 'lo-fi'],
    ['drum & bass', 'dnb', 'jungle', 'breakbeat'],
    ['disco', 'funk', 'nu-disco', 'boogie']
  ];

  for (const group of families) {
    const inG1 = group.some(item => g1.includes(item));
    const inG2 = group.some(item => g2.includes(item));
    if (inG1 && inG2) {
      return { score: 75, match: true };
    }
  }

  return { score: 20, match: false };
}

export function evaluateMatch(
  ref: Song,
  cand: Song,
  activeFilters: RandomizeFilterOption[]
): HarmonicMatchResult {
  const bpmRes = calculateBpmCompatibility(ref.bpm, cand.bpm);
  const keyRes = calculateKeyCompatibility(ref.camelotKey, cand.camelotKey);
  const genreRes = calculateGenreCompatibility(ref.genre, cand.genre);

  const reasons: string[] = [];
  let totalScore = 0;

  if (activeFilters.length === 0) {
    totalScore = Math.round((bpmRes.score + keyRes.score + genreRes.score) / 3);
  } else {
    let weightSum = 0;
    let weightedScore = 0;

    if (activeFilters.includes('BPM')) {
      weightedScore += bpmRes.score * 1.2;
      weightSum += 1.2;
      reasons.push(`BPM Δ: ${bpmRes.bpmDiff} (${cand.bpm} vs ${ref.bpm} BPM)`);
    }

    if (activeFilters.includes('KEY')) {
      weightedScore += keyRes.score * 1.4;
      weightSum += 1.4;
      reasons.push(`Key: ${keyRes.notes} (${cand.camelotKey} ↔ ${ref.camelotKey})`);
    }

    if (activeFilters.includes('Genre')) {
      weightedScore += genreRes.score * 1.0;
      weightSum += 1.0;
      reasons.push(genreRes.match ? `Genre: ${cand.genre}` : `Genre: ${cand.genre} vs ${ref.genre}`);
    }

    totalScore = Math.round(weightedScore / weightSum);
  }

  return {
    song: cand,
    totalScore,
    bpmScore: bpmRes.score,
    keyScore: keyRes.score,
    genreScore: genreRes.score,
    bpmDiff: bpmRes.bpmDiff,
    keyCompatibility: keyRes.relation,
    keyNotes: keyRes.notes,
    genreMatch: genreRes.match,
    reasons
  };
}

export function getSongTonality(song: Song): 'minor' | 'major' | 'unknown' {
  const cam = normalizeToCamelot(song.camelotKey || song.songKey);
  if (cam.endsWith('A')) return 'minor';
  if (cam.endsWith('B')) return 'major';
  const k = (song.songKey || '').toLowerCase();
  if (k.includes('minor') || k.includes('min')) return 'minor';
  if (k.includes('major') || k.includes('maj')) return 'major';
  return 'unknown';
}

/**
 * Recommends multiple tracks (slider 1 to 20):
 * - If filtered: sorts in descending order of match score, returns up to `count` tracks.
 * - If random: shuffles candidates and sorts them in descending order, returning up to `count` tracks.
 * - Supports tonality filter: 'minor' (A keys), 'major' (B keys), or 'mixed' (all).
 */
export function recommendTracksFromPlaylist(
  referenceSong: Song,
  playlist: Song[],
  activeFilters: RandomizeFilterOption[],
  count: number,
  isPureRandom: boolean = false,
  tonalityFilter: TonalityFilterOption = 'mixed'
): HarmonicMatchResult[] {
  let candidates = playlist.filter(s => s.id !== referenceSong.id);
  if (candidates.length === 0) {
    if (playlist.length > 0) {
      return [evaluateMatch(referenceSong, playlist[0], activeFilters)];
    }
    return [];
  }

  // Apply tonality filter slider (minor / major / mixed)
  if (tonalityFilter !== 'mixed') {
    const tonalityFiltered = candidates.filter(s => getSongTonality(s) === tonalityFilter);
    // Use tonality-filtered subset if any matches exist in the playlist
    if (tonalityFiltered.length > 0) {
      candidates = tonalityFiltered;
    }
  }

  const requestedCount = Math.min(20, Math.max(1, count));

  if (isPureRandom) {
    // Shuffled pool
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, requestedCount);
    // Evaluate and sort in descending order as requested
    const evaluated = chosen.map(cand => {
      const match = evaluateMatch(referenceSong, cand, []);
      if (tonalityFilter !== 'mixed' && getSongTonality(cand) === tonalityFilter) {
        match.reasons.unshift(`Tonality match: ${tonalityFilter.toUpperCase()}`);
      }
      return match;
    });
    evaluated.sort((a, b) => b.totalScore - a.totalScore);
    return evaluated;
  }

  // Filtered recommendation: evaluate all candidates and sort descending
  // Shuffle pool first to prevent deterministic insertion bias
  const pool = [...candidates].sort(() => Math.random() - 0.5);
  const evaluated = pool.map(cand => {
    const match = evaluateMatch(referenceSong, cand, activeFilters);
    if (tonalityFilter !== 'mixed' && getSongTonality(cand) === tonalityFilter) {
      match.reasons.unshift(`Tonality match: ${tonalityFilter.toUpperCase()}`);
    }
    return match;
  });
  evaluated.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // If multiple songs have the same match percentage, randomize their order
    return Math.random() - 0.5;
  });

  return evaluated.slice(0, requestedCount);
}
