/**
 * Web Audio API synthesizer for interactive audio previews matching track BPM and Key.
 */

let audioCtx: AudioContext | null = null;
let currentPreviewStopFn: (() => void) | null = null;

// Base note frequencies for octaves 3 and 4
const NOTE_FREQS: Record<string, number> = {
  'C': 261.63,
  'C#': 277.18,
  'Db': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'Gb': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'Ab': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'Bb': 466.16,
  'B': 493.88
};

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopAudioPreview() {
  if (currentPreviewStopFn) {
    try {
      currentPreviewStopFn();
    } catch {
      // ignore
    }
    currentPreviewStopFn = null;
  }
}

/**
 * Plays a pleasant 4-measure harmonic synth arpeggio / groove at the specified BPM and Key.
 */
export function playTrackPreview(bpm: number, songKey: string, onEnded?: () => void): () => void {
  stopAudioPreview();

  const ctx = getAudioContext();
  const tempo = Math.min(180, Math.max(60, bpm || 120));
  const beatDuration = 60 / tempo; // seconds per beat
  const sixteenth = beatDuration / 4;

  // Extract root note and mode (major/minor)
  let root = 'C';
  let isMinor = true;

  if (songKey) {
    const clean = songKey.trim();
    if (clean.includes('Minor') || clean.includes('min') || clean.endsWith('m') || clean.endsWith('A')) {
      isMinor = true;
    } else {
      isMinor = false;
    }

    const match = clean.match(/^[A-G][#b]?/i);
    if (match) {
      root = match[0].toUpperCase();
    }
  }

  const baseFreq = NOTE_FREQS[root] || 261.63;
  // Intervals (semitones)
  const thirdInterval = isMinor ? 3 : 4;
  const fifthInterval = 7;
  const seventhInterval = isMinor ? 10 : 11;
  const octaveInterval = 12;

  const getFreq = (semitones: number) => baseFreq * Math.pow(2, semitones / 12);

  const notes = [
    getFreq(0),               // Root
    getFreq(thirdInterval),    // 3rd
    getFreq(fifthInterval),    // 5th
    getFreq(seventhInterval),  // 7th
    getFreq(octaveInterval),   // Octave
    getFreq(fifthInterval),
    getFreq(thirdInterval),
    getFreq(0)
  ];

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.2, ctx.currentTime);
  masterGain.connect(ctx.destination);

  let isPlaying = true;
  let timerId: number | null = null;
  let step = 0;
  const totalSteps = 32; // 2 bars

  function triggerNote() {
    if (!isPlaying) return;
    if (step >= totalSteps) {
      isPlaying = false;
      if (onEnded) onEnded();
      return;
    }

    const noteFreq = notes[step % notes.length];
    const now = ctx.currentTime;

    // Oscillator
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const noteGain = ctx.createGain();

    osc.type = isMinor ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(noteFreq * (step % 4 === 0 ? 0.5 : 1.0), now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 + (step % 4) * 400, now);
    filter.Q.setValueAtTime(3, now);

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + sixteenth * 1.5);

    osc.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start(now);
    osc.stop(now + sixteenth * 1.8);

    // Optional kick on downbeats
    if (step % 4 === 0) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
      kickGain.gain.setValueAtTime(0.4, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      kickOsc.connect(kickGain);
      kickGain.connect(masterGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.2);
    }

    step++;
    timerId = window.setTimeout(triggerNote, sixteenth * 1000);
  }

  triggerNote();

  const stopFn = () => {
    isPlaying = false;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    try {
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      setTimeout(() => masterGain.disconnect(), 60);
    } catch {
      // ignore
    }
    if (onEnded) onEnded();
  };

  currentPreviewStopFn = stopFn;
  return stopFn;
}
