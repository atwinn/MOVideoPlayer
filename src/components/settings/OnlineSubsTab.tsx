import { useState } from "react";

import { testSubtitleProviderKey } from "../../lib/tauriCommands";
import type { SubtitleProvider } from "../../lib/types";
import { useSettingsStore } from "../../store/settingsStore";

type TestState = { status: "idle" | "testing" | "ok" | "error"; message?: string };

function ProviderKeyRow({
  provider,
  label,
  apiKey,
  onChange,
}: {
  provider: SubtitleProvider;
  label: string;
  apiKey: string | null;
  onChange: (value: string | null) => void;
}) {
  const [test, setTest] = useState<TestState>({ status: "idle" });

  const runTest = async () => {
    setTest({ status: "testing" });
    try {
      const message = await testSubtitleProviderKey(provider, apiKey ?? "");
      setTest({ status: "ok", message });
    } catch (err) {
      setTest({ status: "error", message: String(err) });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={apiKey ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="API key"
          className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
        />
        <button
          type="button"
          onClick={() => void runTest()}
          disabled={test.status === "testing"}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 disabled:opacity-50"
        >
          {test.status === "testing" ? "Testing…" : "Test key"}
        </button>
      </div>
      {test.status === "ok" && <p className="text-xs text-green-400">✓ {test.message}</p>}
      {test.status === "error" && <p className="text-xs text-red-400">✗ {test.message}</p>}
    </div>
  );
}

export function OnlineSubsTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const setKey = (field: keyof typeof settings.subtitle_providers) => (value: string | null) =>
    void update({
      subtitle_providers: { ...settings.subtitle_providers, [field]: value },
    });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-white/50">
        Used by the subtitle search panel in the player toolbar to look up subtitles for the
        currently playing file.
      </p>
      <ProviderKeyRow
        provider="opensubtitles"
        label="OpenSubtitles"
        apiKey={settings.subtitle_providers.opensubtitles_api_key}
        onChange={setKey("opensubtitles_api_key")}
      />
      <ProviderKeyRow
        provider="subdl"
        label="SubDL"
        apiKey={settings.subtitle_providers.subdl_api_key}
        onChange={setKey("subdl_api_key")}
      />
      <ProviderKeyRow
        provider="subsource"
        label="SubSource"
        apiKey={settings.subtitle_providers.subsource_api_key}
        onChange={setKey("subsource_api_key")}
      />
    </div>
  );
}
