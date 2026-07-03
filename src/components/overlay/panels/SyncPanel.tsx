import { mpvSetProperty } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

const STEP = 0.1;

function DelayRow({
  label,
  value,
  property,
}: {
  label: string;
  value: number;
  property: "sub-delay" | "audio-delay";
}) {
  const set = (v: number) => void mpvSetProperty(property, Math.round(v * 1000) / 1000);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="tabular-nums">{value.toFixed(1)}s</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => set(value - STEP)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm hover:bg-white/20"
        >
          −
        </button>
        <input
          type="range"
          min={-10}
          max={10}
          step={STEP}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="w-full accent-white"
        />
        <button
          type="button"
          onClick={() => set(value + STEP)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm hover:bg-white/20"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SyncPanel() {
  const subDelay = usePlayerStore((s) => s.subDelay);
  const audioDelay = usePlayerStore((s) => s.audioDelay);

  return (
    <div className="flex w-64 flex-col gap-3">
      <DelayRow label="Subtitle delay" value={subDelay} property="sub-delay" />
      <DelayRow label="Audio delay" value={audioDelay} property="audio-delay" />
      <button
        type="button"
        onClick={() => {
          void mpvSetProperty("sub-delay", 0);
          void mpvSetProperty("audio-delay", 0);
        }}
        className="rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
      >
        Reset both
      </button>
    </div>
  );
}
