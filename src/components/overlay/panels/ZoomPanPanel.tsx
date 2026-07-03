import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

export function ZoomPanPanel() {
  const videoZoom = usePlayerStore((s) => s.videoZoom);
  const videoPanX = usePlayerStore((s) => s.videoPanX);
  const videoPanY = usePlayerStore((s) => s.videoPanY);

  return (
    <div className="flex w-56 flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-white/70">
          <span>Zoom</span>
          <span className="tabular-nums">{videoZoom.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={-2}
          max={2}
          step={0.05}
          value={videoZoom}
          onChange={(e) => void mpvSetProperty("video-zoom", Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-white/70">
          <span>Pan X</span>
          <span className="tabular-nums">{videoPanX.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.02}
          value={videoPanX}
          onChange={(e) => void mpvSetProperty("video-pan-x", Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-white/70">
          <span>Pan Y</span>
          <span className="tabular-nums">{videoPanY.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.02}
          value={videoPanY}
          onChange={(e) => void mpvSetProperty("video-pan-y", Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          void mpvSetProperty("video-zoom", 0);
          void mpvSetProperty("video-pan-x", 0);
          void mpvSetProperty("video-pan-y", 0);
        }}
        className="rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
      >
        Reset
      </button>
    </div>
  );
}
