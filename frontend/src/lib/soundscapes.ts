/**
 * frontend/src/lib/soundscapes.ts
 * Procedural Web Audio Soundscape & 1938 Shortwave Radio Engine
 * Features #24 & #25: Ambient pressroom soundscapes & shortwave broadcast simulation.
 * 100% Client-side synthetic audio with ZERO external MP3/WAV dependencies.
 */

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;

  // Soundscape Gain Nodes
  private rainGain: GainNode | null = null;
  private pressGain: GainNode | null = null;
  private hearthGain: GainNode | null = null;
  private masterSoundscapeGain: GainNode | null = null;

  // Shortwave Filter Nodes
  private isShortwaveActive: boolean = false;
  private tubeHumOsc: OscillatorNode | null = null;
  private tubeHumGain: GainNode | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Starts ambient procedural soundscape generators.
   */
  public startSoundscapes(levels: { rain: number; press: number; hearth: number }) {
    const ctx = this.initContext();
    if (this.isRunning) {
      this.setSoundscapeLevels(levels);
      return;
    }

    this.masterSoundscapeGain = ctx.createGain();
    this.masterSoundscapeGain.gain.setValueAtTime(0.7, ctx.currentTime);
    this.masterSoundscapeGain.connect(ctx.destination);

    // 1. Procedural Rain (Pink Noise with Lowpass Filter)
    const bufferSize = ctx.sampleRate * 2;
    const rainBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = rainBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(800, ctx.currentTime);

    this.rainGain = ctx.createGain();
    this.rainGain.gain.setValueAtTime(levels.rain / 100, ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterSoundscapeGain);
    rainSource.start();

    // 2. Procedural Press (Mechanical Linotype clatter simulation)
    const pressBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const pData = pressBuffer.getChannelData(0);
    for (let i = 0; i < ctx.sampleRate; i++) {
      // Periodic mechanical ticks every 1/4 second with decaying envelope
      const phase = (i % (ctx.sampleRate / 4)) / (ctx.sampleRate / 4);
      pData[i] = (Math.random() * 2 - 1) * Math.exp(-phase * 15) * 0.3;
    }
    const pressSource = ctx.createBufferSource();
    pressSource.buffer = pressBuffer;
    pressSource.loop = true;

    const pressFilter = ctx.createBiquadFilter();
    pressFilter.type = 'bandpass';
    pressFilter.frequency.setValueAtTime(1400, ctx.currentTime);
    pressFilter.Q.setValueAtTime(3.0, ctx.currentTime);

    this.pressGain = ctx.createGain();
    this.pressGain.gain.setValueAtTime(levels.press / 100, ctx.currentTime);

    pressSource.connect(pressFilter);
    pressFilter.connect(this.pressGain);
    this.pressGain.connect(this.masterSoundscapeGain);
    pressSource.start();

    // 3. Procedural Hearth (Brown noise crackle)
    const hearthBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const hData = hearthBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      hData[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = hData[i];
      // Occasional ember snap
      if (Math.random() < 0.0008) {
        hData[i] += (Math.random() * 0.6 + 0.2);
      }
      hData[i] *= 0.2;
    }
    const hearthSource = ctx.createBufferSource();
    hearthSource.buffer = hearthBuffer;
    hearthSource.loop = true;

    this.hearthGain = ctx.createGain();
    this.hearthGain.gain.setValueAtTime(levels.hearth / 100, ctx.currentTime);

    hearthSource.connect(this.hearthGain);
    this.hearthGain.connect(this.masterSoundscapeGain);
    hearthSource.start();

    this.isRunning = true;
  }

  public setSoundscapeLevels(levels: { rain: number; press: number; hearth: number }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(levels.rain / 100, now, 0.1);
    if (this.pressGain) this.pressGain.gain.setTargetAtTime(levels.press / 100, now, 0.1);
    if (this.hearthGain) this.hearthGain.gain.setTargetAtTime(levels.hearth / 100, now, 0.1);
  }

  public stopSoundscapes() {
    if (this.ctx && this.masterSoundscapeGain) {
      this.masterSoundscapeGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.isRunning = false;
  }

  public isSoundscapeActive(): boolean {
    return this.isRunning;
  }

  /**
   * Feature #25: Toggle 1938 Shortwave Radio Effect (Bandpass + 60Hz tube hum)
   */
  public toggleShortwaveRadio(active: boolean) {
    const ctx = this.initContext();
    this.isShortwaveActive = active;

    if (active) {
      if (!this.tubeHumOsc) {
        this.tubeHumOsc = ctx.createOscillator();
        this.tubeHumOsc.type = 'sine';
        this.tubeHumOsc.frequency.setValueAtTime(60, ctx.currentTime); // 60Hz vacuum tube mains hum

        this.tubeHumGain = ctx.createGain();
        this.tubeHumGain.gain.setValueAtTime(0.04, ctx.currentTime);

        this.tubeHumOsc.connect(this.tubeHumGain);
        this.tubeHumGain.connect(ctx.destination);
        this.tubeHumOsc.start();
      }
    } else {
      if (this.tubeHumOsc) {
        try {
          this.tubeHumOsc.stop();
          this.tubeHumOsc.disconnect();
        } catch {}
        this.tubeHumOsc = null;
      }
    }
  }

  public getIsShortwaveActive(): boolean {
    return this.isShortwaveActive;
  }

  /**
   * Play Morse-code emergency telegraphic chirp (Feature #28 CAP Alert arrival)
   */
  public playTelegraphChirp() {
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(750, ctx.currentTime); // 750Hz naval telegraph tone

      // Rapid dit-dit-dah telegraph pattern
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.12, now + 0.02);
      gain.gain.setValueAtTime(0, now + 0.08);
      gain.gain.setValueAtTime(0.12, now + 0.12);
      gain.gain.setValueAtTime(0, now + 0.18);
      gain.gain.setValueAtTime(0.12, now + 0.22);
      gain.gain.setValueAtTime(0, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }
}

export const soundscapeEngine = new SoundscapeEngine();
