use tauri::{AppHandle, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::window::vibrancy;

// Minimize/maximize/close are handled by the OS via native window
// decorations (tauri.conf.json's main window has decorations:true) — no
// commands needed for those. Fullscreen has no native control, so it's
// still ours.
#[tauri::command]
pub async fn window_toggle_fullscreen(window: WebviewWindow) -> Result<bool, String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window
        .set_fullscreen(!is_fullscreen)
        .map_err(|e| e.to_string())?;
    Ok(!is_fullscreen)
}

/// Creates the settings window on first use, or focuses it if it's
/// already open. Same SPA bundle as the main window — `main.tsx` branches
/// on `getCurrentWindow().label` to decide which React tree to mount.
#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(existing) = app.get_webview_window("settings") {
        return existing.set_focus().map_err(|e| e.to_string());
    }
    let window = WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("index.html".into()))
        .title("Settings")
        .inner_size(640.0, 480.0)
        .min_inner_size(480.0, 360.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;
    vibrancy::apply_glass_backdrop(&window, None);
    Ok(())
}
