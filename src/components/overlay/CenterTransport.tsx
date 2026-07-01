import { FastForward, Pause, Play, Rewind, SkipBack, SkipForward } from "lucide-react";
import { motion } from "framer-motion";

import { usePlayerStore } from "../../store/playerStore";
import { mpvSeek, mpvTogglePlay } from "../../lib/tauriCommands";
import { runAction } from "../../lib/shortcuts/actions";

function GlassButton({
  onClick,
  size,
  children,
  label,
}: {
  onClick: () => void;
  size: number;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center justify-center rounded-full border border-glass-border bg-glass-tint text-white shadow-lg backdrop-blur-glass"
      style={{ width: size, height: size }}
    >
      {children}
    </motion.button>
  );
}

/// The spec's five-button center transport, exact mapping: far-left =
/// previous chapter, left = back 5s, center = play/pause, right =
/// forward 5s, far-right = next chapter.
export function CenterTransport() {
  const paused = usePlayerStore((s) => s.paused);

  return (
    <div className="flex items-center gap-4">
      <GlassButton size={48} label="Previous chapter" onClick={() => runAction("prevChapter")}>
        <SkipBack size={20} />
      </GlassButton>
      <GlassButton size={56} label="Back 5 seconds" onClick={() => void mpvSeek(-5, true)}>
        <Rewind size={22} />
      </GlassButton>
      <GlassButton size={80} label={paused ? "Play" : "Pause"} onClick={() => void mpvTogglePlay()}>
        {paused ? <Play size={34} fill="white" /> : <Pause size={34} fill="white" />}
      </GlassButton>
      <GlassButton size={56} label="Forward 5 seconds" onClick={() => void mpvSeek(5, true)}>
        <FastForward size={22} />
      </GlassButton>
      <GlassButton size={48} label="Next chapter" onClick={() => runAction("nextChapter")}>
        <SkipForward size={20} />
      </GlassButton>
    </div>
  );
}
