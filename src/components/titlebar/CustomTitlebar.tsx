import { useEffect, useRef } from "react";
import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { setMaximizeButtonRect, windowClose, windowMinimize, windowToggleMaximize } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";
import { useUiStore } from "../../store/uiStore";

/// Rendered once at the App root regardless of whether a video is
/// loaded — without decorations:false's native chrome, this borderless
/// window has NO way to close/minimize/move itself if this doesn't
/// render. Always visible until a file is loaded, at which point it
/// follows the same auto-hide/clean-mode rules as the rest of the
/// overlay. Drag uses Tauri's built-in drag-region; the maximize button
/// additionally reports its screen rect to Rust so `WM_NCHITTEST` can
/// return `HTMAXBUTTON` there and trigger Windows 11's native Snap
/// Layout flyout on hover.
export function CustomTitlebar() {
  const maximizeRef = useRef<HTMLButtonElement>(null);
  const filePath = usePlayerStore((s) => s.filePath);
  const overlayVisible = useUiStore((s) => s.overlayVisible);
  const cleanMode = useUiStore((s) => s.cleanMode);
  const visible = !filePath || (overlayVisible && !cleanMode);

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
      className={`absolute inset-x-0 top-0 z-20 flex h-9 w-full items-center justify-between px-2 text-white/90 transition-opacity duration-200 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
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
