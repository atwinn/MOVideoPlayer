import { useSettingsStore } from "../../store/settingsStore";

export function PlaybackTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center justify-between text-sm">
        Remember last playback speed
        <input
          type="checkbox"
          checked={settings.playback.remember_speed}
          onChange={(e) =>
            void update({
              playback: { ...settings.playback, remember_speed: e.target.checked },
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Default playback speed
        <input
          type="number"
          step={0.05}
          min={0.25}
          max={4}
          value={settings.playback.default_speed}
          onChange={(e) =>
            void update({
              playback: {
                ...settings.playback,
                default_speed: Number(e.target.value) || 1,
              },
            })
          }
          className="w-24 rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Default volume
        <input
          type="range"
          min={0}
          max={100}
          value={settings.playback.volume}
          onChange={(e) =>
            void update({
              playback: { ...settings.playback, volume: Number(e.target.value) },
            })
          }
        />
      </label>
    </div>
  );
}
