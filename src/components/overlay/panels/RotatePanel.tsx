import { RotateCw } from "lucide-react";

import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

export function RotatePanel() {
  const videoRotate = usePlayerStore((s) => s.videoRotate);

  return (
    <div className="flex w-48 flex-col gap-2">
      <div className="flex justify-between text-xs text-white/70">
        <span>Rotation</span>
        <span className="tabular-nums">{videoRotate}°</span>
      </div>
      <button
        type="button"
        onClick={() => void mpvSetProperty("video-rotate", (videoRotate + 90) % 360)}
        className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-2 py-2 text-xs hover:bg-white/20"
      >
        <RotateCw size={18} />
        Rotate 90°
      </button>
    </div>
  );
}
