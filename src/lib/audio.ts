"use client";

/**
 * A lightweight synthesizer for glass-like interface sounds
 * using the Web Audio API.
 */

type WindowWithLegacyAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;

const SOUND_KEY = "verve:sound";
let soundOn: boolean | null = null;
const soundListeners = new Set<(on: boolean) => void>();

/** Interface sounds stay off until the visitor turns them on (remembered per browser). */
export function isSoundOn(): boolean {
  if (typeof window === "undefined") return false;
  if (soundOn === null) {
    try {
      soundOn = window.localStorage.getItem(SOUND_KEY) === "on";
    } catch {
      soundOn = false;
    }
  }
  return soundOn;
}

export function setSoundOn(on: boolean) {
  soundOn = on;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Private mode etc. — the choice lasts for this visit only.
  }
  soundListeners.forEach((fn) => fn(on));
}

export function subscribeSound(fn: (on: boolean) => void): () => void {
  soundListeners.add(fn);
  return () => soundListeners.delete(fn);
}

function getContext() {
  if (!audioCtx) {
    const AudioContextConstructor = window.AudioContext || (window as WindowWithLegacyAudioContext).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    audioCtx = new AudioContextConstructor();
  }
  return audioCtx;
}

export const playGlassTing = (options: { frequency?: number; volume?: number; decay?: number } = {}) => {
  if (typeof window === "undefined" || !isSoundOn()) return;

  try {
    const ctx = getContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const { frequency = 2200, volume = 0.05, decay = 0.2 } = options;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // High frequency sine/triangle mix for that pure "ting"
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    // Add a little frequency slide for character
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.2, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + decay);
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
};

export const playGlassClick = () => {
  // Lower frequency, slightly longer decay for clicks
  playGlassTing({ frequency: 1800, volume: 0.08, decay: 0.15 });
};

export const playGlassHover = () => {
  // Very quiet, very high frequency for hovers
  playGlassTing({ frequency: 2800, volume: 0.02, decay: 0.1 });
};
