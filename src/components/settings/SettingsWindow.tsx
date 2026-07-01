import { useEffect, useState } from "react";

import { useSettingsStore } from "../../store/settingsStore";
import { GeneralTab } from "./GeneralTab";
import { InterfaceTab } from "./InterfaceTab";
import { PlaybackTab } from "./PlaybackTab";

const TABS = [
  { id: "general", label: "General", Component: GeneralTab },
  { id: "playback", label: "Playback", Component: PlaybackTab },
  { id: "interface", label: "Interface", Component: InterfaceTab },
] as const;

export function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("general");
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    void load();
  }, [load]);

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component ?? GeneralTab;

  return (
    <div className="flex h-screen w-screen bg-[#1a1a1e] text-white">
      <nav className="flex w-40 flex-col gap-1 border-r border-white/10 p-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
              activeTab === tab.id ? "bg-white/15" : "hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 p-6">
        {loaded ? <ActiveComponent /> : <p className="text-sm text-white/50">Loading…</p>}
      </div>
    </div>
  );
}
