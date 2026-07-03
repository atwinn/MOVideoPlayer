export type ActionId =
  | "togglePlay"
  | "seekBack5"
  | "seekFwd5"
  | "seekBack10"
  | "seekFwd10"
  | "volumeUp"
  | "volumeDown"
  | "toggleFullscreen"
  | "exitFullscreen"
  | "toggleCleanMode"
  | "toggleMute"
  | "cycleSubtitleMenu"
  | "cycleAudioMenu"
  | "openChapterList"
  | "openLoopManager"
  | "openVideoInfo"
  | "rotateVideo"
  | "prevChapter"
  | "nextChapter"
  | `jumpToChapter${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;

export interface ShortcutBinding {
  /// Normalized key combo, e.g. "Space", "ArrowLeft", "Shift+ArrowLeft", "Ctrl+H".
  keys: string;
  action: ActionId;
}

/// Directly from the product spec's keyboard shortcut list. Data-driven so
/// a future rebind-editor UI only needs to mutate this list, not the
/// dispatch code in `actions.ts`.
export const defaultBindings: ShortcutBinding[] = [
  { keys: "Space", action: "togglePlay" },
  { keys: "ArrowLeft", action: "seekBack5" },
  { keys: "ArrowRight", action: "seekFwd5" },
  { keys: "Shift+ArrowLeft", action: "seekBack10" },
  { keys: "Shift+ArrowRight", action: "seekFwd10" },
  { keys: "ArrowUp", action: "volumeUp" },
  { keys: "ArrowDown", action: "volumeDown" },
  { keys: "F", action: "toggleFullscreen" },
  { keys: "Escape", action: "exitFullscreen" },
  { keys: "Ctrl+H", action: "toggleCleanMode" },
  { keys: "M", action: "toggleMute" },
  { keys: "S", action: "cycleSubtitleMenu" },
  { keys: "A", action: "cycleAudioMenu" },
  { keys: "C", action: "openChapterList" },
  { keys: "L", action: "openLoopManager" },
  { keys: "I", action: "openVideoInfo" },
  { keys: "R", action: "rotateVideo" },
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((n) => ({
    keys: String(n),
    action: `jumpToChapter${n}` as ActionId,
  })),
];

/// Human-readable labels for the shortcut editor UI — every ActionId must
/// have one, so an exhaustive Record catches a forgotten label at compile
/// time whenever a new action is added.
export const ACTION_LABELS: Record<ActionId, string> = {
  togglePlay: "Play / pause",
  seekBack5: "Seek back 5s",
  seekFwd5: "Seek forward 5s",
  seekBack10: "Seek back 10s",
  seekFwd10: "Seek forward 10s",
  volumeUp: "Volume up",
  volumeDown: "Volume down",
  toggleFullscreen: "Toggle fullscreen",
  exitFullscreen: "Exit fullscreen",
  toggleCleanMode: "Toggle clean mode",
  toggleMute: "Mute",
  cycleSubtitleMenu: "Subtitle menu",
  cycleAudioMenu: "Audio track menu",
  openChapterList: "Chapter list",
  openLoopManager: "Loop A-B panel",
  openVideoInfo: "Video info",
  rotateVideo: "Rotate video",
  prevChapter: "Previous chapter",
  nextChapter: "Next chapter",
  jumpToChapter1: "Jump to chapter 1",
  jumpToChapter2: "Jump to chapter 2",
  jumpToChapter3: "Jump to chapter 3",
  jumpToChapter4: "Jump to chapter 4",
  jumpToChapter5: "Jump to chapter 5",
  jumpToChapter6: "Jump to chapter 6",
  jumpToChapter7: "Jump to chapter 7",
  jumpToChapter8: "Jump to chapter 8",
  jumpToChapter9: "Jump to chapter 9",
};

function buildMap(bindings: ShortcutBinding[]): Map<string, ActionId> {
  return new Map(bindings.map((b) => [b.keys, b.action]));
}

let bindingMap = buildMap(defaultBindings);

export function setBindings(bindings: ShortcutBinding[]) {
  bindingMap = buildMap(bindings);
}

/// Current bindings as a flat list, for the shortcut editor UI to render —
/// the internal Map is keyed by `keys` (what dispatch needs), this is
/// keyed by `action` (what the editor needs, one row per action).
export function getBindings(): ShortcutBinding[] {
  return Array.from(bindingMap.entries()).map(([keys, action]) => ({ keys, action }));
}

export function normalizeKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.metaKey) parts.push("Meta");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  let key = e.key;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join("+");
}

export function resolveAction(e: KeyboardEvent): ActionId | undefined {
  return bindingMap.get(normalizeKeyEvent(e));
}
