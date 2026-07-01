import { useSettingsStore } from "../../store/settingsStore";

export function InterfaceTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Overlay auto-hide delay (ms)
        <input
          type="number"
          step={50}
          min={0}
          max={5000}
          value={settings.interface.overlay_hide_timeout_ms}
          onChange={(e) =>
            void update({
              interface: {
                ...settings.interface,
                overlay_hide_timeout_ms: Number(e.target.value) || 500,
              },
            })
          }
          className="w-28 rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Theme
        <select
          value={settings.interface.theme}
          onChange={(e) =>
            void update({
              interface: {
                ...settings.interface,
                theme: e.target.value as "system" | "dark" | "light",
              },
            })
          }
          className="w-40 rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
        >
          <option value="system">System</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
    </div>
  );
}
