import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

/// mpv's sub-color/sub-back-color are "#AARRGGBB" hex strings; a native
/// <input type="color"> only produces/accepts "#RRGGBB", so alpha is kept
/// separately here and always sent as fully opaque ("FF") — enough for a
/// simple color picker without building a full alpha-aware swatch UI.
function toMpvColor(hex: string): string {
  return `#FF${hex.slice(1).toUpperCase()}`;
}

function toHtmlColor(mpvColor: string): string {
  if (mpvColor.length === 9) return `#${mpvColor.slice(3)}`;
  if (mpvColor.length === 7) return mpvColor;
  return "#FFFFFF";
}

export function SubtitleStylePanel() {
  const subFontSize = usePlayerStore((s) => s.subFontSize);
  const subColor = usePlayerStore((s) => s.subColor);
  const subPos = usePlayerStore((s) => s.subPos);
  const subScale = usePlayerStore((s) => s.subScale);

  return (
    <div className="flex w-56 flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-white/70">
          <span>Font size</span>
          <span className="tabular-nums">{subFontSize}</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={subFontSize}
          onChange={(e) => void mpvSetProperty("sub-font-size", Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-white/70">
          <span>Scale</span>
          <span className="tabular-nums">{subScale.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={subScale}
          onChange={(e) => void mpvSetProperty("sub-scale", Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-white/70">
          <span>Vertical position</span>
          <span className="tabular-nums">{subPos}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={subPos}
          onChange={(e) => void mpvSetProperty("sub-pos", Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>Text color</span>
        <input
          type="color"
          value={toHtmlColor(subColor)}
          onChange={(e) => void mpvSetProperty("sub-color", toMpvColor(e.target.value))}
          className="h-7 w-10 cursor-pointer rounded border border-white/20 bg-transparent"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          void mpvSetProperty("sub-font-size", 55);
          void mpvSetProperty("sub-scale", 1);
          void mpvSetProperty("sub-pos", 100);
          void mpvSetProperty("sub-color", "#FFFFFFFF");
        }}
        className="rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
      >
        Reset
      </button>
    </div>
  );
}
