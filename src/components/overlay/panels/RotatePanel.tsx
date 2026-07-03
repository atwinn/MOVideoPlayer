import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

const ANGLES = [0, 90, 180, 270] as const;

export function RotatePanel() {
  const videoRotate = usePlayerStore((s) => s.videoRotate);

  return (
    <div className="flex w-48 flex-col gap-2">
      <div className="flex justify-between text-xs text-white/70">
        <span>Rotation</span>
        <span className="tabular-nums">{videoRotate}°</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {ANGLES.map((angle) => (
          <button
            key={angle}
            type="button"
            onClick={() => void mpvSetProperty("video-rotate", angle)}
            className={`rounded-lg px-2 py-1.5 text-xs tabular-nums transition-colors ${
              videoRotate === angle ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {angle}°
          </button>
        ))}
      </div>
    </div>
  );
}
