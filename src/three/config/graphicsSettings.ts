/**
 * Graphics Settings & Performance Configuration
 * Tuned for smooth 60 FPS rendering on desktop and mobile web / WebView.
 */

export interface GraphicsSettings {
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  maxPixelRatio: number;
  toneMappingExposure: number;
  enableZoom: boolean;
  enablePan: boolean;
}

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  antialias: true,
  shadows: true,
  shadowMapSize: 1024,
  maxPixelRatio: typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1.5,
  toneMappingExposure: 0.98,
  enableZoom: true,
  enablePan: false,
};
