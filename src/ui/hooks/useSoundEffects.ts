/**
 * useSoundEffects Hook
 * Provides reactive audio controls and synthesized sound triggers for Channemane.
 */

import { useState, useCallback } from "react";
import { soundManager, type SoundEffectType } from "../audio/soundManager";

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

  const toggleMute = useCallback(() => {
    const next = soundManager.toggleMute();
    setIsMutedState(next);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    soundManager.setMuted(muted);
    setIsMutedState(muted);
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    soundManager.setSfxVolume(volume);
    setSfxVolumeState(soundManager.getSfxVolume());
  }, []);

  const playSound = useCallback((type: SoundEffectType) => {
    soundManager.playSound(type);
  }, []);

  const playSowDrop = useCallback(() => {
    soundManager.playSound("sowDrop");
  }, []);

  const playScoop = useCallback(() => {
    soundManager.playSound("scoop");
  }, []);

  const playCapture = useCallback(() => {
    soundManager.playSound("capture");
  }, []);

  const playBonusClaim = useCallback(() => {
    soundManager.playSound("bonusClaim");
  }, []);

  const playRoundSettlement = useCallback(() => {
    soundManager.playSound("roundSettlement");
  }, []);

  const playMatchVictory = useCallback(() => {
    soundManager.playSound("matchVictory");
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
