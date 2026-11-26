/**
 * Audio Settings Model & Persistence
 * Manages Master, Music, and SFX volume channels and mute states.
 * Safely persists preferences to localStorage with cross-channel volume computation.
 */

export interface AudioSettingsState {
  masterVolume: number; // 0.0 - 1.0
  musicVolume: number;  // 0.0 - 1.0
  sfxVolume: number;    // 0.0 - 1.0
  masterMuted: boolean;
  musicMuted: boolean;
  sfxMuted: boolean;
}

export type AudioSettingsListener = (state: AudioSettingsState) => void;

const STORAGE_KEYS = {
  MASTER_VOL: "channemane_audio_master_vol",
  MUSIC_VOL: "channemane_audio_music_vol",
  SFX_VOL: "channemane_audio_sfx_vol",
  MASTER_MUTE: "channemane_audio_master_mute",
  MUSIC_MUTE: "channemane_audio_music_mute",
  SFX_MUTE: "channemane_audio_sfx_mute",
} as const;

export class AudioSettings {
  private static instance: AudioSettings | null = null;
  private state: AudioSettingsState;
  private listeners: Set<AudioSettingsListener> = new Set();

  constructor() {
    this.state = this.loadSettings();
  }

  public static getInstance(): AudioSettings {
    if (!AudioSettings.instance) {
      AudioSettings.instance = new AudioSettings();
    }
    return AudioSettings.instance;
  }

  private loadSettings(): AudioSettingsState {
    const defaults: AudioSettingsState = {
      masterVolume: 1.0,
      musicVolume: 0.7,
      sfxVolume: 0.85,
      masterMuted: false,
      musicMuted: false,
      sfxMuted: false,
    };

    if (typeof window === "undefined" || !window.localStorage) {
      return defaults;
    }

    try {
      const masterVol = localStorage.getItem(STORAGE_KEYS.MASTER_VOL);
      const musicVol = localStorage.getItem(STORAGE_KEYS.MUSIC_VOL);
      const sfxVol = localStorage.getItem(STORAGE_KEYS.SFX_VOL);
      const legacySfxVol = localStorage.getItem("channemane_sfx_volume");
      const masterMute = localStorage.getItem(STORAGE_KEYS.MASTER_MUTE);
      const musicMute = localStorage.getItem(STORAGE_KEYS.MUSIC_MUTE);
      const sfxMute = localStorage.getItem(STORAGE_KEYS.SFX_MUTE);
      const legacyMute = localStorage.getItem("channemane_sound_muted");

      return {
        masterVolume: masterVol !== null ? this.clamp(parseFloat(masterVol), 0, 1) : defaults.masterVolume,
        musicVolume: musicVol !== null ? this.clamp(parseFloat(musicVol), 0, 1) : defaults.musicVolume,
        sfxVolume: sfxVol !== null
          ? this.clamp(parseFloat(sfxVol), 0, 1)
          : legacySfxVol !== null
          ? this.clamp(parseFloat(legacySfxVol), 0, 1)
          : defaults.sfxVolume,
        masterMuted: masterMute !== null ? masterMute === "true" : (legacyMute === "true" ? true : defaults.masterMuted),
        musicMuted: musicMute !== null ? musicMute === "true" : defaults.musicMuted,
        sfxMuted: sfxMute !== null ? sfxMute === "true" : defaults.sfxMuted,
      };
    } catch {
      return defaults;
    }
  }

  private clamp(val: number, min: number, max: number): number {
    if (isNaN(val)) return min;
    return Math.max(min, Math.min(max, val));
  }

  public getState(): AudioSettingsState {
    return { ...this.state };
  }

  public getEffectiveMusicVolume(): number {
    if (this.state.masterMuted || this.state.musicMuted) return 0;
    return this.state.masterVolume * this.state.musicVolume;
  }

  public getEffectiveSFXVolume(): number {
    if (this.state.masterMuted || this.state.sfxMuted) return 0;
    return this.state.masterVolume * this.state.sfxVolume;
  }

  public setMasterVolume(val: number): void {
    this.state.masterVolume = this.clamp(val, 0, 1);
    this.persist(STORAGE_KEYS.MASTER_VOL, this.state.masterVolume.toString());
    this.notify();
  }

  public setMusicVolume(val: number): void {
    this.state.musicVolume = this.clamp(val, 0, 1);
    this.persist(STORAGE_KEYS.MUSIC_VOL, this.state.musicVolume.toString());
    this.notify();
  }

  public setSFXVolume(val: number): void {
    this.state.sfxVolume = this.clamp(val, 0, 1);
    this.persist(STORAGE_KEYS.SFX_VOL, this.state.sfxVolume.toString());
    this.persist("channemane_sfx_volume", this.state.sfxVolume.toString());
    this.notify();
  }

  public setMasterMuted(muted: boolean): void {
    this.state.masterMuted = muted;
    this.persist(STORAGE_KEYS.MASTER_MUTE, muted ? "true" : "false");
    this.persist("channemane_sound_muted", muted ? "true" : "false");
    this.notify();
  }

  public toggleMasterMute(): boolean {
    this.setMasterMuted(!this.state.masterMuted);
    return this.state.masterMuted;
  }

  public setMusicMuted(muted: boolean): void {
    this.state.musicMuted = muted;
    this.persist(STORAGE_KEYS.MUSIC_MUTE, muted ? "true" : "false");
    this.notify();
  }

  public toggleMusicMute(): boolean {
    this.setMusicMuted(!this.state.musicMuted);
    return this.state.musicMuted;
  }

  public setSFXMuted(muted: boolean): void {
    this.state.sfxMuted = muted;
    this.persist(STORAGE_KEYS.SFX_MUTE, muted ? "true" : "false");
    this.notify();
  }

  public toggleSFXMute(): boolean {
    this.setSFXMuted(!this.state.sfxMuted);
    return this.state.sfxMuted;
  }

  public subscribe(listener: AudioSettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const copy = this.getState();
    for (const listener of this.listeners) {
      listener(copy);
    }
  }

  private persist(key: string, value: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // localStorage write error ignored
      }
    }
  }
}
