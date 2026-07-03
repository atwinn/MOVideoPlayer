import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

const CONTROLS = [
  { key: "brightness", label: "Brightness" },
  { key: "contrast", label: "Contrast" },
  { key: "saturation", label: "Saturation" },
  { key: "gamma", label: "Gamma" },
  { key: "hue", label: "Hue" },
] as const;

export function ColorPanel() {
  const brightness = usePlayerStore((s) => s.brightness);
  const contrast = usePlayerStore((s) => s.contrast);
  const saturation = usePlayerStore((s) => s.saturation);
  const gamma = usePlayerStore((s) => s.gamma);
  const hue = usePlayerStore((s) => s.hue);
  const values = { brightness, contrast, saturation, gamma, hue };

  return (
    <div className="flex w-56 flex-col gap-2.5">
      {CONTROLS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-white/70">
            <span>{label}</span>
            <span className="tabular-nums">{values[key]}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={values[key]}
            onChange={(e) => void mpvSetProperty(key, Number(e.target.value))}
            className="w-full accent-white"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          for (const { key } of CONTROLS) void mpvSetProperty(key, 0);
        }}
        className="mt-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
      >
        Reset
      </button>
    </div>
  );
}
