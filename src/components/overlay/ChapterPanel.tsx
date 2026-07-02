import { AnimatePresence, motion } from "framer-motion";

import { mpvSeek } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";
import { useUiStore } from "../../store/uiStore";

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

/// Top-right floating overlay, per spec: only ever rendered when the
/// loaded file has chapters, hidden otherwise.
export function ChapterPanel() {
  const chapters = usePlayerStore((s) => s.chapters);
  const timePos = usePlayerStore((s) => s.timePos);
  const duration = usePlayerStore((s) => s.duration);
  const activePanel = useUiStore((s) => s.activePanel);
  const setActivePanel = useUiStore((s) => s.setActivePanel);

  if (chapters.length === 0) return null;

  const currentIndex = chapters.reduce(
    (acc, c, i) => (c.time <= timePos ? i : acc),
    -1,
  );

  return (
    <AnimatePresence>
      {activePanel === "chapters" && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute right-4 top-14 max-h-[60vh] w-72 overflow-y-auto rounded-glass border border-glass-border bg-glass-tint p-2 text-white shadow-2xl backdrop-blur-glass"
        >
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium">Chapters</span>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="text-white/60 hover:text-white"
              aria-label="Close chapters"
              title="Close"
            >
              ✕
            </button>
          </div>
          {chapters.map((chapter, i) => {
            const nextTime = chapters[i + 1]?.time ?? duration;
            return (
              <button
                key={i}
                type="button"
                onClick={() => void mpvSeek(chapter.time, false)}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  i === currentIndex ? "bg-white text-black" : "hover:bg-white/10"
                }`}
              >
                <span className="truncate">
                  {i + 1}. {chapter.title ?? `Chapter ${i + 1}`}
                </span>
                {/* Explicit start-end range, not just a bare duration —
                    a lone number here read as ambiguous ("is this what
                    I'll jump to?"); clicking always seeks to the first
                    (start) value. */}
                <span className="tabular-nums opacity-70">
                  {formatTime(chapter.time)} – {formatTime(nextTime)}
                </span>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
