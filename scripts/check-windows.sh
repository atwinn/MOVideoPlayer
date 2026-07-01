#!/usr/bin/env bash
# Typechecks the Windows-gated Rust code (mpv IPC, HWND embedding,
# WM_NCHITTEST subclassing, vibrancy) from a macOS dev machine.
#
# `cargo check` never links, so cross-checking against x86_64-pc-windows-msvc
# works WITHOUT a Windows SDK or MSVC linker — the only missing piece is a
# resource compiler for tauri-winres' icon/version embedding step, which
# `rc.exe`/`llvm-rc` provides. `brew install llvm` ships `llvm-rc`.
#
# This does not replace CI (nothing here can run mpv or open a real HWND),
# but it catches real Rust compile errors in the Windows-only code paths
# far faster than round-tripping through GitHub Actions.
set -euo pipefail
cd "$(dirname "$0")/.."

# exFAT AppleDouble sidecar files break Tauri's capability-schema codegen.
find . -name '._*' -not -path '*/node_modules/*' -delete

if command -v llvm-rc >/dev/null 2>&1; then
  : # already on PATH
elif [ -x /opt/homebrew/opt/llvm/bin/llvm-rc ]; then
  export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
else
  echo "llvm-rc not found — run: brew install llvm" >&2
  exit 1
fi

cd src-tauri
cargo check --target x86_64-pc-windows-msvc
