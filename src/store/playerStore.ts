import { create } from "zustand";

import type { TrackList } from "../lib/types";

interface Chapter {
  title?: string;
  time: number;
}

interface PlayerState {
  filePath: string | null;
  timePos: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  speed: number;
  demuxerCacheTime: number;
  eofReached: boolean;
  tracks: TrackList;
  chapters: Chapter[];
  mpvAlive: boolean;
  /// Surfaced from Rust so a failed mpv startup/load is visible instead
  /// of silent — see EmptyState.tsx and lib/mpvEvents.ts.
  lastError: string | null;

  setFilePath: (path: string | null) => void;
  applyPropertyChange: (name: string, data: unknown) => void;
  setTracks: (tracks: TrackList) => void;
  setMpvAlive: (alive: boolean) => void;
  setLastError: (message: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  filePath: null,
  timePos: 0,
  duration: 0,
  paused: true,
  volume: 100,
  muted: false,
  speed: 1,
  demuxerCacheTime: 0,
  eofReached: false,
  tracks: { audio: [], subtitle: [] },
  chapters: [],
  mpvAlive: false,
  lastError: null,

  setFilePath: (path) => set({ filePath: path }),

  applyPropertyChange: (name, data) =>
    set((state) => {
      switch (name) {
        case "time-pos":
          return { timePos: typeof data === "number" ? data : state.timePos };
        case "duration":
          return { duration: typeof data === "number" ? data : state.duration };
        case "pause":
          return { paused: typeof data === "boolean" ? data : state.paused };
        case "volume":
          return { volume: typeof data === "number" ? data : state.volume };
        case "mute":
          return { muted: typeof data === "boolean" ? data : state.muted };
        case "speed":
          return { speed: typeof data === "number" ? data : state.speed };
        case "eof-reached":
          return { eofReached: typeof data === "boolean" ? data : state.eofReached };
        case "demuxer-cache-time":
          return {
            demuxerCacheTime: typeof data === "number" ? data : state.demuxerCacheTime,
          };
        case "chapter-list":
          return {
            chapters: Array.isArray(data)
              ? (data as Array<{ title?: string; time: number }>).map((c) => ({
                  title: c.title,
                  time: c.time,
                }))
              : state.chapters,
          };
        default:
          return {};
      }
    }),

  setTracks: (tracks) => set({ tracks }),
  setMpvAlive: (alive) => set({ mpvAlive: alive }),
  setLastError: (message) => set({ lastError: message }),
}));
