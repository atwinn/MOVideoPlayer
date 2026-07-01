import { useEffect, useRef } from "react";
import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { setMaximizeButtonRect, windowClose, windowMinimize, windowToggleMaximize } from "../../lib/tauriCommands";

/// Lives inside the main window's overlay content (no separate titlebar
/// window in M1). Drag uses Tauri's built-in drag-region; the maximize
/// button additionally reports its screen rect to Rust so `WM_NCHITTEST`
/// can return `HTMAXBUTTON` there and trigger Windows 11's native Snap
/// Layout flyout on hover.
export function CustomTitlebar() {
  const maximizeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reportRect = () => {
      const el = maximizeRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      void setMaximizeButtonRect(
        Math.round(rect.left * dpr),
        Math.round(rect.top * dpr),
        Math.round(rect.right * dpr),
        Math.round(rect.bottom * dpr),
      );
    };

    reportRect();
    window.addEventListener("resize", reportRect);

    let unlistenMove: (() => void) | undefined;
    getCurrentWindow()
      .onMoved(reportRect)
      .then((fn) => {
        unlistenMove = fn;
      });

    return () => {
      window.removeEventListener("resize", reportRect);
      unlistenMove?.();
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="flex h-9 w-full items-center justify-between px-2 text-white/90"
    >
      <span data-tauri-drag-region className="px-2 text-xs font-medium tracking-wide opacity-70">
        MOVideoPlayer
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => void windowMinimize()}
          className="flex h-7 w-9 items-center justify-center rounded-md hover:bg-white/10"
        >
          <Minus size={14} />
        </button>
        <button
          ref={maximizeRef}
          type="button"
          aria-label="Maximize"
          onClick={() => void windowToggleMaximize()}
          className="flex h-7 w-9 items-center justify-center rounded-md hover:bg-white/10"
        >
          <Square size={12} />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => void windowClose()}
          className="flex h-7 w-9 items-center justify-center rounded-md hover:bg-red-500/80"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
