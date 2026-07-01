// TEMPORARY: keeping the console subsystem in release builds too, so
// `tracing` output (mpv startup/IPC diagnostics) is visible in a terminal
// window instead of going nowhere. Restore
// `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`
// once the "video won't open" issue is root-caused and fixed.

fn main() {
    movideoplayer_lib::run();
}
