export type TrackKind = "audio" | "sub" | "video";

export interface Track {
  id: number;
  kind: TrackKind;
  title: string | null;
  lang: string | null;
  selected: boolean;
}

export interface TrackList {
  audio: Track[];
  subtitle: Track[];
}

export type AspectMode = "auto" | "sixteen9" | "four3" | "twenty-one9" | "stretch";

export interface VideoInfo {
  filename: string | null;
  container: string | null;
  video_codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  video_bitrate: number | null;
  hwdec: string | null;
  audio_codec: string | null;
  audio_channels: number | null;
  audio_samplerate: number | null;
  audio_bitrate: number | null;
}

export interface ResumeEntry {
  file_path: string;
  position_secs: number;
  audio_track_id: number | null;
  sub_track_id: number | null;
  zoom: number;
  speed: number;
  last_played_at: string;
}

export interface GeneralSettings {
  resume_playback: boolean;
  preferred_audio_language: string | null;
  preferred_subtitle_language: string | null;
}

export interface PlaybackSettings {
  default_speed: number;
  remember_speed: boolean;
  volume: number;
}

export interface InterfaceSettings {
  overlay_hide_timeout_ms: number;
  theme: "system" | "dark" | "light";
}

export interface WindowGeometry {
  width: number;
  height: number;
  x: number | null;
  y: number | null;
}

export interface AppSettings {
  schema_version: number;
  general: GeneralSettings;
  playback: PlaybackSettings;
  interface: InterfaceSettings;
  window: WindowGeometry;
  resume: Record<string, ResumeEntry>;
}

export type MpvEvent =
  | { event: "property-change"; id: number; name: string; data?: unknown }
  | { event: "file-loaded" }
  | { event: "end-file"; reason: string }
  | { event: "seek" }
  | { event: "playback-restart" }
  | { event: "Other" };

export type ControllerEvent =
  | { kind: "Mpv"; payload: MpvEvent }
  | { kind: "Crashed" }
  | { kind: "Respawned" }
  | { kind: "RespawnFailed" }
  | { kind: "StartFailed"; payload: string };
