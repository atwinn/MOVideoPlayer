import { useCallback, useRef, useState } from "react";

import { mpvSeek } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function Timeline() {
  const timePos = usePlayerStore((s) => s.timePos);
  const duration = usePlayerStore((s) => s.duration);
  const demuxerCacheTime = usePlayerStore((s) => s.demuxerCacheTime);
  const chapters = usePlayerStore((s) => s.chapters);

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragPreview, setDragPreview] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const fractionAt = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track || duration <= 0) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragPreview(fractionAt(e.clientX) * duration);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    setHoverX(e.clientX);
    if (dragPreview !== null) {
      setDragPreview(fractionAt(e.clientX) * duration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (dragPreview !== null) {
      void mpvSeek(dragPreview, false);
      setDragPreview(null);
    }
  };

  const displayTime = dragPreview ?? timePos;
  const playedFraction = duration > 0 ? displayTime / duration : 0;
  const bufferedFraction = duration > 0 ? Math.min(1, demuxerCacheTime / duration) : 0;
  const hoverFraction = hoverX !== null ? fractionAt(hoverX) : null;

  return (
    <div className="flex flex-col gap-1 px-1">
      <div
        ref={trackRef}
        className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/20"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setHoverX(null)}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/35"
          style={{ width: `${bufferedFraction * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white"
          style={{ width: `${playedFraction * 100}%` }}
        />
        {chapters.map((chapter, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-px bg-black/50"
            style={{ left: `${duration > 0 ? (chapter.time / duration) * 100 : 0}%` }}
          />
        ))}
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ left: `${playedFraction * 100}%` }}
        />
        {hoverFraction !== null && (
          <div
            className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white"
            style={{ left: `${hoverFraction * 100}%` }}
          >
            {formatTime(hoverFraction * duration)}
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs tabular-nums text-white/80">
        <span>{formatTime(displayTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
