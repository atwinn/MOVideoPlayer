import { useEffect } from "react";

import { DropZone } from "./components/dnd/DropZone";
import { EmptyState } from "./components/overlay/EmptyState";
import { OverlayLayer } from "./components/overlay/OverlayLayer";
import { resolveAction } from "./lib/shortcuts/registry";
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
  const loadSettings = useSettingsStore((s) => s.load);
  const setHideTimeoutMs = useUiStore((s) => s.setHideTimeoutMs);

  useEffect(() => {
    const unlistenPromise = initMpvEventBridge();
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    void loadSettings().then(() => {
      setHideTimeoutMs(useSettingsStore.getState().settings.interface.overlay_hide_timeout_ms);
    });
  }, [loadSettings, setHideTimeoutMs]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingIntoInput(e.target)) return;
      const action = resolveAction(e);
      if (action) {
        e.preventDefault();
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

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DropZone />
      {filePath ? <OverlayLayer /> : <EmptyState />}
    </div>
  );
}
