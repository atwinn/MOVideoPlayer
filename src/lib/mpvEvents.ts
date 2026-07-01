import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import { usePlayerStore } from "../store/playerStore";
import { mpvListTracks } from "./tauriCommands";
import type { ControllerEvent } from "./types";

/// Subscribes to the single `mpv://event` channel emitted from Rust and
/// fans it out into the relevant Zustand store. Call once at app startup;
/// returns an unlisten function for cleanup.
export async function initMpvEventBridge(): Promise<UnlistenFn> {
  return listen<ControllerEvent>("mpv://event", (message) => {
    const event = message.payload;
    const player = usePlayerStore.getState();

    switch (event.kind) {
      case "Mpv": {
        player.setMpvAlive(true);
        const mpvEvent = event.payload;
        if (mpvEvent.event === "property-change") {
          player.applyPropertyChange(mpvEvent.name, mpvEvent.data);
          if (mpvEvent.name === "track-list") {
            mpvListTracks().then(player.setTracks).catch(() => {});
          }
        }
        break;
      }
      case "Crashed":
        player.setMpvAlive(false);
        break;
      case "Respawned":
        player.setMpvAlive(true);
        break;
      case "RespawnFailed":
        player.setMpvAlive(false);
        break;
    }
  });
}
