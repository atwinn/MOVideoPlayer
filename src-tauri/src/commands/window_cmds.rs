use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::state::AppState;
use crate::window::vibrancy;

#[tauri::command]
pub async fn window_minimize(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn window_toggle_maximize(window: WebviewWindow) -> Result<(), String> {
    let maximized = window.is_maximized().map_err(|e| e.to_string())?;
    if maximized {
        window.unmaximize()
    } else {
        window.maximize()
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn window_close(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn window_toggle_fullscreen(window: WebviewWindow) -> Result<bool, String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window
        .set_fullscreen(!is_fullscreen)
        .map_err(|e| e.to_string())?;
    Ok(!is_fullscreen)
}

/// Called by the frontend whenever the custom maximize button's screen
/// rect changes (resize, DPI change, layout shift), so `WM_NCHITTEST` can
/// report `HTMAXBUTTON` over it and trigger the native Snap Layout flyout.
#[tauri::command]
pub async fn set_maximize_button_rect(
    state: State<'_, AppState>,
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
) -> Result<(), String> {
    state.maximize_rect.set(left, top, right, bottom);
    Ok(())
}

/// Creates the settings window on first use, or focuses it if it's
/// already open. Same SPA bundle as the main window — `main.tsx` branches
/// on `getCurrentWindow().label` to decide which React tree to mount.
#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
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
