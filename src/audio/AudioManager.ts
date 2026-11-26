/**
 * Audio Manager
 * Root singleton coordinator uniting AudioSettings, MusicManager, SFXManager,
 * and AudioEventListener.
 *
 * Responsibilities:
 * - Unlocks AudioContext and Howler on user gesture.
 * - Handles browser autoplay policies and Android WebView suspend/resume.
 * - Subscribes to AudioEventListener to trigger appropriate SFX and music ducking.
 * - Provides graceful cleanup.
 */

import { Howler } from "howler";
import { AudioSettings } from "./settings/AudioSettings";
import { MusicManager } from "./music/MusicManager";
import { SFXManager } from "./sfx/SFXManager";
import { AudioEventListener, type AudioGameEvent } from "./events/AudioEventListener";
import { SFXEventMapper } from "./sfx/SFXEventMapper";
import { soundManager } from "../ui/audio/soundManager";

export class AudioManager {
  private static instance: AudioManager | null = null;
  public readonly settings: AudioSettings;
  public readonly music: MusicManager;
  public readonly sfx: SFXManager;
  public readonly events: AudioEventListener;

  private isUnlocked: boolean = false;
  private unsubscribeEvents: (() => void) | null = null;
  private unlockListenersAttached: boolean = false;

  constructor() {
    this.settings = AudioSettings.getInstance();
    this.music = new MusicManager(this.settings);
    this.sfx = new SFXManager(this.settings);
    this.events = new AudioEventListener();

    // SFX ducking coordination
    this.sfx.setDuckingCallback((durationMs) => {
      this.music.duck(0.3, durationMs);
    });

    // Wire game events to sound playback
    this.unsubscribeEvents = this.events.subscribe((event) => this.handleGameEvent(event));

    // Listen to user gestures for browser/webview unlock
    this.attachUnlockListeners();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private attachUnlockListeners(): void {
    if (typeof window === "undefined" || this.unlockListenersAttached) return;

    const unlockHandler = () => {
      this.unlockAudio();
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("touchstart", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
      this.unlockListenersAttached = false;
    };

    window.addEventListener("pointerdown", unlockHandler, { once: true, passive: true });
    window.addEventListener("touchstart", unlockHandler, { once: true, passive: true });
    window.addEventListener("keydown", unlockHandler, { once: true, passive: true });
    this.unlockListenersAttached = true;
  }

  /**
   * Resumes Howler and underlying Web Audio context after a user interaction.
   */
  public unlockAudio(): void {
    if (this.isUnlocked) return;

    try {
      // Resume Howler AudioContext
      if (Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume().catch(() => {});
      }
      // Also ensure synthetic SoundManager audio context is primed
      soundManager.getAudioContext();
      this.isUnlocked = true;
    } catch {
      // Autoplay unlock fallback
    }
  }

  /**
   * Handles confirmed game events.
   */
  private handleGameEvent(event: AudioGameEvent): void {
    this.unlockAudio();

    switch (event.type) {
      case "PIT_SELECTED":
        this.sfx.play("pitSelect");
        break;

      case "ANIMATION_EVENT": {
        const sfx = SFXEventMapper.mapAnimationEvent(event.event);
        if (sfx) {
          this.sfx.play(sfx);
        }
        break;
      }

      case "BONUS_AVAILABLE":
        this.sfx.play("bonusAvailable");
        break;

      case "BONUS_CLAIMED":
        this.sfx.play("bonusClaim");
        break;

      case "TURN_CHANGED":
        this.sfx.play("turnChange");
        break;

      case "ROUND_SETTLED":
        this.sfx.play("roundSettlement");
        break;

      case "MATCH_ENDED":
        if (event.isPlayer1Victor) {
          this.sfx.play("matchVictory");
        } else {
          this.sfx.play("matchDefeat");
        }
        break;
    }
  }

  public dispose(): void {
    if (this.unsubscribeEvents) {
      this.unsubscribeEvents();
      this.unsubscribeEvents = null;
    }
    this.events.clear();
    this.music.dispose();
    this.sfx.dispose();
  }
}

export const audioManager = AudioManager.getInstance();
