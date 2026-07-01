# MOVideoPlayer

A native Windows video player built on Tauri 2 + Rust + React, with [mpv](https://mpv.io)
as the sole playback engine — controlled exclusively over its JSON IPC
protocol (named pipe), embedded as a native child window. No custom
decoder or subtitle renderer; mpv owns all of that.

This is Windows-only. It cannot run or be meaningfully previewed on macOS —
HWND embedding, DXVA2/D3D11/NVDEC hardware decode, and Mica/Acrylic are all
Windows APIs.

## Status: M1 (core shell)

Single-window "fake glass" milestone: mpv embedded and controlled end to
end, transport/timeline/toolbar/shortcuts working, overlay rendered as
normal translucent-tint DOM content (no real blur-of-video yet). See
`docs/` — actually see the plan this was built from for the full
milestone breakdown; the short version:

- **M1 (this milestone)**: proves the mpv subprocess + IPC + HWND-embed +
  CI-bundling pipeline works, with a usable if visually simpler overlay.
- **M2 (next)**: spike a second top-level acrylic `WebviewWindow` stacked
  above the main window, to test whether Windows' Acrylic blur-behind
  actually composites the live mpv video underneath it. Only real Windows
  hardware can answer this.

Deferred beyond M1/M2: Blu-ray/DVD/ISO, HDR/Dolby Vision tuning, real
online subtitle search (UI + provider interface exist, provider is a
mock), unlimited loop regions, color/crop panels, thumbnail previews,
multi-window playlists, shortcut *editor* UI, localization beyond English,
file-type associations, a plugin loader.

## Building

Real builds happen in CI (`.github/workflows/build-windows.yml`, runs on
`windows-latest`) — that's the only place this can actually run mpv and
open a real window. It downloads a pinned mpv build
(`scripts/fetch-mpv.ps1`) into `src-tauri/resources/mpv/` before bundling,
so end users never need mpv installed separately.

```
npm ci
./scripts/fetch-mpv.ps1   # Windows only — stages mpv.exe + DLLs
npx tauri build -- --bundles msi,nsis
```

## Developing on macOS

You can't run the app, but you can typecheck everything:

```
npm run build                # frontend: tsc + vite build
(cd src-tauri && cargo check)                       # host target — shared, non-Windows code
./scripts/check-windows.sh                          # Windows target — the real HWND/IPC/vibrancy code
```

`check-windows.sh` cross-checks the Windows-gated Rust (mpv named-pipe IPC,
HWND embedding, `WM_NCHITTEST` subclassing, Mica/Acrylic) against
`x86_64-pc-windows-msvc` *without* a Windows SDK or linker — `cargo check`
never links. The only missing piece is a resource compiler for
`tauri-winres`' icon/version embedding step; `brew install llvm` provides
`llvm-rc` for that.

### exFAT gotcha

This repo lives on an exFAT volume. macOS scatters `._*` AppleDouble
sidecar files there, which break Tauri's capability-schema codegen
("stream did not contain valid UTF-8"). `check-windows.sh` purges them
before checking; do the same before any other `cargo` invocation:

```
find . -name '._*' -not -path '*/node_modules/*' -delete
```

`src-tauri/.cargo/config.toml` points `CARGO_TARGET_DIR` at an APFS path
(`~/.cache/movideoplayer-target`) so Cargo's own build artifacts don't
land back on exFAT.

## Architecture

- `src-tauri/src/mpv/` — subprocess spawn/supervision (`process.rs`),
  newline-delimited JSON IPC client over a Windows named pipe (`ipc.rs`),
  wire protocol types (`protocol.rs`).
- `src-tauri/src/window/` — borderless chrome + Snap Layout support
  (`chrome.rs`), mpv HWND embedding/resize-sync (`embed.rs`), Mica/Acrylic
  (`vibrancy.rs`).
- `src-tauri/src/commands/` — the Tauri command surface the frontend calls.
- `src-tauri/src/persistence/` — resume state (position/tracks/volume) and
  settings, hand-rolled `serde_json` store (not `tauri-plugin-store`, so
  resume entries can be LRU-capped and schema-versioned).
- `src/store/` — Zustand stores mirroring mpv's live properties (`playerStore`),
  overlay/clean-mode UI state (`uiStore`), and settings (`settingsStore`).
- `src/lib/shortcuts/` — data-driven `keys → action` registry, built so a
  future rebind-editor UI only needs to mutate the binding list.
