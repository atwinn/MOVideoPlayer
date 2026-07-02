import { FolderOpen } from "lucide-react";

import {
  mpvLoadSubtitle,
  mpvSetProperty,
  mpvSetTrack,
  openSubtitleDialog,
} from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

export function SubtitleTrackPanel() {
  const subtitles = usePlayerStore((s) => s.tracks.subtitle);
  const setLastError = usePlayerStore((s) => s.setLastError);
  const noneSelected = !subtitles.some((t) => t.selected);

  const loadSubtitleFile = async () => {
    const path = await openSubtitleDialog();
    if (!path) return;
    try {
      await mpvLoadSubtitle(path);
    } catch (err) {
      setLastError(`Couldn't load subtitle "${path}": ${String(err)}`);
    }
  };

  return (
    <div className="flex max-h-64 min-w-[200px] flex-col gap-0.5 overflow-y-auto">
      <button
        type="button"
        onClick={() => void mpvSetProperty("sid", "no")}
        className={`rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
          noneSelected ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        Off
      </button>
      {subtitles.map((track) => (
        <button
          key={track.id}
          type="button"
          onClick={() => void mpvSetTrack("sub", track.id)}
          className={`rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
            track.selected ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {track.title ?? track.lang ?? `Track ${track.id}`}
        </button>
      ))}
      {subtitles.length === 0 && (
        <p className="px-2 py-1.5 text-sm text-white/60">No subtitle tracks</p>
      )}
      <div className="my-1 h-px bg-white/10" />
      <button
        type="button"
        onClick={() => void loadSubtitleFile()}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <FolderOpen size={14} />
        Load subtitle file…
      </button>
    </div>
  );
}
