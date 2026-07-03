import { useEffect, useRef } from "react";

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
  const pauseHide = useUiStore((s) => s.pauseHide);
  const resumeHide = useUiStore((s) => s.resumeHide);
  const activePanel = useUiStore((s) => s.activePanel);
  const setActivePanel = useUiStore((s) => s.setActivePanel);
  const panelAreaRef = useRef<HTMLDivElement>(null);

  const controlsVisible = overlayVisible && !cleanMode;
  const visibilityClass = controlsVisible
    ? "opacity-100"
    : "pointer-events-none opacity-0";
  // Hidden (rather than just lower z-index) while a dropdown is open — a
  // tall one (e.g. subtitle search results) sits right on top of the
  // vertically-centered transport buttons otherwise, which read as
  // overlapping, cluttered UI rather than two independent layers.
  const centerVisibilityClass =
    controlsVisible && activePanel === null ? "opacity-100" : "pointer-events-none opacity-0";

  // A toolbar dropdown (Volume/Speed/.../Chapters) previously only closed
  // by clicking its own toggle button again — clicking anywhere else (the
  // video, the timeline, empty space) left it stuck open. panelAreaRef
  // wraps both the ChapterPanel and the Timeline/Toolbar row (the only two
  // places activePanel-driven content renders) so a click inside either
  // one — e.g. picking a chapter, or a slider inside a dropdown — doesn't
  // count as "outside" and isn't mistaken for a dismiss.
  useEffect(() => {
    if (activePanel === null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (panelAreaRef.current && !panelAreaRef.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [activePanel, setActivePanel]);

  return (
    <div
      className="absolute inset-0"
      onMouseMove={showOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleOverlay();
      }}
    >
      <div ref={panelAreaRef} onMouseEnter={pauseHide} onMouseLeave={resumeHide}>
        {!cleanMode && <ChapterPanel />}

        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-8 transition-opacity duration-200 ${visibilityClass}`}
        >
          <div className="flex w-full max-w-3xl flex-col gap-3 px-6">
            <Timeline />
            <div className="flex justify-center">
              <Toolbar />
            </div>
          </div>
        </div>
      </div>

      {/* Spec: five floating buttons centered in the video area — not
          stacked directly above the timeline. */}
      <div
        onMouseEnter={pauseHide}
        onMouseLeave={resumeHide}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${centerVisibilityClass}`}
      >
        <CenterTransport />
      </div>
    </div>
  );
}
