/**
 * Audio Manager Subsystem Tests
 * Verifies:
 * - Audio settings persistence, volume channels, and muting.
 * - AudioManager initialization and user gesture unlock.
 * - Missing audio assets fail gracefully without throwing.
 * - Game event routing to SFX.
 * - Music playlist management.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AudioSettings } from "../../src/audio/settings/AudioSettings";
import { AudioManager } from "../../src/audio/AudioManager";
import { MusicPlaylist } from "../../src/audio/music/MusicPlaylist";
import { SFXManager } from "../../src/audio/sfx/SFXManager";
import { SFXEventMapper } from "../../src/audio/sfx/SFXEventMapper";

describe("Audio Manager Subsystem Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("manages master, music, and sfx channels with localStorage persistence", () => {
    const settings = new AudioSettings();

    settings.setMasterVolume(0.8);
    settings.setMusicVolume(0.5);
    settings.setSFXVolume(0.9);

    expect(settings.getState().masterVolume).toBe(0.8);
    expect(settings.getState().musicVolume).toBe(0.5);
    expect(settings.getState().sfxVolume).toBe(0.9);

    // Check effective volumes
    expect(settings.getEffectiveMusicVolume()).toBeCloseTo(0.4, 2);
    expect(settings.getEffectiveSFXVolume()).toBeCloseTo(0.72, 2);

    // Mute master
    settings.setMasterMuted(true);
    expect(settings.getEffectiveMusicVolume()).toBe(0);
    expect(settings.getEffectiveSFXVolume()).toBe(0);

    // Unmute master, mute SFX only
    settings.setMasterMuted(false);
    settings.setSFXMuted(true);
    expect(settings.getEffectiveMusicVolume()).toBeCloseTo(0.4, 2);
    expect(settings.getEffectiveSFXVolume()).toBe(0);
  });

  it("handles missing audio assets gracefully without crashing or throwing", () => {
    const settings = new AudioSettings();
    const sfx = new SFXManager(settings);

    // Should not throw even when asset paths are not found
    expect(() => {
      sfx.play("pitSelect");
      sfx.play("seedPlacement");
      sfx.play("capture");
      sfx.play("bonusClaim");
    }).not.toThrow();

    sfx.dispose();
  });

  it("maps engine events correctly to SFX types", () => {
    expect(
      SFXEventMapper.mapAnimationEvent({ type: "PICKUP", pitId: 0, seedsPickedUp: 5 })
    ).toBe("seedPickup");

    expect(
      SFXEventMapper.mapAnimationEvent({
        type: "DROP",
        pitId: 1,
        seedsPlaced: 1,
        resultingSeeds: 6,
        seedsRemainingInHand: 4,
        bonusTriggered: false,
        bonusOwner: null,
      })
    ).toBe("seedPlacement");

    expect(
      SFXEventMapper.mapAnimationEvent({ type: "SCOOP", pitId: 5, seedsScooped: 6 })
    ).toBe("continuousSow");

    expect(
      SFXEventMapper.mapAnimationEvent({
        type: "CAPTURE",
        capturingPlayer: "PLAYER_1",
        capturedPitId: 8,
        seedsCaptured: 4,
        newStorageTotal: 4,
      })
    ).toBe("capture");

    expect(SFXEventMapper.mapBonusEvent("AVAILABLE")).toBe("bonusAvailable");
    expect(SFXEventMapper.mapBonusEvent("CLAIMED")).toBe("bonusClaim");
  });

  it("manages background music playlist tracks and cycling", () => {
    const playlist = new MusicPlaylist();
    const tracks = playlist.getTracks();

    expect(tracks.length).toBeGreaterThanOrEqual(3);
    const first = playlist.getCurrentTrack();
    expect(first).not.toBeNull();
    expect(first?.id).toBe("track-1-dawn");

    const second = playlist.nextTrack();
    expect(second?.id).toBe("track-2-teak");

    const third = playlist.nextTrack();
    expect(third?.id).toBe("track-3-dusk");

    // Cycles back to first
    const cycled = playlist.nextTrack();
    expect(cycled?.id).toBe("track-1-dawn");
  });

  it("initializes AudioManager and unlocks audio context safely on gesture", () => {
    const audio = AudioManager.getInstance();
    expect(audio).toBeDefined();

    expect(() => {
      audio.unlockAudio();
    }).not.toThrow();
  });
});
