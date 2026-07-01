import { useUiStore } from "../../store/uiStore";
import { CenterTransport } from "./CenterTransport";
import { ChapterPanel } from "./ChapterPanel";
import { Timeline } from "./Timeline";
import { Toolbar } from "./Toolbar";

/// M1's "fake glass" overlay: normal WebView2 DOM content layered above
/// mpv's embedded video window (which fills the same client rect, one Z
/// level below). No real blur-of-video here — see window/vibrancy.rs and
/// the plan's M2 milestone for the acrylic-overlay-window spike.
export function OverlayLayer() {
  const overlayVisible = useUiStore((s) => s.overlayVisible);
  const cleanMode = useUiStore((s) => s.cleanMode);
  const showOverlay = useUiStore((s) => s.showOverlay);
  const toggleOverlay = useUiStore((s) => s.toggleOverlay);

  const controlsVisible = overlayVisible && !cleanMode;
  const visibilityClass = controlsVisible
    ? "opacity-100"
    : "pointer-events-none opacity-0";

  return (
    <div
      className="absolute inset-0 flex flex-col justify-end"
      onMouseMove={showOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleOverlay();
      }}
    >
      {!cleanMode && <ChapterPanel />}

      <div
        className={`flex flex-col items-center gap-4 pb-8 transition-opacity duration-200 ${visibilityClass}`}
      >
        <CenterTransport />
        <div className="flex w-full max-w-3xl flex-col gap-3 px-6">
          <Timeline />
          <div className="flex justify-center">
            <Toolbar />
          </div>
        </div>
      </div>
    </div>
  );
}
