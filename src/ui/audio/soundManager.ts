/**
 * Sound Manager for Channemane
 * Modern, Realistic and Premium Audio Engine.
 *
 * Synthesizes organic, physical wooden board contact, seed placement,
 * tactile scooping, multi-seed tumbling captures, kalimba/marimba harmonic
 * bonus rewards, and cinematic milestone fanfares using the Web Audio API.
 *
 * Zero external audio assets required. Zero network latency. 100% offline.
 */

export type SoundEffectType =
  | "sowDrop"
  | "scoop"
  | "capture"
  | "bonusClaim"
  | "roundSettlement"
  | "matchVictory";

const STORAGE_KEY_MUTED = "channemane_sound_muted";
const STORAGE_KEY_VOLUME = "channemane_sfx_volume";

export class SoundManager {
  private static instance: SoundManager | null = null;
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.85;

  // Master bus routing
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;

  // Pre-rendered reusable noise buffer for high-performance organic transients
  private noiseBuffer: AudioBuffer | null = null;

  // Rapid sowing voice management & anti-fatigue
  private lastSowDropTime: number = 0;
  private sowDropPitchIndex: number = 0;

  // Music ducking support
  private musicGainNode: GainNode | null = null;
  private musicAudioElement: HTMLAudioElement | null = null;
  private duckRestoreTimeout: ReturnType<typeof setTimeout> | null = null;
  private originalMusicVolume: number = 1.0;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
        this.isMuted = savedMuted === "true";

        const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.sfxVolume = parsed;
          }
        }
      } catch {
        this.isMuted = false;
        this.sfxVolume = 0.85;
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
   * Initializes or returns the AudioContext lazily on user gesture.
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
          this.initializeAudioGraph(this.audioCtx);
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

  /**
   * Builds the master audio processing graph:
   * [Source Voice] -> [Master Gain] -> [Dynamics Compressor] -> [Warmth Filter] -> [Destination]
   */
  private initializeAudioGraph(ctx: AudioContext): void {
    try {
      // 1. Master SFX Gain Node
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.sfxVolume,
        ctx.currentTime
      );

      // 2. Dynamics Compressor / Limiter (prevents clipping during overlapping sound bursts)
      if (typeof ctx.createDynamicsCompressor === "function") {
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, ctx.currentTime);
        this.compressor.knee.setValueAtTime(15, ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, ctx.currentTime);
      }

      // 3. Master Warmth Filter (soft lowpass shelf to remove harsh digital high-frequency aliasing)
      if (typeof ctx.createBiquadFilter === "function") {
        this.masterFilter = ctx.createBiquadFilter();
        this.masterFilter.type = "lowpass";
        this.masterFilter.frequency.setValueAtTime(14500, ctx.currentTime);
        this.masterFilter.Q.setValueAtTime(0.7, ctx.currentTime);
      }

      // Connect graph
      if (this.compressor && this.masterFilter) {
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.masterFilter);
        this.masterFilter.connect(ctx.destination);
      } else if (this.compressor) {
        this.masterGain.connect(this.compressor);
        this.compressor.connect(ctx.destination);
      } else if (this.masterFilter) {
        this.masterGain.connect(this.masterFilter);
        this.masterFilter.connect(ctx.destination);
      } else {
        this.masterGain.connect(ctx.destination);
      }

      // Pre-compute 1.0 second of organic pink/velvet noise for physical transients
      this.generateNoiseBuffer(ctx);
    } catch {
      // Audio graph initialization failure is non-fatal
    }
  }

  /**
   * Pre-renders an organic filtered noise buffer once to avoid runtime allocations.
   */
  private generateNoiseBuffer(ctx: AudioContext): void {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const bufferSize = sampleRate * 1; // 1 second buffer
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      // Filtered noise with 1/f slope for warm organic contact sounds
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0555179;
        b1 = 0.963 * b1 + white * 0.0750759;
        b2 = 0.57 * b2 + white * 0.153852;
        data[i] = (b0 + b1 + b2 + white * 0.1) * 0.4;
      }
      this.noiseBuffer = buffer;
    } catch {
      this.noiseBuffer = null;
    }
  }

  /**
   * Helper to connect a node to the master audio bus.
   */
  private connectToMaster(node: AudioNode, ctx: AudioContext): void {
    if (this.masterGain) {
      node.connect(this.masterGain);
    } else {
      node.connect(ctx.destination);
    }
  }

  /* ========================================================================
   * Mute and Volume Controls
   * ======================================================================== */

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_MUTED, muted ? "true" : "false");
      } catch {}
    }

    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(
        muted ? 0 : this.sfxVolume,
        now + 0.03
      );
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setSfxVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.sfxVolume = clamped;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
      } catch {}
    }

    if (this.masterGain && this.audioCtx && !this.isMuted) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(clamped, now + 0.03);
    }
  }

  /* ========================================================================
   * Background Music Ducking Support
   * ======================================================================== */

  public setMusicGainNode(node: GainNode | null): void {
    this.musicGainNode = node;
  }

  public setMusicAudioElement(element: HTMLAudioElement | null): void {
    this.musicAudioElement = element;
    if (element) {
      this.originalMusicVolume = element.volume;
    }
  }

  /**
   * Smoothly ducks background music volume during prominent events.
   * Restores smoothly after durationMs.
   */
  public duckMusic(reductionFraction: number = 0.35, durationMs: number = 750): void {
    if (this.duckRestoreTimeout) {
      clearTimeout(this.duckRestoreTimeout);
      this.duckRestoreTimeout = null;
    }

    // 1. Web Audio Gain Node Ducking
    if (this.musicGainNode && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      const targetGain = Math.max(0, 1 - reductionFraction);
      this.musicGainNode.gain.cancelScheduledValues(now);
      this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, now);
      this.musicGainNode.gain.linearRampToValueAtTime(targetGain, now + 0.06);

      this.duckRestoreTimeout = setTimeout(() => {
        if (this.musicGainNode && this.audioCtx) {
          const restoreTime = this.audioCtx.currentTime;
          this.musicGainNode.gain.cancelScheduledValues(restoreTime);
          this.musicGainNode.gain.linearRampToValueAtTime(1.0, restoreTime + 0.15);
        }
      }, durationMs);
    }
    // 2. HTMLAudioElement Ducking
    else if (this.musicAudioElement) {
      const target = Math.max(0, this.originalMusicVolume * (1 - reductionFraction));
      this.musicAudioElement.volume = target;

      this.duckRestoreTimeout = setTimeout(() => {
        if (this.musicAudioElement) {
          this.musicAudioElement.volume = this.originalMusicVolume;
        }
      }, durationMs);
    }
  }

  /* ========================================================================
   * Primary Sound Playback Dispatcher
   * ======================================================================== */

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
          this.duckMusic(0.35, 600);
          break;
        case "bonusClaim":
          this.synthesizeBonusClaim(ctx);
          this.duckMusic(0.4, 750);
          break;
        case "roundSettlement":
          this.synthesizeRoundSettlement(ctx);
          this.duckMusic(0.5, 1100);
          break;
        case "matchVictory":
          this.synthesizeMatchVictory(ctx);
          this.duckMusic(0.6, 1800);
          break;
      }
    } catch {
      // Audio playback must never interrupt gameplay
    }
  }

  /* ========================================================================
   * Sound Effect Synthesizers – Realistic Physical & Cinematic Modeling
   * ======================================================================== */

  /**
   * A. sowDrop – Small polished seed gently dropping into a wooden pit.
   *
   * Physical layers:
   * 1. Seed shell contact: very short high-frequency transient (4-6ms).
   * 2. Wooden pit cavity body: warm resonant dampening (~460–560 Hz).
   * 3. Pit air pocket mode: subtle gentle secondary ring (~920 Hz).
   * 4. Multi-pitch cycling: variations in pitch/timbre prevent ear fatigue during rapid sowing.
   */
  private synthesizeSowDrop(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Rate-limiting and anti-fatigue voice management
    const timeSinceLast = now - this.lastSowDropTime;
    this.lastSowDropTime = now;
    if (timeSinceLast < 0.035) {
      // Rapid drops: slightly soften volume to prevent build-up
      this.sowDropPitchIndex = (this.sowDropPitchIndex + 1) % 5;
    } else {
      this.sowDropPitchIndex = (this.sowDropPitchIndex + 1) % 5;
    }

    // Organic wood/seed pitch variants (mimicking varied tamarind/manjadikuru seed sizes)
    const pitchVariants = [480, 520, 460, 550, 500];
    const basePitch = pitchVariants[this.sowDropPitchIndex] + (Math.random() * 20 - 10);

    // 1. Pit Cavity Body Resonance (Wood)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();

    bodyOsc.type = "sine";
    bodyOsc.frequency.setValueAtTime(basePitch, now);
    // Natural wood dampening pitch drop
    bodyOsc.frequency.exponentialRampToValueAtTime(basePitch * 0.82, now + 0.032);

    bodyGain.gain.setValueAtTime(0.18, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    bodyOsc.connect(bodyGain);
    this.connectToMaster(bodyGain, ctx);

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.035);

    // 2. Secondary Air Pocket Resonance (Soft harmonic overtone)
    const airOsc = ctx.createOscillator();
    const airGain = ctx.createGain();

    airOsc.type = "triangle";
    airOsc.frequency.setValueAtTime(basePitch * 1.95, now);
    airGain.gain.setValueAtTime(0.045, now);
    airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    airOsc.connect(airGain);
    this.connectToMaster(airGain, ctx);

    airOsc.start(now);
    airOsc.stop(now + 0.025);

    // 3. Shell Click Transient (Polished seed shell contacting wood)
    this.playNoiseTransient(ctx, now, 0.008, 3400, 3.5, 0.12);
  }

  /**
   * B. scoop – Picking up a cluster of seeds from a wooden pit.
   *
   * Physical layers:
   * 1. Granular seed-on-seed friction: swept bandpass noise (2400 Hz -> 1200 Hz).
   * 2. Wooden pit cavity scoop: resonant downward slide (280 Hz -> 170 Hz).
   * 3. Micro-collisions: staggered tiny seed clicks as seeds are gathered into hand.
   */
  private synthesizeScoop(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // 1. Wooden Cavity Resonance
    const cavityOsc = ctx.createOscillator();
    const cavityGain = ctx.createGain();

    cavityOsc.type = "sine";
    cavityOsc.frequency.setValueAtTime(280, now);
    cavityOsc.frequency.exponentialRampToValueAtTime(170, now + 0.095);

    cavityGain.gain.setValueAtTime(0.01, now);
    cavityGain.gain.linearRampToValueAtTime(0.19, now + 0.015);
    cavityGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    cavityOsc.connect(cavityGain);
    this.connectToMaster(cavityGain, ctx);

    cavityOsc.start(now);
    cavityOsc.stop(now + 0.095);

    // 2. Granular Seed-on-Seed Rustle (Swept bandpass noise)
    this.playSweptNoiseTransient(ctx, now, 0.08, 2200, 1100, 2.0, 0.14);

    // 3. Micro-seed contact clicks
    this.playNoiseTransient(ctx, now + 0.012, 0.006, 2800, 3.0, 0.07);
    this.playNoiseTransient(ctx, now + 0.028, 0.007, 3200, 3.5, 0.06);
  }

  /**
   * C. capture – A handful of captured seeds cascading into a wooden storage bowl.
   *
   * Physical layers:
   * 1. Multi-seed cascade: 4 staggered natural impacts into the bowl.
   * 2. Large bowl body resonance: deep, warm fundamental (180 Hz, 360 Hz).
   * 3. Refined acoustic chime accent: warm musical tone (E5: 659 Hz) resolving smoothly.
   */
  private synthesizeCapture(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // 1. Staggered Cascading Seed Cluster (Tumbling into bowl)
    const cluster = [
      { t: 0.0, f: 560, v: 0.12 },
      { t: 0.022, f: 680, v: 0.14 },
      { t: 0.048, f: 490, v: 0.15 },
      { t: 0.08, f: 620, v: 0.13 },
    ];

    cluster.forEach((seed) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(seed.f, now + seed.t);
      osc.frequency.exponentialRampToValueAtTime(seed.f * 0.8, now + seed.t + 0.035);

      gain.gain.setValueAtTime(seed.v, now + seed.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + seed.t + 0.035);

      osc.connect(gain);
      this.connectToMaster(gain, ctx);

      osc.start(now + seed.t);
      osc.stop(now + seed.t + 0.035);

      // Micro click per seed
      this.playNoiseTransient(ctx, now + seed.t, 0.007, 3100, 3.0, 0.08);
    });

    // 2. Storage Basin Low-Mid Resonance
    const bowlOsc = ctx.createOscillator();
    const bowlGain = ctx.createGain();

    bowlOsc.type = "sine";
    bowlOsc.frequency.setValueAtTime(185, now + 0.03);
    bowlOsc.frequency.exponentialRampToValueAtTime(140, now + 0.22);

    bowlGain.gain.setValueAtTime(0.01, now + 0.03);
    bowlGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    bowlGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    bowlOsc.connect(bowlGain);
    this.connectToMaster(bowlGain, ctx);

    bowlOsc.start(now + 0.03);
    bowlOsc.stop(now + 0.22);

    // 3. Subtle Warm Harmonic Finish (E5: 659.25 Hz)
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    chimeOsc.type = "sine";
    chimeOsc.frequency.setValueAtTime(659.25, now + 0.05);

    chimeGain.gain.setValueAtTime(0.01, now + 0.05);
    chimeGain.gain.linearRampToValueAtTime(0.14, now + 0.07);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    chimeOsc.connect(chimeGain);
    this.connectToMaster(chimeGain, ctx);

    chimeOsc.start(now + 0.05);
    chimeOsc.stop(now + 0.38);
  }

  /**
   * D. bonusClaim – Special 4-seed bonus reward.
   *
   * Physical layers:
   * 1. Handcrafted Kalimba / Marimba wooden tone arpeggio:
   *    G4 (392Hz) -> B4 (494Hz) -> E5 (659Hz) -> G5 (784Hz).
   * 2. Mallet strike transient on each bar.
   * 3. Subtle physical seed scoop underlay.
   */
  private synthesizeBonusClaim(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Physical seed scoop underlay
    this.playSweptNoiseTransient(ctx, now, 0.07, 2400, 1400, 2.5, 0.09);

    // Kalimba / Marimba Chime Sequence
    const kalimbaNotes = [
      { f: 392.0, t: 0.0, d: 0.35, v: 0.16 }, // G4
      { f: 493.88, t: 0.055, d: 0.38, v: 0.18 }, // B4
      { f: 659.25, t: 0.11, d: 0.45, v: 0.2 }, // E5
      { f: 783.99, t: 0.175, d: 0.55, v: 0.22 }, // G5
    ];

    kalimbaNotes.forEach((note) => {
      const startTime = now + note.t;

      // 1. Primary Marimba Sine Tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.f, startTime);

      // Fast tactile attack, natural wooden ring-out
      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(note.v, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.connect(gain);
      this.connectToMaster(gain, ctx);

      osc.start(startTime);
      osc.stop(startTime + note.d);

      // 2. Wooden Bar Overtone (natural acoustic wooden bar resonance at ~3.9x fundamental)
      const overtoneOsc = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      overtoneOsc.type = "sine";
      overtoneOsc.frequency.setValueAtTime(note.f * 3.92, startTime);

      overtoneGain.gain.setValueAtTime(note.v * 0.18, startTime);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);

      overtoneOsc.connect(overtoneGain);
      this.connectToMaster(overtoneGain, ctx);

      overtoneOsc.start(startTime);
      overtoneOsc.stop(startTime + 0.045);

      // 3. Wooden Mallet Tap Transient
      this.playNoiseTransient(ctx, startTime, 0.006, 2600, 3.0, 0.05);
    });
  }

  /**
   * E. roundSettlement – Dignified, cinematic milestone completion.
   *
   * Physical layers:
   * 1. Low-mid acoustic gong / singing bowl resonance: D3 (146.8Hz), A3 (220Hz), D4 (293.7Hz).
   * 2. Granular board sweep: soft seeds sweeping across polished wood.
   * 3. High acoustic fifth chime (A5: 880Hz) providing peaceful closure.
   */
  private synthesizeRoundSettlement(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // 1. Granular Board Sweep (Seeds sliding to owners' bowls)
    this.playSweptNoiseTransient(ctx, now, 0.28, 1900, 750, 1.8, 0.1);

    // 2. Warm Cinematic Acoustic Gong / Singing Bowl Chord: D3, A3, D4, F#4
    const chordNotes = [
      { f: 146.83, a: 0.04, d: 0.95, v: 0.18 }, // D3
      { f: 220.0, a: 0.03, d: 0.85, v: 0.16 }, // A3
      { f: 293.66, a: 0.02, d: 0.75, v: 0.14 }, // D4
      { f: 369.99, a: 0.02, d: 0.65, v: 0.11 }, // F#4
    ];

    chordNotes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, now);

      // Swelling organic attack, long noble decay
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(note.v, now + note.a);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

      osc.connect(gain);
      this.connectToMaster(gain, ctx);

      osc.start(now);
      osc.stop(now + note.d);
    });

    // 3. Subtle Acoustic Shimmer Overtone (A5: 880Hz)
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();

    shimmerOsc.type = "sine";
    shimmerOsc.frequency.setValueAtTime(880.0, now + 0.05);

    shimmerGain.gain.setValueAtTime(0.01, now + 0.05);
    shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.09);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    shimmerOsc.connect(shimmerGain);
    this.connectToMaster(shimmerGain, ctx);

    shimmerOsc.start(now + 0.05);
    shimmerOsc.stop(now + 0.65);
  }

  /**
   * F. matchVictory – Celebratory, premium, cinematic match-end victory fanfare.
   *
   * Physical layers:
   * 1. 4-note acoustic marimba motif: D4 -> G4 -> B4 -> D5.
   * 2. Grand resolving acoustic chord: G3, D4, G4, B4, D5 sustaining over 1.5s.
   * 3. Dual-layer wooden hammer strikes and resonant singing bowl tail.
   */
  private synthesizeMatchVictory(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Melodic Motifs (Marimba / Chime)
    const melody = [
      { f: 293.66, t: 0.0, d: 0.45, v: 0.2 }, // D4
      { f: 392.0, t: 0.13, d: 0.48, v: 0.22 }, // G4
      { f: 493.88, t: 0.26, d: 0.52, v: 0.24 }, // B4
      { f: 587.33, t: 0.41, d: 1.45, v: 0.26 }, // D5 (Sustained lead)
    ];

    melody.forEach((note) => {
      const startTime = now + note.t;

      // Primary tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.f, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(note.v, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.connect(gain);
      this.connectToMaster(gain, ctx);

      osc.start(startTime);
      osc.stop(startTime + note.d);

      // Wooden mallet transient
      this.playNoiseTransient(ctx, startTime, 0.008, 2800, 3.2, 0.07);
    });

    // Sustained Warm Resolving Harmony (Entering with the peak lead note at t = 0.41s)
    const chordT = now + 0.41;
    const victoryChord = [
      { f: 196.0, d: 1.55, v: 0.18 }, // G3 (Deep root)
      { f: 293.66, d: 1.45, v: 0.15 }, // D4
      { f: 392.0, d: 1.4, v: 0.16 }, // G4
      { f: 493.88, d: 1.35, v: 0.14 }, // B4
    ];

    victoryChord.forEach((voice) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(voice.f, chordT);

      gain.gain.setValueAtTime(0.01, chordT);
      gain.gain.linearRampToValueAtTime(voice.v, chordT + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, chordT + voice.d);

      osc.connect(gain);
      this.connectToMaster(gain, ctx);

      osc.start(chordT);
      osc.stop(chordT + voice.d);
    });

    // Warm high acoustic shimmer
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = "sine";
    shimmerOsc.frequency.setValueAtTime(987.77, chordT + 0.03); // B5

    shimmerGain.gain.setValueAtTime(0.01, chordT + 0.03);
    shimmerGain.gain.linearRampToValueAtTime(0.09, chordT + 0.08);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, chordT + 0.95);

    shimmerOsc.connect(shimmerGain);
    this.connectToMaster(shimmerGain, ctx);

    shimmerOsc.start(chordT + 0.03);
    shimmerOsc.stop(chordT + 0.95);
  }

  /* ========================================================================
   * Transient & Granular Physical Texture Synthesizers
   * ======================================================================== */

  /**
   * Generates a short filtered organic noise burst for physical seed/wood contact.
   * Utilizes the pre-rendered noiseBuffer for zero garbage collection.
   */
  private playNoiseTransient(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterFreq: number,
    filterQ: number,
    volume: number
  ): void {
    try {
      const source = this.noiseBuffer
        ? ctx.createBufferSource()
        : null;

      if (source && this.noiseBuffer) {
        source.buffer = this.noiseBuffer;
      } else {
        // Fallback dynamic buffer if pre-render was unavailable
        const size = Math.max(1, Math.floor((ctx.sampleRate || 44100) * duration));
        const buf = ctx.createBuffer(1, size, ctx.sampleRate || 44100);
        const d = buf.getChannelData(0);
        for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
        const dynamicSource = ctx.createBufferSource();
        dynamicSource.buffer = buf;
        this.pipeTransient(ctx, dynamicSource, startTime, duration, filterFreq, filterQ, volume);
        return;
      }

      this.pipeTransient(ctx, source, startTime, duration, filterFreq, filterQ, volume);
    } catch {
      // Noise buffer transient failure is non-fatal
    }
  }

  private pipeTransient(
    ctx: AudioContext,
    source: AudioBufferSourceNode,
    startTime: number,
    duration: number,
    filterFreq: number,
    filterQ: number,
    volume: number
  ): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(filterQ, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    this.connectToMaster(gain, ctx);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  /**
   * Swept bandpass filtered noise texture simulating seeds sliding across wood.
   */
  private playSweptNoiseTransient(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    startFreq: number,
    endFreq: number,
    filterQ: number,
    volume: number
  ): void {
    try {
      const source = ctx.createBufferSource();
      if (this.noiseBuffer) {
        source.buffer = this.noiseBuffer;
      } else {
        const size = Math.max(1, Math.floor((ctx.sampleRate || 44100) * duration));
        const buf = ctx.createBuffer(1, size, ctx.sampleRate || 44100);
        const d = buf.getChannelData(0);
        for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
        source.buffer = buf;
      }

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(startFreq, startTime);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        startTime + duration
      );
      filter.Q.setValueAtTime(filterQ, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      source.connect(filter);
      filter.connect(gain);
      this.connectToMaster(gain, ctx);

      source.start(startTime);
      source.stop(startTime + duration);
    } catch {
      // Swept noise failure is non-fatal
    }
  }
}

export const soundManager = SoundManager.getInstance();
