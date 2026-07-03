import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

import { DropZone } from "./components/dnd/DropZone";
import { EmptyState } from "./components/overlay/EmptyState";
import { OverlayLayer } from "./components/overlay/OverlayLayer";
import { resolveAction, setBindings, type ShortcutBinding } from "./lib/shortcuts/registry";
import { runAction } from "./lib/shortcuts/actions";
import { initMpvEventBridge } from "./lib/mpvEvents";
import { saveResumeState } from "./lib/tauriCommands";
import { usePlayerStore } from "./store/playerStore";
import { useSettingsStore } from "./store/settingsStore";
import { useUiStore } from "./store/uiStore";

const RESUME_SAVE_INTERVAL_MS = 5000;

function isTypingIntoInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export default function App() {
  const filePath = usePlayerStore((s) => s.filePath);
  const lastError = usePlayerStore((s) => s.lastError);
  const setFilePath = usePlayerStore((s) => s.setFilePath);
  const setLastError = usePlayerStore((s) => s.setLastError);
  const hydrateFromMpv = usePlayerStore((s) => s.hydrateFromMpv);
  const loadSettings = useSettingsStore((s) => s.load);
  const setHideTimeoutMs = useUiStore((s) => s.setHideTimeoutMs);

  useEffect(() => {
    const unlistenPromise = initMpvEventBridge();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // A file opened via "Open with" / double-click is loaded entirely on the
  // Rust side (argv[1] at launch, before any webview code has run) — this
  // just mirrors what DropZone/EmptyState do after their own mpvLoadFile
  // calls, so the UI actually switches off the empty state instead of
  // sitting there while mpv plays the file underneath it unseen.
  useEffect(() => {
    const unlistenPromise = listen<string>("app://file-opened", (event) => {
      setFilePath(event.payload);
      void hydrateFromMpv();
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [setFilePath, hydrateFromMpv]);

  useEffect(() => {
    void loadSettings().then(() => {
      const settings = useSettingsStore.getState().settings;
      setHideTimeoutMs(settings.interface.overlay_hide_timeout_ms);
      // Empty means "never customized" — keep registry.ts's hardcoded
      // defaults rather than overwriting them with nothing.
      if (settings.shortcuts.length > 0) {
        setBindings(settings.shortcuts as ShortcutBinding[]);
      }
    });
  }, [loadSettings, setHideTimeoutMs]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingIntoInput(e.target)) return;
      const action = resolveAction(e);
      if (action) {
        e.preventDefault();
        // Overlay visibility was only ever driven by mouse movement, so a
        // keyboard-only seek (arrow keys etc.) with the mouse sitting
        // still left the timeline/toolbar invisible for the entire
        // action — the seek happened but there was nothing on screen to
        // show where it landed.
        useUiStore.getState().showOverlay();
        runAction(action);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => void saveResumeState(), RESUME_SAVE_INTERVAL_MS);
    const onBeforeUnload = () => void saveResumeState();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // Native window chrome (see tauri.conf.json decorations:true) means
  // there's no custom titlebar to show the filename in — use the OS
  // titlebar's own text instead.
  useEffect(() => {
    const name = filePath?.split(/[/\\]/).pop();
    void getCurrentWindow().setTitle(name ? `${name} — MOVideoPlayer` : "MOVideoPlayer");
  }, [filePath]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DropZone />
      {filePath ? <OverlayLayer /> : <EmptyState />}
      {lastError && (
        <div className="absolute bottom-4 left-1/2 z-30 flex max-w-md -translate-x-1/2 items-start gap-2 rounded-glass border border-glass-border bg-red-950/80 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-glass">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-300" />
          <span className="flex-1">{lastError}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setLastError(null)}
            className="shrink-0 text-white/60 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
