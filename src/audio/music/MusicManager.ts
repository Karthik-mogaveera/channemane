/**
 * Music Manager
 * Orchestrates background music playback, playlist cycling, crossfading,
 * ducking, and settings integration using Howler.
 * Never claims music is playing if audio assets are missing or fail to load.
 */

import { Howl } from "howler";
import { MusicPlaylist, type MusicTrack } from "./MusicPlaylist";
import { MusicTransitions } from "./MusicTransitions";
import { AudioSettings } from "../settings/AudioSettings";

export class MusicManager {
  private playlist: MusicPlaylist;
  private settings: AudioSettings;
  private currentHowl: Howl | null = null;
  private currentTrack: MusicTrack | null = null;
  private isPlaying: boolean = false;
  private hasTrackLoaded: boolean = false;
  private duckHandle: { cancel: () => void } | null = null;

  constructor(settings?: AudioSettings) {
    this.playlist = new MusicPlaylist();
    this.settings = settings || AudioSettings.getInstance();
    this.settings.subscribe(() => this.onSettingsChanged());
  }

  public getPlaylist(): MusicPlaylist {
    return this.playlist;
  }

  public getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying && this.hasTrackLoaded;
  }

  /**
   * Plays the current track or a specified track.
   * If assets are absent or load fails, it fails gracefully without throwing.
   */
  public play(trackId?: string): void {
    const track = trackId
      ? this.playlist.selectTrack(trackId)
      : this.playlist.getCurrentTrack();

    if (!track) return;

    const effectiveVol = this.settings.getEffectiveMusicVolume();

    // If same track is already loaded and paused, just resume
    if (this.currentTrack?.id === track.id && this.currentHowl) {
      if (!this.isPlaying && this.hasTrackLoaded) {
        this.currentHowl.volume(effectiveVol);
        this.currentHowl.play();
        this.isPlaying = true;
      }
      return;
    }

    // Creating new Howl instance for target track
    const oldHowl = this.currentHowl;
    this.currentTrack = track;
    this.hasTrackLoaded = false;

    try {
      const newHowl = new Howl({
        src: track.sources,
        html5: true, // Use HTML5 Audio for long ambient music streams to conserve memory
        loop: true,
        volume: 0,
        onload: () => {
          this.hasTrackLoaded = true;
          this.isPlaying = true;
          MusicTransitions.crossFade(oldHowl, newHowl, this.settings.getEffectiveMusicVolume());
        },
        onloaderror: (_id, _error) => {
          this.hasTrackLoaded = false;
          this.isPlaying = false;
          // Documented graceful absence: track files not on disk yet
        },
        onplayerror: (_id, _error) => {
          this.isPlaying = false;
          newHowl.once("unlock", () => {
            if (this.isPlaying) {
              newHowl.play();
            }
          });
        },
      });

      this.currentHowl = newHowl;
    } catch {
      this.isPlaying = false;
      this.hasTrackLoaded = false;
    }
  }

  public pause(): void {
    if (this.currentHowl && this.isPlaying) {
      this.currentHowl.pause();
      this.isPlaying = false;
    }
  }

  public stop(): void {
    if (this.currentHowl) {
      this.currentHowl.stop();
      this.isPlaying = false;
    }
  }

  public next(): void {
    const nextTrack = this.playlist.nextTrack();
    if (nextTrack) {
      this.play(nextTrack.id);
    }
  }

  public prev(): void {
    const prevTrack = this.playlist.prevTrack();
    if (prevTrack) {
      this.play(prevTrack.id);
    }
  }

  public duck(factor: number = 0.35, holdMs: number = 1200): void {
    if (this.duckHandle) {
      this.duckHandle.cancel();
      this.duckHandle = null;
    }
    const effectiveVol = this.settings.getEffectiveMusicVolume();
    this.duckHandle = MusicTransitions.duck(this.currentHowl, effectiveVol, factor, holdMs);
  }

  private onSettingsChanged(): void {
    const effectiveVol = this.settings.getEffectiveMusicVolume();
    if (this.currentHowl && this.isPlaying && this.hasTrackLoaded) {
      this.currentHowl.volume(effectiveVol);
    }
  }

  public dispose(): void {
    if (this.duckHandle) {
      this.duckHandle.cancel();
      this.duckHandle = null;
    }
    if (this.currentHowl) {
      try {
        this.currentHowl.unload();
      } catch {}
      this.currentHowl = null;
    }
    this.isPlaying = false;
    this.hasTrackLoaded = false;
  }
}
