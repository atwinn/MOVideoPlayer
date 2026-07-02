import { mpvSetVolume, mpvToggleMute } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

export function VolumePanel() {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);

  return (
    <div className="flex w-40 flex-col gap-2">
      <input
        type="range"
        min={0}
        max={100}
        value={muted ? 0 : volume}
        onChange={(e) => void mpvSetVolume(Number(e.target.value))}
        className="w-full accent-white"
      />
      <button
        type="button"
        onClick={() => void mpvToggleMute()}
        className="self-start rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}
