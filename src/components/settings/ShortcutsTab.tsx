import { useEffect, useState } from "react";

import {
  ACTION_LABELS,
  defaultBindings,
  getBindings,
  normalizeKeyEvent,
  setBindings,
  type ActionId,
  type ShortcutBinding,
} from "../../lib/shortcuts/registry";
import { useSettingsStore } from "../../store/settingsStore";

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);
const ACTION_IDS = Object.keys(ACTION_LABELS) as ActionId[];

export function ShortcutsTab() {
  const update = useSettingsStore((s) => s.update);
  const [bindings, setLocalBindings] = useState<ShortcutBinding[]>(() => getBindings());
  const [listeningFor, setListeningFor] = useState<ActionId | null>(null);

  useEffect(() => {
    if (listeningFor === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (MODIFIER_KEYS.has(e.key)) return; // wait for a non-modifier key
      if (e.key === "Escape") {
        setListeningFor(null);
        return;
      }
      const keys = normalizeKeyEvent(e);
      // Replace whatever this action was previously bound to, and drop any
      // other action currently bound to the same combo — one key can't
      // dispatch to two actions at once.
      const next = bindings
        .filter((b) => b.action !== listeningFor && b.keys !== keys)
        .concat({ keys, action: listeningFor });
      setBindings(next);
      setLocalBindings(next);
      setListeningFor(null);
      void update({ shortcuts: next });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [listeningFor, bindings, update]);

  const resetToDefaults = () => {
    setBindings(defaultBindings);
    setLocalBindings(defaultBindings);
    // Empty is the "use hardcoded defaults" sentinel App.tsx checks on load.
    void update({ shortcuts: [] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">Click a key, then press the new combo. Esc cancels.</p>
        <button
          type="button"
          onClick={resetToDefaults}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
        >
          Reset to defaults
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {ACTION_IDS.map((actionId) => {
          const binding = bindings.find((b) => b.action === actionId);
          const listening = listeningFor === actionId;
          return (
            <div
              key={actionId}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
            >
              <span>{ACTION_LABELS[actionId]}</span>
              <button
                type="button"
                onClick={() => setListeningFor(actionId)}
                className={`min-w-[110px] rounded-lg px-2 py-1 text-center text-xs tabular-nums ${
                  listening ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {listening ? "Press a key…" : (binding?.keys ?? "Unbound")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
