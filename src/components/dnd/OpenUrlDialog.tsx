import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { mpvLoadFile } from "../../lib/tauriCommands";
import { usePlayerStore } from "../../store/playerStore";

export function OpenUrlDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const setFilePath = usePlayerStore((s) => s.setFilePath);
  const setLastError = usePlayerStore((s) => s.setLastError);

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      await mpvLoadFile(trimmed, false);
      setFilePath(trimmed);
      setUrl("");
      onClose();
    } catch (err) {
      setLastError(`Couldn't open "${trimmed}": ${String(err)}`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-glass border border-glass-border bg-glass-tint p-4 text-white shadow-2xl backdrop-blur-glass"
          >
            <p className="mb-2 text-sm font-medium">Open URL</p>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
                if (e.key === "Escape") onClose();
              }}
              placeholder="https://, rtsp://, smb://, ..."
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-black hover:bg-white/90"
              >
                Open
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
