import { useState } from "react";

import { SubtitleSearchPanel } from "./SubtitleSearchPanel";
import { SubtitleStylePanel } from "./SubtitleStylePanel";
import { SubtitleTrackPanel } from "./SubtitleTrackPanel";

const SECTIONS = [
  { id: "track", label: "Track", Component: SubtitleTrackPanel },
  { id: "style", label: "Style", Component: SubtitleStylePanel },
  { id: "search", label: "Search", Component: SubtitleSearchPanel },
] as const;

/// Subtitle track selection, style, and online search used to be three
/// separate toolbar buttons — reported as visual clutter for what's really
/// one subject. Combined into a single button with an internal tab strip.
export function SubtitlesMenu() {
  const [active, setActive] = useState<(typeof SECTIONS)[number]["id"]>("track");
  const ActiveComponent = SECTIONS.find((s) => s.id === active)?.Component ?? SubtitleTrackPanel;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-1 rounded-lg bg-black/20 p-0.5">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActive(section.id)}
            className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
              active === section.id ? "bg-white text-black" : "text-white/70 hover:bg-white/10"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
