import { Captions, Keyboard, Monitor, Palette, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { useSettingsStore } from "../../store/settingsStore";
import { GeneralTab } from "./GeneralTab";
import { InterfaceTab } from "./InterfaceTab";
import { OnlineSubsTab } from "./OnlineSubsTab";
import { PlaybackTab } from "./PlaybackTab";
import { ShortcutsTab } from "./ShortcutsTab";

const TABS = [
  { id: "general", label: "General", icon: SlidersHorizontal, Component: GeneralTab },
  { id: "playback", label: "Playback", icon: Monitor, Component: PlaybackTab },
  { id: "interface", label: "Interface", icon: Palette, Component: InterfaceTab },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard, Component: ShortcutsTab },
  { id: "subtitles", label: "Online Subtitles", icon: Captions, Component: OnlineSubsTab },
] as const;

export function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("general");
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTabMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const ActiveComponent = activeTabMeta.Component;

  return (
    <div className="flex h-screen w-screen bg-glass-tint text-white">
      <nav className="flex w-44 flex-col gap-1 border-r border-glass-border p-3">
        <p className="px-2 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-white/40">
          Settings
        </p>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-4 text-base font-semibold">{activeTabMeta.label}</h1>
        {loaded ? <ActiveComponent /> : <p className="text-sm text-white/50">Loading…</p>}
      </div>
    </div>
  );
}
