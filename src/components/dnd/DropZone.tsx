import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect, useState } from "react";

import { mpvLoadFile, mpvLoadSubtitle } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";

const VIDEO_EXTENSIONS = ["mp4", "mkv", "mov", "avi", "webm", "flv", "ts", "mpg", "mpeg", "m3u8"];
const SUBTITLE_EXTENSIONS = ["srt", "ass", "ssa", "vtt"];

function extensionOf(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

/// The whole main window accepts drops (video is always full-bleed), so
/// this has no fixed bounds of its own — it just listens window-wide and
/// shows a subtle highlight while a drag is in-flight.
export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const setFilePath = usePlayerStore((s) => s.setFilePath);
  const setLastError = usePlayerStore((s) => s.setLastError);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragging(true);
        } else if (event.payload.type === "leave") {
          setIsDragging(false);
        } else if (event.payload.type === "drop") {
          setIsDragging(false);
          const paths = event.payload.paths;
          const videoPath = paths.find((p) => VIDEO_EXTENSIONS.includes(extensionOf(p)));
          const subtitlePaths = paths.filter((p) => SUBTITLE_EXTENSIONS.includes(extensionOf(p)));

          if (videoPath) {
            mpvLoadFile(videoPath, false)
              .then(() => setFilePath(videoPath))
              .catch((err) => setLastError(`Couldn't open "${videoPath}": ${String(err)}`));
          }
          for (const subtitlePath of subtitlePaths) {
            mpvLoadSubtitle(subtitlePath).catch((err) =>
              setLastError(`Couldn't load subtitle "${subtitlePath}": ${String(err)}`),
            );
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => unlisten?.();
  }, [setFilePath, setLastError]);

  if (!isDragging) return null;

  return (
    <div className="pointer-events-none absolute inset-2 rounded-glass border-2 border-dashed border-white/60 bg-white/5" />
  );
}
