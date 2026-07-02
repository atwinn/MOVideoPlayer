import { Volume1, Volume2, VolumeX } from "lucide-react";

import { mpvSetVolume, mpvToggleMute } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

export function VolumeIcon({ volume, muted, size = 18 }: { volume: number; muted: boolean; size?: number }) {
  if (muted || volume === 0) return <VolumeX size={size} />;
  if (volume < 50) return <Volume1 size={size} />;
  return <Volume2 size={size} />;
}

export function VolumePanel() {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);

  return (
    <div className="flex w-48 items-center gap-2">
      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute" : "Mute"}
        onClick={() => void mpvToggleMute()}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
      >
        <VolumeIcon volume={volume} muted={muted} />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={muted ? 0 : volume}
        onChange={(e) => void mpvSetVolume(Number(e.target.value))}
        className="w-full accent-white"
      />
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-white/70">
        {Math.round(muted ? 0 : volume)}%
      </span>
    </div>
  );
}
