/**
 * Sound Manager for Channemane
 * Synthesizes tactile wooden clicks, scoops, captures, bonus chimes,
 * and fanfares using the Web Audio API without requiring external assets.
 */

export type SoundEffectType =
  | "sowDrop"
  | "scoop"
  | "capture"
  | "bonusClaim"
  | "roundSettlement"
  | "matchVictory";

const STORAGE_KEY = "channemane_sound_muted";

export class SoundManager {
  private static instance: SoundManager | null = null;
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        this.isMuted = saved === "true";
      } catch {
        this.isMuted = false;
      }
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Returns or initializes the AudioContext lazily on user gesture.
   */
  public getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.audioCtx = new AudioCtxClass();
        } catch {
          this.audioCtx = null;
        }
      }
    }

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
      } catch {}
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Plays a synthesized sound effect by name.
   */
  public playSound(type: SoundEffectType): void {
    if (this.isMuted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      switch (type) {
        case "sowDrop":
          this.synthesizeSowDrop(ctx);
          break;
        case "scoop":
          this.synthesizeScoop(ctx);
          break;
        case "capture":
          this.synthesizeCapture(ctx);
          break;
        case "bonusClaim":
          this.synthesizeBonusClaim(ctx);
          break;
        case "roundSettlement":
          this.synthesizeRoundSettlement(ctx);
          break;
        case "matchVictory":
          this.synthesizeMatchVictory(ctx);
          break;
      }
    } catch {
      // Audio synthesis must never crash the game
    }
  }

  /**
   * Subtle wooden/marble click when a single seed drops into a pit.
   */
  private synthesizeSowDrop(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Subtle pitch variation (+- 40Hz) for natural texture
    const pitch = 720 + (Math.random() * 80 - 40);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, now + 0.04);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);

    // Subtle noise impact transient
    this.playNoiseTransient(ctx, now, 0.025, 1200, 0.15);
  }

  /**
   * Resonant wooden scoop sound when picking up seeds from a pit.
   */
  private synthesizeScoop(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.11);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.11);

    this.playNoiseTransient(ctx, now, 0.06, 600, 0.12);
  }

  /**
   * Crisp collection / clatter sound when seeds are captured into a storage bowl.
   */
  private synthesizeCapture(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Staggered multi-seed drops into bowl
    [0, 0.03, 0.065].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const pitch = 650 + idx * 80;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(pitch, now + offset);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, now + offset + 0.05);

      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.05);
    });

    // Bright collection tone
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = "sine";
    bellOsc.frequency.setValueAtTime(880, now + 0.05);
    bellOsc.frequency.exponentialRampToValueAtTime(440, now + 0.32);

    bellGain.gain.setValueAtTime(0.22, now + 0.05);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);

    bellOsc.start(now + 0.05);
    bellOsc.stop(now + 0.32);
  }

  /**
   * Uplifting harmonic chime when claiming a 4-seed bonus.
   */
  private synthesizeBonusClaim(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Ascending C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  }

  /**
   * Triumphant transition chord at round settlement.
   */
  private synthesizeRoundSettlement(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // C Major: C4, E4, G4, C5
    const chord = [261.63, 329.63, 392.0, 523.25];

    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  /**
   * Celebratory victory fanfare when the match is won.
   */
  private synthesizeMatchVictory(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // G4 -> C5 -> E5 -> G5 (Fanfare)
    const notes = [
      { f: 392.0, t: 0, d: 0.16 },
      { f: 523.25, t: 0.16, d: 0.16 },
      { f: 659.25, t: 0.32, d: 0.2 },
      { f: 783.99, t: 0.52, d: 0.5 },
    ];

    notes.forEach((note) => {
      const startTime = now + note.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.f, startTime);

      gain.gain.setValueAtTime(0.26, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.d);
    });
  }

  /**
   * Generates a short filtered noise burst for physical impact textures.
   */
  private playNoiseTransient(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterFreq: number,
    volume: number
  ): void {
    try {
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(filterFreq, startTime);
      filter.Q.setValueAtTime(3, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + duration);
    } catch {
      // Noise buffer failure is non-fatal
    }
  }
}

export const soundManager = SoundManager.getInstance();
