import {
  AudioLines,
  Captions,
  Gauge,
  Info,
  ListVideo,
  Maximize,
  Minimize,
  RectangleHorizontal,
  Repeat,
  Settings,
  Sliders,
  Wand2,
} from "lucide-react";

import { openSettingsWindow, windowToggleFullscreen } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";
import { useUiStore, type ToolbarPanel } from "../../store/uiStore";
import { FloatingPanel } from "./FloatingPanel";
import { AspectRatioPanel } from "./panels/AspectRatioPanel";
import { AudioTrackPanel } from "./panels/AudioTrackPanel";
import { ColorPanel } from "./panels/ColorPanel";
import { LoopPanel } from "./panels/LoopPanel";
import { SpeedPanel } from "./panels/SpeedPanel";
import { SubtitleTrackPanel } from "./panels/SubtitleTrackPanel";
import { TransformPanel } from "./panels/TransformPanel";
import { VideoInfoPanel } from "./panels/VideoInfoPanel";
import { VolumeIcon, VolumePanel } from "./panels/VolumePanel";

/// Every toolbar entry is the same fixed square regardless of whether it
/// opens a panel or fires immediately — mixing pill-shaped and square
/// buttons in the same row was the main source of the "padding looks
/// off" complaint.
const BUTTON_SIZE = "flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors";

function ToolbarButton({
  icon,
  label,
  panel,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  panel: ToolbarPanel;
  children?: React.ReactNode;
}) {
  const activePanel = useUiStore((s) => s.activePanel);
  const setActivePanel = useUiStore((s) => s.setActivePanel);
  const open = activePanel === panel;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setActivePanel(open ? null : panel)}
        className={`${BUTTON_SIZE} ${open ? "bg-white/25" : "hover:bg-white/10"}`}
      >
        {icon}
      </button>
      <FloatingPanel open={open}>{children}</FloatingPanel>
    </div>
  );
}

export function Toolbar() {
  const isFullscreen = useUiStore((s) => s.isFullscreen);
  const setFullscreen = useUiStore((s) => s.setFullscreen);
  const activePanel = useUiStore((s) => s.activePanel);
  const setActivePanel = useUiStore((s) => s.setActivePanel);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const hasChapters = usePlayerStore((s) => s.chapters.length > 0);
  const chaptersOpen = activePanel === "chapters";

  return (
    <div className="flex items-center gap-1 rounded-full border border-glass-border bg-glass-tint px-1.5 py-1.5 shadow-lg backdrop-blur-glass">
      <ToolbarButton
        icon={<VolumeIcon volume={volume} muted={muted} />}
        label="Volume"
        panel="volume"
      >
        <VolumePanel />
      </ToolbarButton>
      <ToolbarButton icon={<Gauge size={18} />} label="Playback speed" panel="speed">
        <SpeedPanel />
      </ToolbarButton>
      <ToolbarButton icon={<Captions size={18} />} label="Subtitles" panel="subtitle">
        <SubtitleTrackPanel />
      </ToolbarButton>
      <ToolbarButton icon={<AudioLines size={18} />} label="Audio track" panel="audio">
        <AudioTrackPanel />
      </ToolbarButton>
      <ToolbarButton icon={<RectangleHorizontal size={18} />} label="Aspect ratio" panel="aspect">
        <AspectRatioPanel />
      </ToolbarButton>
      <ToolbarButton icon={<Sliders size={18} />} label="Color" panel="color">
        <ColorPanel />
      </ToolbarButton>
      <ToolbarButton icon={<Wand2 size={18} />} label="Rotate / flip" panel="transform">
        <TransformPanel />
      </ToolbarButton>
      <ToolbarButton icon={<Repeat size={18} />} label="Loop A-B" panel="loop">
        <LoopPanel />
      </ToolbarButton>
      <ToolbarButton icon={<Info size={18} />} label="Video info" panel="info">
        <VideoInfoPanel />
      </ToolbarButton>
      {hasChapters && (
        // The actual chapter list renders as its own top-right overlay
        // (ChapterPanel), not a dropdown here — this button just toggles
        // that panel's visibility, since "press C" was the only way to
        // discover it otherwise.
        <button
          type="button"
          aria-label="Chapters"
          title="Chapters"
          onClick={() => setActivePanel(chaptersOpen ? null : "chapters")}
          className={`${BUTTON_SIZE} ${chaptersOpen ? "bg-white/25" : "hover:bg-white/10"}`}
        >
          <ListVideo size={18} />
        </button>
      )}
      <button
        type="button"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        onClick={() => void windowToggleFullscreen().then(setFullscreen)}
        className={`${BUTTON_SIZE} hover:bg-white/10`}
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        onClick={() => void openSettingsWindow()}
        className={`${BUTTON_SIZE} hover:bg-white/10`}
      >
        <Settings size={18} />
      </button>
    </div>
  );
}
