import { usePlayerStore } from "../../store/playerStore";
import { useUiStore, type ToolbarPanel } from "../../store/uiStore";
import {
  mpvPlay,
  mpvSeek,
  mpvSetProperty,
  mpvSetVolume,
  mpvToggleMute,
  mpvTogglePlay,
  windowToggleFullscreen,
} from "../tauriCommands";
import type { ActionId } from "./registry";

const VOLUME_STEP = 5;

/// Shared by the center-transport play button, the spacebar shortcut, and
/// anywhere else play/pause is triggered. Handles two UX gaps that were
/// otherwise easy to hit: mpv's --keep-open=yes pauses at end-of-file
/// without rewinding (so "play" after the video ends did nothing visible
/// without an explicit seek-to-0 first), and a still-open audio/subtitle
/// panel doesn't auto-hide on its own once playback resumes.
export async function togglePlayOrReplay() {
  const { eofReached, paused } = usePlayerStore.getState();
  if (eofReached && paused) {
    await mpvSeek(0, false);
    await mpvPlay();
  } else {
    await mpvTogglePlay();
  }
  useUiStore.getState().setActivePanel(null);
}

function jumpToChapterIndex(index: number) {
  const chapters = usePlayerStore.getState().chapters;
  const target = chapters[index];
  if (target) void mpvSeek(target.time, false);
}

/// Every keyboard shortcut that opens a toolbar dropdown previously just
/// called setActivePanel(panel) unconditionally — pressing the same key
/// twice re-set it to the same value instead of closing it, unlike the
/// matching toolbar button (which explicitly toggles). This makes the
/// keyboard behave the same way.
function togglePanel(panel: ToolbarPanel) {
  const ui = useUiStore.getState();
  ui.setActivePanel(ui.activePanel === panel ? null : panel);
}

function stepChapter(direction: 1 | -1) {
  const { chapters, timePos } = usePlayerStore.getState();
  if (chapters.length === 0) return;
  const currentIndex = chapters.reduce(
    (acc, c, i) => (c.time <= timePos ? i : acc),
    -1,
  );
  const targetIndex = currentIndex + direction;
  const target = chapters[targetIndex];
  if (target) void mpvSeek(target.time, false);
}

const handlers: Record<ActionId, () => void> = {
  togglePlay: () => void togglePlayOrReplay(),
  seekBack5: () => void mpvSeek(-5, true),
  seekFwd5: () => void mpvSeek(5, true),
  seekBack10: () => void mpvSeek(-10, true),
  seekFwd10: () => void mpvSeek(10, true),
  volumeUp: () => {
    const volume = Math.min(100, usePlayerStore.getState().volume + VOLUME_STEP);
    void mpvSetVolume(volume);
  },
  volumeDown: () => {
    const volume = Math.max(0, usePlayerStore.getState().volume - VOLUME_STEP);
    void mpvSetVolume(volume);
  },
  toggleFullscreen: () => {
    void windowToggleFullscreen().then((isFullscreen) =>
      useUiStore.getState().setFullscreen(isFullscreen),
    );
  },
  exitFullscreen: () => {
    if (useUiStore.getState().isFullscreen) {
      void windowToggleFullscreen().then((isFullscreen) =>
        useUiStore.getState().setFullscreen(isFullscreen),
      );
    }
  },
  toggleCleanMode: () => useUiStore.getState().toggleCleanMode(),
  toggleMute: () => void mpvToggleMute(),
  cycleSubtitleMenu: () => togglePanel("subtitle"),
  cycleAudioMenu: () => togglePanel("audio"),
  openChapterList: () => togglePanel("chapters"),
  openLoopManager: () => togglePanel("loop"),
  openVideoInfo: () => togglePanel("info"),
  rotateVideo: () => {
    const next = (usePlayerStore.getState().videoRotate + 90) % 360;
    void mpvSetProperty("video-rotate", next);
  },
  prevChapter: () => stepChapter(-1),
  nextChapter: () => stepChapter(1),
  jumpToChapter1: () => jumpToChapterIndex(0),
  jumpToChapter2: () => jumpToChapterIndex(1),
  jumpToChapter3: () => jumpToChapterIndex(2),
  jumpToChapter4: () => jumpToChapterIndex(3),
  jumpToChapter5: () => jumpToChapterIndex(4),
  jumpToChapter6: () => jumpToChapterIndex(5),
  jumpToChapter7: () => jumpToChapterIndex(6),
  jumpToChapter8: () => jumpToChapterIndex(7),
  jumpToChapter9: () => jumpToChapterIndex(8),
};

export function runAction(action: ActionId) {
  handlers[action]?.();
}
