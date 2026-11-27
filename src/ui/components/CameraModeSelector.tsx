/**
 * Segmented Camera View Selector Control for 3D Board
 * Allows switching seamlessly between Side, Top, and 360° Orbit modes
 * using the warm ivory and walnut Channemane theme.
 */

import React from "react";
import type { BoardCameraMode } from "../../three/scene/BoardCamera";

export interface CameraModeSelectorProps {
  value: BoardCameraMode;
  onChange: (mode: BoardCameraMode) => void;
  className?: string;
}

interface CameraModeOption {
  mode: BoardCameraMode;
  label: string;
  testId: string;
  ariaLabel: string;
}

const CAMERA_MODE_OPTIONS: readonly CameraModeOption[] = [
  {
    mode: "SIDE",
    label: "Side",
    testId: "camera-mode-side",
    ariaLabel: "Side camera view",
  },
  {
    mode: "TOP",
    label: "Top",
    testId: "camera-mode-top",
    ariaLabel: "Top overhead camera view",
  },
  {
    mode: "ORBIT",
    label: "360°",
    testId: "camera-mode-orbit",
    ariaLabel: "360 degree orbit camera view",
  },
];

export const CameraModeSelector: React.FC<CameraModeSelectorProps> = React.memo(
  ({ value, onChange, className = "" }) => {
    return (
      <div
        className={`camera-mode-selector ${className}`.trim()}
        role="group"
        aria-label="3D Camera View"
        data-testid="camera-mode-selector"
      >
        {CAMERA_MODE_OPTIONS.map((option) => {
          const isSelected = value === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              className={`camera-mode-btn${isSelected ? " is-active" : ""}`}
              onClick={() => {
                if (option.mode !== value) {
                  onChange(option.mode);
                }
              }}
              aria-pressed={isSelected}
              aria-label={option.ariaLabel}
              data-testid={option.testId}
              data-camera-mode={option.mode}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }
);

CameraModeSelector.displayName = "CameraModeSelector";
