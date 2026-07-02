import { LANGUAGE_OPTIONS } from "../../lib/languages";
import { useSettingsStore } from "../../store/settingsStore";

function LanguageSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
    >
      <option value="">No preference</option>
      {LANGUAGE_OPTIONS.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}

export function GeneralTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="flex flex-col gap-5">
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
      <label className="flex flex-col gap-1.5 text-sm">
        Preferred audio language
        <LanguageSelect
          value={settings.general.preferred_audio_language}
          onChange={(value) =>
            void update({
              general: { ...settings.general, preferred_audio_language: value },
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Preferred subtitle language
        <LanguageSelect
          value={settings.general.preferred_subtitle_language}
          onChange={(value) =>
            void update({
              general: { ...settings.general, preferred_subtitle_language: value },
            })
          }
        />
      </label>
    </div>
  );
}
