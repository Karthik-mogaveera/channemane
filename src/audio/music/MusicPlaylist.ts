/**
 * Music Playlist Architecture
 * Defines track metadata, sequence, and asset locations.
 * Designed for 3 ambient instrumental tracks with subtle Indian melodic and acoustic warmth.
 */

export interface MusicTrack {
  id: string;
  title: string;
  description: string;
  sources: string[]; // Fallback order (webm, mp3, ogg)
  durationSec?: number;
}

export const MUSIC_PLAYLIST: MusicTrack[] = [
  {
    id: "track-1-dawn",
    title: "Dawn Over the Courtyard",
    description: "Gentle morning acoustic wood and tanpura ambience",
    sources: [
      "/audio/music/dawn_courtyard.webm",
      "/audio/music/dawn_courtyard.mp3",
    ],
  },
  {
    id: "track-2-teak",
    title: "Teak & Tamarind",
    description: "Warm rhythmic wooden percussion and meditative bamboo flute",
    sources: [
      "/audio/music/teak_tamarind.webm",
      "/audio/music/teak_tamarind.mp3",
    ],
  },
  {
    id: "track-3-dusk",
    title: "Dusk in Dharwar",
    description: "Contemplative evening raga with soft harmonium and acoustic strings",
    sources: [
      "/audio/music/dharwar_dusk.webm",
      "/audio/music/dharwar_dusk.mp3",
    ],
  },
];

export class MusicPlaylist {
  private tracks: MusicTrack[] = [...MUSIC_PLAYLIST];
  private currentIndex: number = 0;

  public getTracks(): MusicTrack[] {
    return [...this.tracks];
  }

  public getCurrentTrack(): MusicTrack | null {
    if (this.tracks.length === 0) return null;
    return this.tracks[this.currentIndex] || null;
  }

  public nextTrack(): MusicTrack | null {
    if (this.tracks.length === 0) return null;
    this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    return this.getCurrentTrack();
  }

  public prevTrack(): MusicTrack | null {
    if (this.tracks.length === 0) return null;
    this.currentIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
    return this.getCurrentTrack();
  }

  public selectTrack(id: string): MusicTrack | null {
    const idx = this.tracks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.currentIndex = idx;
      return this.tracks[idx];
    }
    return null;
  }
}
