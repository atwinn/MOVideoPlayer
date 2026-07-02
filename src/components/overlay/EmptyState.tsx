import { FolderOpen, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

import { OpenUrlDialog } from "../dnd/OpenUrlDialog";
import { mpvLoadFile, openVideoDialog } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";

export function EmptyState() {
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const setFilePath = usePlayerStore((s) => s.setFilePath);
  const setLastError = usePlayerStore((s) => s.setLastError);
  const hydrateFromMpv = usePlayerStore((s) => s.hydrateFromMpv);

  const openFile = async () => {
    const path = await openVideoDialog();
    if (!path) return;
    try {
      await mpvLoadFile(path, false);
      setFilePath(path);
      void hydrateFromMpv();
    } catch (err) {
      // A rejected invoke() here previously failed completely silently —
      // the UI just never switched away from this screen with no
      // indication why. Surface it instead.
      setLastError(`Couldn't open "${path}": ${String(err)}`);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/80">
      <p className="text-sm">Drop a video anywhere, or</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void openFile()}
          className="flex items-center gap-2 rounded-full border border-glass-border bg-glass-tint px-4 py-2 text-sm shadow-lg backdrop-blur-glass hover:bg-white/15"
        >
          <FolderOpen size={16} />
          Open File
        </button>
        <button
          type="button"
          onClick={() => setUrlDialogOpen(true)}
          className="flex items-center gap-2 rounded-full border border-glass-border bg-glass-tint px-4 py-2 text-sm shadow-lg backdrop-blur-glass hover:bg-white/15"
        >
          <LinkIcon size={16} />
          Open URL
        </button>
      </div>
      <OpenUrlDialog open={urlDialogOpen} onClose={() => setUrlDialogOpen(false)} />
    </div>
  );
}
