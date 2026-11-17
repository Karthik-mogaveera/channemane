/**
 * Theme Selection Modal Component
 * Displays selectable visual themes: Royal Heritage Theme and Earth & Nature Theme.
 * Features palette swatches, visual previews, active badges, and immediate switching.
 */

import React, { useEffect, useCallback } from "react";
import type { AppTheme } from "../theme/theme";
import { NATURE_PALETTE, ROYAL_PALETTE } from "../theme/theme";

export interface ThemeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
}

export const ThemeSelectModal: React.FC<ThemeSelectModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleSelect = (theme: AppTheme) => {
    onSelectTheme(theme);
    onClose();
  };

  return (
    <div
      className="modal-overlay theme-modal-overlay"
      data-testid="theme-select-modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div
        className="modal-content theme-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header theme-modal-header">
          <div className="theme-modal-header-text">
            <h2 id="theme-modal-title" className="modal-title theme-modal-title">
              🎨 Board &amp; Game Themes
            </h2>
            <p className="theme-modal-subtitle">
              Choose your preferred visual aesthetic for the entire game
            </p>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close Theme Selection"
            data-testid="close-theme-modal-btn"
          >
            ✕
          </button>
        </div>

        {/* Theme Options Grid */}
        <div className="theme-cards-grid" role="radiogroup" aria-label="Available visual themes">
          {/* Card 1: Royal Theme */}
          <div
            className={`theme-card ${currentTheme === "royal" ? "selected" : ""}`}
            onClick={() => handleSelect("royal")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect("royal");
              }
            }}
            tabIndex={0}
            role="radio"
            aria-checked={currentTheme === "royal"}
            data-testid="theme-card-royal"
            aria-label="Select Royal Theme"
          >
            <div className="theme-card-header">
              <div className="theme-card-title-group">
                <span className="theme-card-icon" aria-hidden="true">🏛️</span>
                <div>
                  <h3 className="theme-card-name">Royal Theme</h3>
                  <span className="theme-card-desc">Karnataka Heritage · Teak Wood &amp; Brass</span>
                </div>
              </div>
              {currentTheme === "royal" ? (
                <span className="theme-badge active" data-testid="theme-badge-royal">
                  ✓ Active
                </span>
              ) : (
                <span className="theme-badge select-hint">Select</span>
              )}
            </div>

            {/* Visual Board Preview */}
            <div className="theme-preview-box royal-preview" aria-hidden="true">
              <div className="preview-board-rim">
                <div className="preview-storage-left" />
                <div className="preview-pits-cluster">
                  <span className="preview-pit" />
                  <span className="preview-pit" />
                  <span className="preview-pit active-glow" />
                  <span className="preview-pit" />
                </div>
                <div className="preview-storage-right" />
              </div>
            </div>

            {/* Color Palette Swatches */}
            <div className="theme-palette-swatches">
              <span
                className="palette-swatch"
                style={{ backgroundColor: ROYAL_PALETTE.deepTeak }}
                title="Deep Teak (#160b06)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: ROYAL_PALETTE.rosewood }}
                title="Rosewood (#24130b)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: ROYAL_PALETTE.woodRim }}
                title="Teak Rim (#452415)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: ROYAL_PALETTE.brassGold }}
                title="Brass Gold (#d4af37)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: ROYAL_PALETTE.goldLight }}
                title="Gold Light (#f3e5ab)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: ROYAL_PALETTE.ivory }}
                title="Ivory Seeds (#faf3e0)"
              />
            </div>
          </div>

          {/* Card 2: Nature Theme */}
          <div
            className={`theme-card ${currentTheme === "nature" ? "selected" : ""}`}
            onClick={() => handleSelect("nature")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect("nature");
              }
            }}
            tabIndex={0}
            role="radio"
            aria-checked={currentTheme === "nature"}
            data-testid="theme-card-nature"
            aria-label="Select Nature Theme"
          >
            <div className="theme-card-header">
              <div className="theme-card-title-group">
                <span className="theme-card-icon" aria-hidden="true">🌿</span>
                <div>
                  <h3 className="theme-card-name">Nature Theme</h3>
                  <span className="theme-card-desc">Earth &amp; Nature · Warm Sand &amp; Forest Sage</span>
                </div>
              </div>
              {currentTheme === "nature" ? (
                <span className="theme-badge active" data-testid="theme-badge-nature">
                  ✓ Active
                </span>
              ) : (
                <span className="theme-badge select-hint">Select</span>
              )}
            </div>

            {/* Visual Board Preview */}
            <div className="theme-preview-box nature-preview" aria-hidden="true">
              <div className="preview-board-rim">
                <div className="preview-storage-left" />
                <div className="preview-pits-cluster">
                  <span className="preview-pit" />
                  <span className="preview-pit" />
                  <span className="preview-pit active-glow" />
                  <span className="preview-pit" />
                </div>
                <div className="preview-storage-right" />
              </div>
            </div>

            {/* Color Palette Swatches */}
            <div className="theme-palette-swatches">
              <span
                className="palette-swatch"
                style={{ backgroundColor: NATURE_PALETTE.warmSand }}
                title="Warm Sand (#F5EBDD)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: NATURE_PALETTE.desertBeige }}
                title="Desert Beige (#E5D5B9)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: NATURE_PALETTE.sageGreen }}
                title="Sage Green (#C6D2B8)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: NATURE_PALETTE.forestSage }}
                title="Forest Sage (#899B78)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: NATURE_PALETTE.naturalWood }}
                title="Natural Wood (#9B7654)"
              />
              <span
                className="palette-swatch"
                style={{ backgroundColor: NATURE_PALETTE.ivoryCream }}
                title="Ivory Cream (#FFFCF5)"
              />
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <div className="theme-modal-footer">
          <span>Theme changes apply immediately across the entire game without resetting your match.</span>
        </div>
      </div>
    </div>
  );
};

