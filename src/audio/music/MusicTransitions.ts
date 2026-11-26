/**
 * Music Transitions & Ducking
 * Coordinates cross-fades and smooth volume attenuation for cinematic sound balance.
 */

import type { Howl } from "howler";

export class MusicTransitions {
  /**
   * Smoothly cross-fades between two active Howl instances.
   */
  public static crossFade(
    fromHowl: Howl | null,
    toHowl: Howl,
    targetVolume: number,
    durationMs: number = 1500
  ): void {
    if (fromHowl && fromHowl.playing()) {
      const currentVol = fromHowl.volume() as number;
      fromHowl.fade(currentVol, 0, durationMs);
      setTimeout(() => {
        try {
          fromHowl.stop();
        } catch {}
      }, durationMs + 50);
    }

    toHowl.volume(0);
    toHowl.play();
    toHowl.fade(0, targetVolume, durationMs);
  }

  /**
   * Temporarily ducks the current music track volume for high-impact SFX (capture, victory).
   */
  public static duck(
    howl: Howl | null,
    baseVolume: number,
    duckFactor: number = 0.35,
    holdMs: number = 1200
  ): { cancel: () => void } {
    if (!howl || !howl.playing() || baseVolume <= 0) {
      return { cancel: () => {} };
    }

    const duckedVolume = baseVolume * duckFactor;
    howl.fade(baseVolume, duckedVolume, 250);

    const timeout = setTimeout(() => {
      if (howl && howl.playing()) {
        howl.fade(duckedVolume, baseVolume, 600);
      }
    }, holdMs);

    return {
      cancel: () => {
        clearTimeout(timeout);
        if (howl && howl.playing()) {
          howl.volume(baseVolume);
        }
      },
    };
  }
}
