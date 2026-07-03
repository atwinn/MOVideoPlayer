import { create } from "zustand";

import { mpvGetProperty, mpvListTracks } from "../lib/tauriCommands";
import type { TrackList } from "../lib/types";

interface Chapter {
  title?: string;
  time: number;
}

/// mpv's loop-file property is "no" (off), "inf" (loop forever), or a
/// remaining-repeat count — normalize all of that down to a simple on/off.
function isLoopFileActive(data: unknown): boolean {
  if (data === "inf") return true;
  if (typeof data === "number") return data !== 0;
  return false;
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
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  hue: number;
  videoRotate: number;
  /// mpv reports "no" (as a string, or sometimes `false`) when an AB-loop
  /// point isn't set — normalized to `null` here.
  abLoopA: number | null;
  abLoopB: number | null;
  /// Whole-file repeat (mpv's loop-file property: "no"/"inf"/a count) —
  /// distinct from the AB-loop region above.
  loopFile: boolean;
  subFontSize: number;
  subColor: string;
  subBackColor: string;
  subPos: number;
  subScale: number;
  subDelay: number;
  audioDelay: number;
  deinterlace: boolean;
  videoZoom: number;
  videoPanX: number;
  videoPanY: number;
  /// Surfaced from Rust so a failed mpv startup/load is visible instead
  /// of silent — see EmptyState.tsx and lib/mpvEvents.ts.
  lastError: string | null;

  setFilePath: (path: string | null) => void;
  applyPropertyChange: (name: string, data: unknown) => void;
  setTracks: (tracks: TrackList) => void;
  setMpvAlive: (alive: boolean) => void;
  setLastError: (message: string | null) => void;
  /// Pulls current values directly from mpv rather than waiting on
  /// property-change events. mpv fires its initial burst of events
  /// (pause/volume/etc.) within milliseconds of the IPC connection —
  /// faster than the frontend's event listener can reliably attach —
  /// so relying on events alone left the UI stuck on hardcoded defaults
  /// (e.g. the play button showing "paused" when mpv was actually
  /// playing). Call after every successful load.
  hydrateFromMpv: () => Promise<void>;
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
  brightness: 0,
  contrast: 0,
  saturation: 0,
  gamma: 0,
  hue: 0,
  videoRotate: 0,
  abLoopA: null,
  abLoopB: null,
  loopFile: false,
  subFontSize: 55,
  subColor: "#FFFFFFFF",
  subBackColor: "#00000000",
  subPos: 100,
  subScale: 1,
  subDelay: 0,
  audioDelay: 0,
  deinterlace: false,
  videoZoom: 0,
  videoPanX: 0,
  videoPanY: 0,

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
        case "brightness":
          return { brightness: typeof data === "number" ? data : state.brightness };
        case "contrast":
          return { contrast: typeof data === "number" ? data : state.contrast };
        case "saturation":
          return { saturation: typeof data === "number" ? data : state.saturation };
        case "gamma":
          return { gamma: typeof data === "number" ? data : state.gamma };
        case "hue":
          return { hue: typeof data === "number" ? data : state.hue };
        case "video-rotate":
          return { videoRotate: typeof data === "number" ? data : state.videoRotate };
        case "ab-loop-a":
          return { abLoopA: typeof data === "number" ? data : null };
        case "ab-loop-b":
          return { abLoopB: typeof data === "number" ? data : null };
        case "loop-file":
          return { loopFile: isLoopFileActive(data) };
        case "sub-font-size":
          return { subFontSize: typeof data === "number" ? data : state.subFontSize };
        case "sub-color":
          return { subColor: typeof data === "string" ? data : state.subColor };
        case "sub-back-color":
          return { subBackColor: typeof data === "string" ? data : state.subBackColor };
        case "sub-pos":
          return { subPos: typeof data === "number" ? data : state.subPos };
        case "sub-scale":
          return { subScale: typeof data === "number" ? data : state.subScale };
        case "sub-delay":
          return { subDelay: typeof data === "number" ? data : state.subDelay };
        case "audio-delay":
          return { audioDelay: typeof data === "number" ? data : state.audioDelay };
        case "deinterlace":
          return { deinterlace: typeof data === "boolean" ? data : state.deinterlace };
        case "video-zoom":
          return { videoZoom: typeof data === "number" ? data : state.videoZoom };
        case "video-pan-x":
          return { videoPanX: typeof data === "number" ? data : state.videoPanX };
        case "video-pan-y":
          return { videoPanY: typeof data === "number" ? data : state.videoPanY };
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

  hydrateFromMpv: async () => {
    const asNumber = (v: unknown) => (typeof v === "number" ? v : undefined);
    const asString = (v: unknown) => (typeof v === "string" ? v : undefined);
    const [
      paused,
      volume,
      muted,
      speed,
      duration,
      tracks,
      brightness,
      contrast,
      saturation,
      gamma,
      hue,
      videoRotate,
      abLoopA,
      abLoopB,
      loopFile,
      subFontSize,
      subColor,
      subBackColor,
      subPos,
      subScale,
      subDelay,
      audioDelay,
      deinterlace,
      videoZoom,
      videoPanX,
      videoPanY,
    ] = await Promise.all([
      mpvGetProperty<boolean>("pause").catch(() => undefined),
      mpvGetProperty<number>("volume").catch(() => undefined),
      mpvGetProperty<boolean>("mute").catch(() => undefined),
      mpvGetProperty<number>("speed").catch(() => undefined),
      mpvGetProperty<number>("duration").catch(() => undefined),
      mpvListTracks().catch(() => undefined),
      mpvGetProperty<number>("brightness").catch(() => undefined),
      mpvGetProperty<number>("contrast").catch(() => undefined),
      mpvGetProperty<number>("saturation").catch(() => undefined),
      mpvGetProperty<number>("gamma").catch(() => undefined),
      mpvGetProperty<number>("hue").catch(() => undefined),
      mpvGetProperty<number>("video-rotate").catch(() => undefined),
      mpvGetProperty<unknown>("ab-loop-a").then(asNumber).catch(() => undefined),
      mpvGetProperty<unknown>("ab-loop-b").then(asNumber).catch(() => undefined),
      mpvGetProperty<unknown>("loop-file").then(isLoopFileActive).catch(() => undefined),
      mpvGetProperty<number>("sub-font-size").catch(() => undefined),
      mpvGetProperty<unknown>("sub-color").then(asString).catch(() => undefined),
      mpvGetProperty<unknown>("sub-back-color").then(asString).catch(() => undefined),
      mpvGetProperty<number>("sub-pos").catch(() => undefined),
      mpvGetProperty<number>("sub-scale").catch(() => undefined),
      mpvGetProperty<number>("sub-delay").catch(() => undefined),
      mpvGetProperty<number>("audio-delay").catch(() => undefined),
      mpvGetProperty<boolean>("deinterlace").catch(() => undefined),
      mpvGetProperty<number>("video-zoom").catch(() => undefined),
      mpvGetProperty<number>("video-pan-x").catch(() => undefined),
      mpvGetProperty<number>("video-pan-y").catch(() => undefined),
    ]);
    set((state) => ({
      paused: paused ?? state.paused,
      volume: volume ?? state.volume,
      muted: muted ?? state.muted,
      speed: speed ?? state.speed,
      duration: duration ?? state.duration,
      tracks: tracks ?? state.tracks,
      brightness: brightness ?? state.brightness,
      contrast: contrast ?? state.contrast,
      saturation: saturation ?? state.saturation,
      gamma: gamma ?? state.gamma,
      hue: hue ?? state.hue,
      videoRotate: videoRotate ?? state.videoRotate,
      abLoopA: abLoopA ?? null,
      abLoopB: abLoopB ?? null,
      loopFile: loopFile ?? state.loopFile,
      subFontSize: subFontSize ?? state.subFontSize,
      subColor: subColor ?? state.subColor,
      subBackColor: subBackColor ?? state.subBackColor,
      subPos: subPos ?? state.subPos,
      subScale: subScale ?? state.subScale,
      subDelay: subDelay ?? state.subDelay,
      audioDelay: audioDelay ?? state.audioDelay,
      deinterlace: deinterlace ?? state.deinterlace,
      videoZoom: videoZoom ?? state.videoZoom,
      videoPanX: videoPanX ?? state.videoPanX,
      videoPanY: videoPanY ?? state.videoPanY,
      mpvAlive: true,
    }));
  },
}));
