/**
 * SFX Manager
 * Plays sound effects via Howler with anti-fatigue pitch variation,
 * concurrent voice throttling, and fallback to Web Audio synthesis.
 */

import { Howl } from "howler";
import { SFX_REGISTRY, type SFXType } from "./SFXRegistry";
import { AudioSettings } from "../settings/AudioSettings";

export class SFXManager {
  private settings: AudioSettings;
  private soundInstances: Map<SFXType, Howl> = new Map();
  private failedAssets: Set<SFXType> = new Set();
  private activeVoices: Map<SFXType, number> = new Map();
  private lastPlayTime: Map<SFXType, number> = new Map();
  private onDuckingNeeded?: (durationMs: number) => void;

  constructor(settings?: AudioSettings) {
    this.settings = settings || AudioSettings.getInstance();
    this.prepopulateHowls();
  }

  public setDuckingCallback(cb: (durationMs: number) => void): void {
    this.onDuckingNeeded = cb;
  }

  private prepopulateHowls(): void {
    if (typeof window === "undefined") return;

    for (const [id, config] of Object.entries(SFX_REGISTRY)) {
      const sfxType = id as SFXType;
      try {
        const howl = new Howl({
          src: config.sources,
          volume: config.volumeScale,
          onloaderror: () => {
            this.failedAssets.add(sfxType);
          },
        });
        this.soundInstances.set(sfxType, howl);
      } catch {
        this.failedAssets.add(sfxType);
      }
    }
  }

  /**
   * Plays a sound effect by type.
   * Uses Howler if assets are available; seamlessly falls back to synthesized audio.
   */
  public play(type: SFXType, options?: { pitchRate?: number }): void {
    const effectiveVol = this.settings.getEffectiveSFXVolume();
    if (effectiveVol <= 0) return;

    const config = SFX_REGISTRY[type];
    if (!config) return;

    const now = Date.now();
    const lastTime = this.lastPlayTime.get(type) || 0;

    // Minimum throttle interval for rapid identical sounds (e.g., 30ms for seed placement)
    if (now - lastTime < 30) {
      return;
    }
    this.lastPlayTime.set(type, now);

    // Ducking trigger
    if (config.duckMusic && this.onDuckingNeeded) {
      this.onDuckingNeeded(1200);
    }

    const currentVoiceCount = this.activeVoices.get(type) || 0;
    if (currentVoiceCount >= config.maxSimultaneous) {
      // Drop voice to avoid overload
      return;
    }

    const howl = this.soundInstances.get(type);
    const hasFailed = this.failedAssets.has(type);

    if (howl && !hasFailed && howl.state() === "loaded") {
      try {
        this.activeVoices.set(type, currentVoiceCount + 1);

        // Anti-fatigue pitch variation (+/- 6%)
        const randomPitch = options?.pitchRate ?? (0.94 + Math.random() * 0.12);
        const soundId = howl.play();
        howl.rate(randomPitch, soundId);
        howl.volume(effectiveVol * config.volumeScale, soundId);

        howl.once("end", () => {
          const v = this.activeVoices.get(type) || 1;
          this.activeVoices.set(type, Math.max(0, v - 1));
        }, soundId);
        return;
      } catch {
        this.failedAssets.add(type);
      }
    }

    // Fallback to organic synthesized audio
    try {
      config.synthesizedFallback();
    } catch {
      // Silent error handling
    }
  }

  public dispose(): void {
    for (const howl of this.soundInstances.values()) {
      try {
        howl.unload();
      } catch {}
    }
    this.soundInstances.clear();
    this.activeVoices.clear();
  }
}
