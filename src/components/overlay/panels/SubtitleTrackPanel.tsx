import { mpvSetProperty, mpvSetTrack } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

export function SubtitleTrackPanel() {
  const subtitles = usePlayerStore((s) => s.tracks.subtitle);
  const noneSelected = !subtitles.some((t) => t.selected);

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
    </div>
  );
}
