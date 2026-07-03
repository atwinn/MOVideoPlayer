import { create } from "zustand";

export type ToolbarPanel =
  | "speed"
  | "subtitle"
  | "audio"
  | "aspect"
  | "chapters"
  | "loop"
  | "info"
  | "volume"
  | "color"
  | "rotate"
  | "sync"
  | "zoompan"
  | null;

interface UiState {
  overlayVisible: boolean;
  cleanMode: boolean;
  activePanel: ToolbarPanel;
  hideTimeoutMs: number;
  isFullscreen: boolean;

  setHideTimeoutMs: (ms: number) => void;
  showOverlay: () => void;
  hideOverlay: () => void;
  toggleOverlay: () => void;
  toggleCleanMode: () => void;
  setActivePanel: (panel: ToolbarPanel) => void;
  setFullscreen: (value: boolean) => void;
  /// Sitting still over a control (e.g. waiting for a native title=""
  /// tooltip to appear) fires no mousemove events, so showOverlay()'s own
  /// timer was the only thing that could keep it visible — and that timer
  /// just expired mid-read. Call on hover-enter over anything the overlay
  /// covers; resumeHide restarts the countdown on hover-leave.
  pauseHide: () => void;
  resumeHide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set, get) => ({
  overlayVisible: true,
  cleanMode: false,
  activePanel: null,
  hideTimeoutMs: 500,
  isFullscreen: false,

  setHideTimeoutMs: (ms) => set({ hideTimeoutMs: ms }),

  showOverlay: () => {
    if (get().cleanMode) return;
    set({ overlayVisible: true });
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (get().activePanel === null) set({ overlayVisible: false });
    }, get().hideTimeoutMs);
  },

  hideOverlay: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ overlayVisible: false });
  },

  toggleOverlay: () => {
    if (get().cleanMode) return;
    if (get().overlayVisible) {
      get().hideOverlay();
    } else {
      get().showOverlay();
    }
  },

  toggleCleanMode: () =>
    set((state) => ({
      cleanMode: !state.cleanMode,
      overlayVisible: state.cleanMode,
    })),

  setActivePanel: (panel) => set({ activePanel: panel }),
  setFullscreen: (value) => set({ isFullscreen: value }),

  pauseHide: () => {
    if (hideTimer) clearTimeout(hideTimer);
  },

  resumeHide: () => {
    if (get().cleanMode) return;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (get().activePanel === null) set({ overlayVisible: false });
    }, get().hideTimeoutMs);
  },
}));
