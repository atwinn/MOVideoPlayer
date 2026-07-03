import { FlipHorizontal2, FlipVertical2, RotateCw } from "lucide-react";

import { mpvSetProperty, mpvSetVideoFilter } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

const BUTTON = "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors";

export function TransformPanel() {
  const videoRotate = usePlayerStore((s) => s.videoRotate);
  const hflip = usePlayerStore((s) => s.hflip);
  const vflip = usePlayerStore((s) => s.vflip);
  const setHflip = usePlayerStore((s) => s.setHflip);
  const setVflip = usePlayerStore((s) => s.setVflip);

  return (
    <div className="flex w-56 flex-col gap-2">
      <div className="flex justify-between text-xs text-white/70">
        <span>Rotation</span>
        <span className="tabular-nums">{videoRotate}°</span>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => void mpvSetProperty("video-rotate", (videoRotate + 90) % 360)}
          className={`${BUTTON} bg-white/10 hover:bg-white/20`}
        >
          <RotateCw size={18} />
          Rotate 90°
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !hflip;
            setHflip(next);
            void mpvSetVideoFilter("moviehflip", "hflip", next);
          }}
          className={`${BUTTON} ${hflip ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}
        >
          <FlipHorizontal2 size={18} />
          Flip H
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !vflip;
            setVflip(next);
            void mpvSetVideoFilter("movievflip", "vflip", next);
          }}
          className={`${BUTTON} ${vflip ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}
        >
          <FlipVertical2 size={18} />
          Flip V
        </button>
      </div>
    </div>
  );
}
