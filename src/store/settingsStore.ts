import { create } from "zustand";

import { getSettings, setSettings } from "../lib/tauriCommands";
import type { AppSettings } from "../lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  schema_version: 1,
  general: {
    resume_playback: true,
    preferred_audio_language: null,
    preferred_subtitle_language: null,
  },
  playback: { default_speed: 1, remember_speed: true, volume: 100 },
  interface: { overlay_hide_timeout_ms: 500, theme: "system" },
  window: { width: 1280, height: 800, x: null, y: null },
  resume: {},
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await getSettings();
    set({ settings, loaded: true });
  },

  update: async (partial) => {
    const merged = { ...get().settings, ...partial };
    set({ settings: merged });
    await setSettings(merged);
  },
}));
