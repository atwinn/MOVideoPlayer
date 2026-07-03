import { invoke } from "@tauri-apps/api/core";

import type {
  AppSettings,
  AspectMode,
  SubtitleProvider,
  SubtitleSearchResult,
  TrackKind,
  TrackList,
  VideoInfo,
} from "./types";

export const mpvPlay = () => invoke<void>("mpv_play");
export const mpvPause = () => invoke<void>("mpv_pause");
export const mpvTogglePlay = () => invoke<void>("mpv_toggle_play");
export const mpvSeek = (seconds: number, relative: boolean) =>
  invoke<void>("mpv_seek", { seconds, relative });
export const mpvSetProperty = (name: string, value: unknown) =>
  invoke<void>("mpv_set_property", { name, value });
export const mpvGetProperty = <T = unknown>(name: string) =>
  invoke<T>("mpv_get_property", { name });
export const mpvSetSpeed = (speed: number) => invoke<void>("mpv_set_speed", { speed });
export const mpvSetVolume = (volume: number) => invoke<void>("mpv_set_volume", { volume });
export const mpvToggleMute = () => invoke<void>("mpv_toggle_mute");
export const mpvLoadFile = (path: string, append = false) =>
  invoke<void>("mpv_load_file", { path, append });
export const mpvLoadSubtitle = (path: string) => invoke<void>("mpv_load_subtitle", { path });
export const saveResumeState = () => invoke<void>("save_resume_state");

export const mpvListTracks = () => invoke<TrackList>("mpv_list_tracks");
export const mpvSetTrack = (kind: TrackKind, id: number) =>
  invoke<void>("mpv_set_track", { kind, id });
export const mpvSetAspect = (mode: AspectMode) => invoke<void>("mpv_set_aspect", { mode });
export const mpvVideoInfo = () => invoke<VideoInfo>("mpv_video_info");

// Minimize/maximize/close are handled by the native window chrome
// (decorations:true) — only fullscreen still needs a command, since
// there's no native control for that.
export const windowToggleFullscreen = () => invoke<boolean>("window_toggle_fullscreen");

export const openVideoDialog = () => invoke<string | null>("open_video_dialog");
export const openSubtitleDialog = () => invoke<string | null>("open_subtitle_dialog");

export const getSettings = () => invoke<AppSettings>("get_settings");
export const setSettings = (settings: AppSettings) =>
  invoke<void>("set_settings", { settings });
export const openSettingsWindow = () => invoke<void>("open_settings_window");

export const testSubtitleProviderKey = (provider: SubtitleProvider, apiKey: string) =>
  invoke<string>("test_subtitle_provider_key", { provider, apiKey });
export const searchSubtitles = (query: string) =>
  invoke<SubtitleSearchResult[]>("search_subtitles", { query });
export const downloadSubtitle = (result: SubtitleSearchResult) =>
  invoke<string>("download_subtitle", { result });
