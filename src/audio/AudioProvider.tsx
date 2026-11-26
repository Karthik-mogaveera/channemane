/**
 * Audio Provider & Context
 * Provides React components with reactive audio settings and controls.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { audioManager } from "./AudioManager";
import type { AudioSettingsState } from "./settings/AudioSettings";
import type { SFXType } from "./sfx/SFXRegistry";
import type { MusicTrack } from "./music/MusicPlaylist";

export interface AudioContextValue {
  settings: AudioSettingsState;
  setMasterVolume: (vol: number) => void;
  setMusicVolume: (vol: number) => void;
  setSFXVolume: (vol: number) => void;
  toggleMasterMute: () => boolean;
  toggleMusicMute: () => boolean;
  toggleSFXMute: () => boolean;
  playSFX: (type: SFXType) => void;
  currentTrack: MusicTrack | null;
  isPlayingMusic: boolean;
  playMusic: (trackId?: string) => void;
  pauseMusic: () => void;
  nextMusicTrack: () => void;
  prevMusicTrack: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AudioSettingsState>(() =>
    audioManager.settings.getState()
  );
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(() =>
    audioManager.music.getCurrentTrack()
  );
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(() =>
    audioManager.music.getIsPlaying()
  );

  useEffect(() => {
    const unsub = audioManager.settings.subscribe((next) => {
      setSettings(next);
      setIsPlayingMusic(audioManager.music.getIsPlaying());
    });
    return unsub;
  }, []);

  const value: AudioContextValue = {
    settings,
    setMasterVolume: (v) => audioManager.settings.setMasterVolume(v),
    setMusicVolume: (v) => audioManager.settings.setMusicVolume(v),
    setSFXVolume: (v) => audioManager.settings.setSFXVolume(v),
    toggleMasterMute: () => audioManager.settings.toggleMasterMute(),
    toggleMusicMute: () => audioManager.settings.toggleMusicMute(),
    toggleSFXMute: () => audioManager.settings.toggleSFXMute(),
    playSFX: (type) => audioManager.sfx.play(type),
    currentTrack,
    isPlayingMusic,
    playMusic: (id) => {
      audioManager.music.play(id);
      setCurrentTrack(audioManager.music.getCurrentTrack());
      setIsPlayingMusic(audioManager.music.getIsPlaying());
    },
    pauseMusic: () => {
      audioManager.music.pause();
      setIsPlayingMusic(false);
    },
    nextMusicTrack: () => {
      audioManager.music.next();
      setCurrentTrack(audioManager.music.getCurrentTrack());
      setIsPlayingMusic(audioManager.music.getIsPlaying());
    },
    prevMusicTrack: () => {
      audioManager.music.prev();
      setCurrentTrack(audioManager.music.getCurrentTrack());
      setIsPlayingMusic(audioManager.music.getIsPlaying());
    },
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    // Graceful fallback if invoked outside AudioProvider
    return {
      settings: audioManager.settings.getState(),
      setMasterVolume: (v) => audioManager.settings.setMasterVolume(v),
      setMusicVolume: (v) => audioManager.settings.setMusicVolume(v),
      setSFXVolume: (v) => audioManager.settings.setSFXVolume(v),
      toggleMasterMute: () => audioManager.settings.toggleMasterMute(),
      toggleMusicMute: () => audioManager.settings.toggleMusicMute(),
      toggleSFXMute: () => audioManager.settings.toggleSFXMute(),
      playSFX: (type) => audioManager.sfx.play(type),
      currentTrack: audioManager.music.getCurrentTrack(),
      isPlayingMusic: audioManager.music.getIsPlaying(),
      playMusic: (id) => audioManager.music.play(id),
      pauseMusic: () => audioManager.music.pause(),
      nextMusicTrack: () => audioManager.music.next(),
      prevMusicTrack: () => audioManager.music.prev(),
    };
  }
  return ctx;
}
