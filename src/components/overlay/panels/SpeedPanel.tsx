import { mpvSetSpeed } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 4];

export function SpeedPanel() {
  const speed = usePlayerStore((s) => s.speed);

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {SPEED_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => void mpvSetSpeed(preset)}
          className={`rounded-lg px-2 py-1 text-sm tabular-nums transition-colors ${
            Math.abs(speed - preset) < 0.001
              ? "bg-white text-black"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {preset}x
        </button>
      ))}
    </div>
  );
}
