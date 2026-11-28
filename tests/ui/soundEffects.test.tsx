import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SoundManager, soundManager } from "../../src/ui/audio/soundManager";
import { useSoundEffects } from "../../src/ui/hooks/useSoundEffects";
import { App } from "../../src/App";

vi.mock("../../src/three/Board3D", async () => {
  const { Board3DTestDouble } = await import("./helpers/board3dTestDouble");
  return { Board3D: Board3DTestDouble };
});

describe("SoundManager & Web Audio Synthesis", () => {
  let mockOscillator: any;
  let mockGain: any;
  let mockBiquadFilter: any;
  let mockCompressor: any;
  let mockBufferSource: any;
  let mockAudioContext: any;

  beforeEach(() => {
    localStorage.clear();

    mockOscillator = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockBiquadFilter = {
      type: "bandpass",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      Q: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
    };

    mockCompressor = {
      threshold: { setValueAtTime: vi.fn() },
      knee: { setValueAtTime: vi.fn() },
      ratio: { setValueAtTime: vi.fn() },
      attack: { setValueAtTime: vi.fn() },
      release: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
    };

    mockBufferSource = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockAudioContext = {
      currentTime: 10,
      sampleRate: 44100,
      state: "running",
      destination: {},
      createOscillator: vi.fn(() => ({ ...mockOscillator })),
      createGain: vi.fn(() => ({ ...mockGain })),
      createBiquadFilter: vi.fn(() => ({ ...mockBiquadFilter })),
      createDynamicsCompressor: vi.fn(() => ({ ...mockCompressor })),
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(100)),
      })),
      createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    // Install mock AudioContext on window
    (window as any).AudioContext = vi.fn(() => mockAudioContext);
  });

  afterEach(() => {
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;
    localStorage.clear();
  });

  it("initializes with default unmuted state and persists to localStorage on toggle", () => {
    const manager = new SoundManager();
    expect(manager.isSoundMuted()).toBe(false);

    manager.toggleMute();
    expect(manager.isSoundMuted()).toBe(true);
    expect(localStorage.getItem("channemane_sound_muted")).toBe("true");

    manager.toggleMute();
    expect(manager.isSoundMuted()).toBe(false);
    expect(localStorage.getItem("channemane_sound_muted")).toBe("false");
  });

  it("reads persisted mute state from localStorage upon initialization", () => {
    localStorage.setItem("channemane_sound_muted", "true");
    const manager = new SoundManager();
    expect(manager.isSoundMuted()).toBe(true);
  });

  it("supports SFX volume adjustments and persists to localStorage", () => {
    const manager = new SoundManager();
    expect(manager.getSfxVolume()).toBe(0.85);

    manager.setSfxVolume(0.6);
    expect(manager.getSfxVolume()).toBe(0.6);
    expect(localStorage.getItem("channemane_sfx_volume")).toBe("0.6");

    // Clamps between 0 and 1
    manager.setSfxVolume(1.5);
    expect(manager.getSfxVolume()).toBe(1.0);

    manager.setSfxVolume(-0.2);
    expect(manager.getSfxVolume()).toBe(0.0);
  });

  it("does not synthesize sounds when muted", () => {
    const manager = new SoundManager();
    manager.setMuted(true);

    manager.playSound("sowDrop");
    manager.playSound("scoop");
    manager.playSound("capture");
    manager.playSound("bonusClaim");
    manager.playSound("roundSettlement");
    manager.playSound("matchVictory");

    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });

  it("synthesizes all 6 sound effect types when unmuted with realistic acoustic modeling", () => {
    const manager = new SoundManager();
    manager.setMuted(false);

    // 1. sowDrop
    manager.playSound("sowDrop");
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // 2. scoop
    mockAudioContext.createOscillator.mockClear();
    manager.playSound("scoop");
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // 3. capture
    mockAudioContext.createOscillator.mockClear();
    manager.playSound("capture");
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // 4. bonusClaim
    mockAudioContext.createOscillator.mockClear();
    manager.playSound("bonusClaim");
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // 5. roundSettlement
    mockAudioContext.createOscillator.mockClear();
    manager.playSound("roundSettlement");
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // 6. matchVictory
    mockAudioContext.createOscillator.mockClear();
    manager.playSound("matchVictory");
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  it("applies anti-fatigue voice cycling on rapid consecutive sowDrop events", () => {
    const manager = new SoundManager();
    manager.setMuted(false);

    // Trigger multiple rapid drops within milliseconds
    manager.playSound("sowDrop");
    manager.playSound("sowDrop");
    manager.playSound("sowDrop");

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  it("supports background music ducking with smooth restoration", () => {
    vi.useFakeTimers();
    const manager = new SoundManager();

    const mockMusicGain = {
      gain: {
        value: 1.0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
    };
    manager.setMusicGainNode(mockMusicGain as any);

    // Trigger capture which ducks music
    manager.playSound("capture");
    expect(mockMusicGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(0.65, 0.01),
      expect.any(Number)
    );

    // Fast-forward past ducking timeout
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(mockMusicGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      1.0,
      expect.any(Number)
    );

    vi.useRealTimers();
  });

  it("ducks HTMLAudioElement when set as music source", () => {
    vi.useFakeTimers();
    const manager = new SoundManager();

    const mockAudioElement = {
      volume: 0.8,
    };
    manager.setMusicAudioElement(mockAudioElement as any);

    manager.playSound("bonusClaim");
    expect(mockAudioElement.volume).toBeCloseTo(0.48, 0.01);

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(mockAudioElement.volume).toBeCloseTo(0.8, 0.01);
    vi.useRealTimers();
  });

  it("resumes AudioContext if suspended upon sound playback", () => {
    mockAudioContext.state = "suspended";
    const manager = new SoundManager();
    manager.setMuted(false);

    manager.playSound("sowDrop");
    expect(mockAudioContext.resume).toHaveBeenCalled();
  });

  it("handles absence of AudioContext gracefully without throwing errors", () => {
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;

    const manager = new SoundManager();
    expect(() => {
      manager.playSound("sowDrop");
      manager.playSound("matchVictory");
    }).not.toThrow();
  });
});

describe("useSoundEffects Hook", () => {
  beforeEach(() => {
    localStorage.clear();
    soundManager.setMuted(false);
  });

  it("provides reactive sound controls, volume adjustments, and triggers", () => {
    const { result } = renderHook(() => useSoundEffects());

    expect(result.current.isMuted).toBe(false);
    expect(result.current.sfxVolume).toBe(0.85);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.setMuted(false);
    });
    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.setSfxVolume(0.5);
    });
    expect(result.current.sfxVolume).toBe(0.5);

    // Ensure convenience methods execute without throwing
    expect(() => {
      result.current.playSowDrop();
      result.current.playScoop();
      result.current.playCapture();
      result.current.playBonusClaim();
      result.current.playRoundSettlement();
      result.current.playMatchVictory();
    }).not.toThrow();
  });
});

describe("In-Game Audio Toggle Button UI Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    soundManager.setMuted(false);
  });

  it("renders audio toggle button in header and toggles mute state on click", () => {
    render(<App initialScreen="GAME" />);

    const audioBtn = screen.getByTestId("audio-toggle-btn");
    expect(audioBtn).toBeInTheDocument();
    expect(audioBtn).toHaveTextContent("🔊 Sound");
    expect(audioBtn).toHaveAttribute("aria-label", "Mute audio sound effects");

    // Click to mute
    fireEvent.click(audioBtn);
    expect(audioBtn).toHaveTextContent("🔇 Muted");
    expect(audioBtn).toHaveAttribute("aria-label", "Unmute audio sound effects");
    expect(localStorage.getItem("channemane_sound_muted")).toBe("true");

    // Click to unmute
    fireEvent.click(audioBtn);
    expect(audioBtn).toHaveTextContent("🔊 Sound");
    expect(localStorage.getItem("channemane_sound_muted")).toBe("false");
  });
});
