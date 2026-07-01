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
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((n) => ({
    keys: String(n),
    action: `jumpToChapter${n}` as ActionId,
  })),
];

function buildMap(bindings: ShortcutBinding[]): Map<string, ActionId> {
  return new Map(bindings.map((b) => [b.keys, b.action]));
}

let bindingMap = buildMap(defaultBindings);

export function setBindings(bindings: ShortcutBinding[]) {
  bindingMap = buildMap(bindings);
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
