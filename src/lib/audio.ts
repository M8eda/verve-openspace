"use client";

/**
 * A lightweight synthesizer for glass-like interface sounds
 * using the Web Audio API.
 */

type WindowWithLegacyAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;

function getContext() {
  if (!audioCtx) {
    const AudioContextConstructor = window.AudioContext || (window as WindowWithLegacyAudioContext).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    audioCtx = new AudioContextConstructor();
  }
  return audioCtx;
}

export const playGlassTing = (options: { frequency?: number; volume?: number; decay?: number } = {}) => {
  if (typeof window === "undefined") return;

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
