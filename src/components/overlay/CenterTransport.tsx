import { FastForward, Pause, Play, Rewind, SkipBack, SkipForward } from "lucide-react";
import { motion } from "framer-motion";

import { usePlayerStore } from "../../store/playerStore";
import { mpvSeek } from "../../lib/tauriCommands";
import { runAction, togglePlayOrReplay } from "../../lib/shortcuts/actions";

function GlassButton({
  onClick,
  size,
  children,
  label,
  disabled = false,
}: {
  onClick: () => void;
  size: number;
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex items-center justify-center rounded-full border border-glass-border bg-glass-tint text-white shadow-lg backdrop-blur-glass ${
        disabled ? "cursor-not-allowed opacity-30" : ""
      }`}
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
  const hasChapters = usePlayerStore((s) => s.chapters.length > 0);

  return (
    <div className="flex items-center gap-4">
      <GlassButton
        size={48}
        label={hasChapters ? "Previous chapter" : "Previous chapter (none in this file)"}
        disabled={!hasChapters}
        onClick={() => runAction("prevChapter")}
      >
        <SkipBack size={20} />
      </GlassButton>
      <GlassButton size={56} label="Back 5 seconds" onClick={() => void mpvSeek(-5, true)}>
        <Rewind size={22} />
      </GlassButton>
      <GlassButton size={80} label={paused ? "Play" : "Pause"} onClick={() => void togglePlayOrReplay()}>
        {paused ? <Play size={34} fill="white" /> : <Pause size={34} fill="white" />}
      </GlassButton>
      <GlassButton size={56} label="Forward 5 seconds" onClick={() => void mpvSeek(5, true)}>
        <FastForward size={22} />
      </GlassButton>
      <GlassButton
        size={48}
        label={hasChapters ? "Next chapter" : "Next chapter (none in this file)"}
        disabled={!hasChapters}
        onClick={() => runAction("nextChapter")}
      >
        <SkipForward size={20} />
      </GlassButton>
    </div>
  );
}
