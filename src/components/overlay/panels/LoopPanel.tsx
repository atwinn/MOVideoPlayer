import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LoopPanel() {
  const timePos = usePlayerStore((s) => s.timePos);
  const abLoopA = usePlayerStore((s) => s.abLoopA);
  const abLoopB = usePlayerStore((s) => s.abLoopB);
  const active = abLoopA !== null && abLoopB !== null;

  return (
    <div className="flex w-56 flex-col gap-2.5">
      <div className="flex justify-between text-xs text-white/70">
        <span>Point A</span>
        <span className="tabular-nums">{abLoopA !== null ? formatTime(abLoopA) : "Not set"}</span>
      </div>
      <div className="flex justify-between text-xs text-white/70">
        <span>Point B</span>
        <span className="tabular-nums">{abLoopB !== null ? formatTime(abLoopB) : "Not set"}</span>
      </div>
      {active && (
        <div className="rounded-lg bg-white/10 px-2 py-1 text-center text-xs text-white">
          Looping {formatTime(abLoopA)} – {formatTime(abLoopB)}
        </div>
      )}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => void mpvSetProperty("ab-loop-a", timePos)}
          className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
        >
          Set A
        </button>
        <button
          type="button"
          onClick={() => void mpvSetProperty("ab-loop-b", timePos)}
          className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
        >
          Set B
        </button>
        <button
          type="button"
          onClick={() => {
            void mpvSetProperty("ab-loop-a", "no");
            void mpvSetProperty("ab-loop-b", "no");
          }}
          className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
