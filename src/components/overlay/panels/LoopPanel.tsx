import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/// Setting just ab-loop-a/ab-loop-b isn't quite enough on its own: mpv
/// only actually loops while ab-loop-a < ab-loop-b (setting B before A, or
/// re-marking A past the existing B, silently produces a non-looping pair
/// with no error), and ab-loop-count needs to be explicitly infinite
/// rather than relying on whatever this mpv build's default happens to
/// be. Both points are always re-set together (as min/max of whichever
/// was just marked vs. the other) so the loop is well-formed regardless
/// of which button was pressed first.
function setLoopPoint(point: "a" | "b") {
  const { timePos, abLoopA, abLoopB } = usePlayerStore.getState();
  const other = point === "a" ? abLoopB : abLoopA;
  if (other === null) {
    void mpvSetProperty(point === "a" ? "ab-loop-a" : "ab-loop-b", timePos);
    return;
  }
  const a = Math.min(timePos, other);
  const b = Math.max(timePos, other);
  void mpvSetProperty("ab-loop-a", a);
  void mpvSetProperty("ab-loop-b", b);
  void mpvSetProperty("ab-loop-count", "inf");
}

export function LoopPanel() {
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
          onClick={() => setLoopPoint("a")}
          className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
        >
          Set A
        </button>
        <button
          type="button"
          onClick={() => setLoopPoint("b")}
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
