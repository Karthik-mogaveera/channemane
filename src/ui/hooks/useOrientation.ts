/**
 * Hook for detecting viewport orientation and mobile devices.
 * Uses matchMedia("(orientation: portrait)") and touch / viewport heuristics.
 * Ensures desktop and laptop viewports are never blocked falsely.
 */

import { useState, useEffect } from "react";

export interface OrientationState {
  /** True if the device is a mobile or tablet device in portrait orientation */
  isPortraitBlocked: boolean;
  /** Raw matchMedia portrait result */
  isPortrait: boolean;
  /** True if the user's device is identified as a mobile/tablet touch device */
  isMobileDevice: boolean;
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return { isPortraitBlocked: false, isPortrait: false, isMobileDevice: false };
    }

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    // Mobile touch device heuristic:
    // primary pointer is coarse OR maxTouchPoints > 0 with screen dimension <= 1024px
    const hasTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
    const isMobileWidth = Math.min(window.innerWidth, window.innerHeight) <= 1024;
    const isMobileDevice = hasTouch && isMobileWidth;

    return {
      isPortrait,
      isMobileDevice,
      isPortraitBlocked: isPortrait && isMobileDevice,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const portraitQuery = window.matchMedia("(orientation: portrait)");

    const updateOrientation = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const hasTouch =
        window.matchMedia("(pointer: coarse)").matches ||
        (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
      const isMobileWidth = Math.min(window.innerWidth, window.innerHeight) <= 1024;
      const isMobileDevice = hasTouch && isMobileWidth;

      setState((prev) => {
        const isPortraitBlocked = isPortrait && isMobileDevice;
        if (
          prev.isPortrait === isPortrait &&
          prev.isMobileDevice === isMobileDevice &&
          prev.isPortraitBlocked === isPortraitBlocked
        ) {
          return prev;
        }
        return { isPortrait, isMobileDevice, isPortraitBlocked };
      });
    };

    // Attempt native screen orientation lock to landscape if available and permitted
    const tryLockOrientation = async () => {
      try {
        if (
          typeof screen !== "undefined" &&
          screen.orientation &&
          "lock" in screen.orientation
        ) {
          // screen.orientation.lock("landscape") returns a promise
          // Note: In browsers, this often requires fullscreen or installed PWA; safely catch error.
          await (screen.orientation as any).lock("landscape").catch(() => {});
        }
      } catch {
        // Ignored safely
      }
    };

    tryLockOrientation();

    portraitQuery.addEventListener("change", updateOrientation);
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      portraitQuery.removeEventListener("change", updateOrientation);
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  return state;
}
