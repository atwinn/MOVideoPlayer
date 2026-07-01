import { useState } from "react";

import { mpvSetAspect } from "../../../lib/tauriCommands";
import type { AspectMode } from "../../../lib/types";

const OPTIONS: { mode: AspectMode; label: string }[] = [
  { mode: "auto", label: "Original" },
  { mode: "sixteen9", label: "16:9" },
  { mode: "four3", label: "4:3" },
  { mode: "twenty-one9", label: "21:9" },
  { mode: "stretch", label: "Fill / Stretch" },
];

export function AspectRatioPanel() {
  const [active, setActive] = useState<AspectMode>("auto");

  return (
    <div className="flex min-w-[160px] flex-col gap-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          onClick={() => {
            setActive(opt.mode);
            void mpvSetAspect(opt.mode);
          }}
          className={`rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
            active === opt.mode ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
