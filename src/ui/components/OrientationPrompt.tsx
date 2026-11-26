/**
 * Portrait Orientation Blocking Screen Component
 * Displayed on mobile devices when in portrait mode.
 * Instructs the user to rotate to landscape while completely preventing
 * interaction with the underlying game board and preserving state.
 */

import React from "react";

export const OrientationPrompt: React.FC = () => {
  return (
    <div
      className="orientation-prompt-overlay"
      data-testid="orientation-prompt-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label="Rotate Your Device"
    >
      <div className="orientation-prompt-card">
        {/* Animated Phone Rotation Icon */}
        <div className="orientation-icon-wrapper" aria-hidden="true">
          <svg
            className="rotate-phone-svg"
            viewBox="0 0 100 100"
            width="80"
            height="80"
          >
            {/* Phone outline */}
            <rect
              x="28"
              y="15"
              width="44"
              height="70"
              rx="8"
              ry="8"
              fill="none"
              stroke="var(--color-walnut, #6F5038)"
              strokeWidth="3.5"
            />
            {/* Screen inner area */}
            <rect
              x="33"
              y="23"
              width="34"
              height="54"
              rx="3"
              ry="3"
              fill="rgba(111, 80, 56, 0.12)"
            />
            {/* Home indicator bar */}
            <line
              x1="44"
              y1="80"
              x2="56"
              y2="80"
              stroke="var(--color-walnut, #6F5038)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Circular rotating arrow */}
            <path
              d="M 16 50 A 34 34 0 0 1 76 22"
              fill="none"
              stroke="var(--color-sage-border, #5D6D50)"
              strokeWidth="3"
              strokeDasharray="4 2"
            />
            <polygon points="74,15 84,24 74,31" fill="var(--color-sage-border, #5D6D50)" />
          </svg>
        </div>

        <h2 className="orientation-title">Rotate Your Device</h2>
        <p className="orientation-message">
          Channemane is best played in landscape mode. Please rotate your phone to continue.
        </p>

        <div className="orientation-pill">
          <span>🔄 Landscape Orientation Required</span>
        </div>
      </div>
    </div>
  );
};
