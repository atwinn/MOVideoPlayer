import { mpvSetTrack } from "../../../lib/tauriCommands";
import { usePlayerStore } from "../../../store/playerStore";

export function AudioTrackPanel() {
  const audioTracks = usePlayerStore((s) => s.tracks.audio);

  return (
    <div className="flex max-h-64 min-w-[200px] flex-col gap-0.5 overflow-y-auto">
      {audioTracks.map((track) => (
        <button
          key={track.id}
          type="button"
          onClick={() => void mpvSetTrack("audio", track.id)}
          className={`rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
            track.selected ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {track.title ?? track.lang ?? `Track ${track.id}`}
        </button>
      ))}
      {audioTracks.length === 0 && (
        <p className="px-2 py-1.5 text-sm text-white/60">No audio tracks</p>
      )}
    </div>
  );
}
