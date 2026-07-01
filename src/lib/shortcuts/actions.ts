import { usePlayerStore } from "../../store/playerStore";
import { useUiStore } from "../../store/uiStore";
import {
  mpvSeek,
  mpvSetVolume,
  mpvToggleMute,
  mpvTogglePlay,
  windowToggleFullscreen,
} from "../tauriCommands";
import type { ActionId } from "./registry";

const VOLUME_STEP = 5;

function jumpToChapterIndex(index: number) {
  const chapters = usePlayerStore.getState().chapters;
  const target = chapters[index];
  if (target) void mpvSeek(target.time, false);
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
  togglePlay: () => void mpvTogglePlay(),
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
  cycleSubtitleMenu: () => useUiStore.getState().setActivePanel("subtitle"),
  cycleAudioMenu: () => useUiStore.getState().setActivePanel("audio"),
  openChapterList: () => useUiStore.getState().setActivePanel("chapters"),
  openLoopManager: () => useUiStore.getState().setActivePanel("loop"),
  openVideoInfo: () => useUiStore.getState().setActivePanel("info"),
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
