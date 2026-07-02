import { useCallback, useEffect, useRef, useState } from "react";

import { mpvSeek } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";

const SEEK_CONFIRM_TOLERANCE_SECS = 1.5;
const SEEK_CONFIRM_TIMEOUT_MS = 4000;

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
  // Distinct from dragPreview: set once on pointer-up and held until mpv's
  // real time-pos catches up to the seek target. Clearing dragPreview
  // immediately on release fell back to the (stale) store time-pos until
  // the seek's confirmation event arrived — for network streams that can
  // take seconds, which looked exactly like "seeking snaps back to the
  // old position."
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const pendingSeekTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const isDragging = dragPreview !== null;

  useEffect(() => {
    if (pendingSeek === null) return;
    if (Math.abs(timePos - pendingSeek) < SEEK_CONFIRM_TOLERANCE_SECS) {
      setPendingSeek(null);
    }
  }, [timePos, pendingSeek]);

  useEffect(() => {
    return () => {
      if (pendingSeekTimeout.current) clearTimeout(pendingSeekTimeout.current);
    };
  }, []);

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
    if (isDragging) {
      setDragPreview(fractionAt(e.clientX) * duration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (dragPreview !== null) {
      const target = dragPreview;
      void mpvSeek(target, false);
      setDragPreview(null);
      setPendingSeek(target);
      if (pendingSeekTimeout.current) clearTimeout(pendingSeekTimeout.current);
      pendingSeekTimeout.current = setTimeout(() => setPendingSeek(null), SEEK_CONFIRM_TIMEOUT_MS);
    }
  };

  const displayTime = dragPreview ?? pendingSeek ?? timePos;
  const playedFraction = duration > 0 ? displayTime / duration : 0;
  const bufferedFraction = duration > 0 ? Math.min(1, demuxerCacheTime / duration) : 0;
  const hoverFraction = hoverX !== null && !isDragging ? fractionAt(hoverX) : null;

  return (
    <div className="flex flex-col gap-2.5 rounded-glass border border-glass-border bg-glass-tint px-4 py-3.5 shadow-lg backdrop-blur-glass">
      <div
        ref={trackRef}
        className="relative h-2 w-full cursor-pointer rounded-full bg-black/50 shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => {
          setHoverX(null);
          setIsHovering(false);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/45"
          style={{ width: `${bufferedFraction * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.6)]"
          style={{ width: `${playedFraction * 100}%` }}
        />
        {chapters.map((chapter, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-px bg-black/60"
            style={{ left: `${duration > 0 ? (chapter.time / duration) * 100 : 0}%` }}
          />
        ))}
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.6)] transition-[width,height] ${
            isHovering || isDragging ? "h-4 w-4" : "h-3 w-3"
          }`}
          style={{ left: `${playedFraction * 100}%` }}
        />
        {/* Scrub preview — the time under the cursor, NOT the current
            playback position (that's the row below). Hidden while
            actively dragging so it can't be confused with the live
            value the handle/fill are showing at that moment. */}
        {hoverFraction !== null && (
          <div
            className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-black/85 px-1.5 py-0.5 text-xs text-white/80 before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-black/85 before:content-['']"
            style={{ left: `${hoverFraction * 100}%` }}
          >
            {formatTime(hoverFraction * duration)}
          </div>
        )}
      </div>
      <div className="flex justify-between text-sm font-medium tabular-nums text-white">
        <span>{formatTime(displayTime)}</span>
        <span className="text-white/60">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
