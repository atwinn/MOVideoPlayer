import { useSettingsStore } from "../../store/settingsStore";

export function GeneralTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center justify-between text-sm">
        Resume playback where you left off
        <input
          type="checkbox"
          checked={settings.general.resume_playback}
          onChange={(e) =>
            void update({
              general: { ...settings.general, resume_playback: e.target.checked },
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Preferred audio language
        <input
          type="text"
          placeholder="e.g. en, vi, ja"
          value={settings.general.preferred_audio_language ?? ""}
          onChange={(e) =>
            void update({
              general: {
                ...settings.general,
                preferred_audio_language: e.target.value || null,
              },
            })
          }
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Preferred subtitle language
        <input
          type="text"
          placeholder="e.g. en, vi, ja"
          value={settings.general.preferred_subtitle_language ?? ""}
          onChange={(e) =>
            void update({
              general: {
                ...settings.general,
                preferred_subtitle_language: e.target.value || null,
              },
            })
          }
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
        />
      </label>
    </div>
  );
}
