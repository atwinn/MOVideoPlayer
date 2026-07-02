import {
  AudioLines,
  Camera,
  Captions,
  Gauge,
  Maximize,
  Minimize,
  RectangleHorizontal,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

import { mpvScreenshot, openSettingsWindow, windowToggleFullscreen } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";
import { useUiStore, type ToolbarPanel } from "../../store/uiStore";
import { FloatingPanel } from "./FloatingPanel";
import { AspectRatioPanel } from "./panels/AspectRatioPanel";
import { AudioTrackPanel } from "./panels/AudioTrackPanel";
import { SpeedPanel } from "./panels/SpeedPanel";
import { SubtitleTrackPanel } from "./panels/SubtitleTrackPanel";
import { VolumePanel } from "./panels/VolumePanel";

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

function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
  if (muted || volume === 0) return <VolumeX size={18} />;
  if (volume < 50) return <Volume1 size={18} />;
  return <Volume2 size={18} />;
}

export function Toolbar() {
  const isFullscreen = useUiStore((s) => s.isFullscreen);
  const setFullscreen = useUiStore((s) => s.setFullscreen);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);

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
      <button
        type="button"
        aria-label="Screenshot"
        title="Screenshot"
        onClick={() => void mpvScreenshot()}
        className={`${BUTTON_SIZE} hover:bg-white/10`}
      >
        <Camera size={18} />
      </button>
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
