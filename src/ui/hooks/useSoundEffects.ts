/**
 * useSoundEffects Hook
 * Provides reactive audio controls and synthesized sound triggers for Channemane.
 */

import { useState, useCallback, useEffect } from "react";
import { soundManager, type SoundEffectType } from "../audio/soundManager";
import { audioManager } from "../../audio/AudioManager";

export interface SoundEffectsHook {
  isMuted: boolean;
  sfxVolume: number;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setSfxVolume: (volume: number) => void;
  playSound: (type: SoundEffectType) => void;
  playSowDrop: () => void;
  playScoop: () => void;
  playCapture: () => void;
  playBonusClaim: () => void;
  playRoundSettlement: () => void;
  playMatchVictory: () => void;
}

export function useSoundEffects(): SoundEffectsHook {
  const [isMuted, setIsMutedState] = useState<boolean>(() =>
    soundManager.isSoundMuted()
  );
  const [sfxVolume, setSfxVolumeState] = useState<number>(() =>
    soundManager.getSfxVolume()
  );

  // Synchronize state with audioManager settings
  useEffect(() => {
    const unsub = audioManager.settings.subscribe((state) => {
      setIsMutedState(state.sfxMuted || state.masterMuted);
      setSfxVolumeState(state.sfxVolume);
    });
    return unsub;
  }, []);

  const toggleMute = useCallback(() => {
    const next = soundManager.toggleMute();
    audioManager.settings.setMasterMuted(next);
    audioManager.settings.setSFXMuted(next);
    setIsMutedState(next);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    soundManager.setMuted(muted);
    audioManager.settings.setMasterMuted(muted);
    audioManager.settings.setSFXMuted(muted);
    setIsMutedState(muted);
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    soundManager.setSfxVolume(volume);
    audioManager.settings.setSFXVolume(volume);
    setSfxVolumeState(soundManager.getSfxVolume());
  }, []);

  const playSound = useCallback((type: SoundEffectType) => {
    audioManager.unlockAudio();
    soundManager.playSound(type);
  }, []);

  const playSowDrop = useCallback(() => {
    audioManager.unlockAudio();
    audioManager.sfx.play("seedPlacement");
  }, []);

  const playScoop = useCallback(() => {
    audioManager.unlockAudio();
    audioManager.sfx.play("continuousSow");
  }, []);

  const playCapture = useCallback(() => {
    audioManager.unlockAudio();
    audioManager.sfx.play("capture");
  }, []);

  const playBonusClaim = useCallback(() => {
    audioManager.unlockAudio();
    audioManager.sfx.play("bonusClaim");
  }, []);

  const playRoundSettlement = useCallback(() => {
    audioManager.unlockAudio();
    audioManager.sfx.play("roundSettlement");
  }, []);

  const playMatchVictory = useCallback(() => {
    audioManager.unlockAudio();
    audioManager.sfx.play("matchVictory");
  }, []);

  return {
    isMuted,
    sfxVolume,
    toggleMute,
    setMuted,
    setSfxVolume,
    playSound,
    playSowDrop,
    playScoop,
    playCapture,
    playBonusClaim,
    playRoundSettlement,
    playMatchVictory,
  };
}
