import { AudioLines, Camera, Captions, Gauge, Maximize, Minimize, RectangleHorizontal, Settings } from "lucide-react";

import { mpvScreenshot, openSettingsWindow, windowToggleFullscreen } from "../../lib/tauriCommands";
import { useUiStore, type ToolbarPanel } from "../../store/uiStore";
import { FloatingPanel } from "./FloatingPanel";
import { AspectRatioPanel } from "./panels/AspectRatioPanel";
import { AudioTrackPanel } from "./panels/AudioTrackPanel";
import { SpeedPanel } from "./panels/SpeedPanel";
import { SubtitleTrackPanel } from "./panels/SubtitleTrackPanel";

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
        onClick={() => setActivePanel(open ? null : panel)}
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-white transition-colors ${
          open ? "bg-white/25" : "hover:bg-white/10"
        }`}
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

  return (
    <div className="flex items-center gap-1 rounded-full border border-glass-border bg-glass-tint px-2 py-1 shadow-lg backdrop-blur-glass">
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
        onClick={() => void mpvScreenshot()}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        <Camera size={18} />
      </button>
      <button
        type="button"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        onClick={() => void windowToggleFullscreen().then(setFullscreen)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
      <button
        type="button"
        aria-label="Settings"
        onClick={() => void openSettingsWindow()}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        <Settings size={18} />
      </button>
    </div>
  );
}
