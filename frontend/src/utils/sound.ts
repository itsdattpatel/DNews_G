/**
 * frontend/src/utils/sound.ts
 * Synthesizes smooth UI feedback sounds and alert chimes via Web Audio API.
 * Gated by user setting `sound_enabled`.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Soft, smooth tactile button click */
export function playButtonSound(enabled = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle soft pitch drop
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch {
    // AudioContext blocked or not supported
  }
}

/** Distinct breaking news / alert chime (P6-05) */
export function playAlertChime(enabled = true): void {
  if (!enabled) return;

  // Attempt playing audio file if available
  if (typeof Audio !== 'undefined') {
    try {
      const audio = new Audio('/assets/alert.mp3');
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Fallback to Web Audio procedural chime
          synthesizeAlertChime();
        });
        return;
      }
    } catch {
      // Audio file playback error, proceed to procedural fallback
    }
  }

  synthesizeAlertChime();
}

function synthesizeAlertChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [520, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);

      gain.gain.setValueAtTime(0.09, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.36);
    });
  } catch {
    // AudioContext blocked or not supported
  }
}

/** Mechanical Linotype & Platen Press Clack (Phase I #38) */
export function playMechanicalPressClack(enabled = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Double mechanical platen strike: crisp metallic transient followed by low chassis resonance
    [0, 0.042].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? 920 : 210, now + offset);
      osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 180 : 65, now + offset + 0.038);

      gain.gain.setValueAtTime(idx === 0 ? 0.08 : 0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.05);
    });
  } catch {
    // AudioContext blocked
  }
}

/** Heavy Rubber Ink Stamp Impression Thud (Phase I #37/#38) */
export function playRubberStampThud(enabled = true): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch {
    // AudioContext blocked
  }
}
