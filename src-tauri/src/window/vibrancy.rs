//! Mica/Acrylic backdrop for the main window's app-chrome areas (titlebar,
//! letterbox bars). `window-vibrancy` dispatches to a platform-specific
//! implementation internally and returns `Err(UnsupportedPlatform)` on
//! anything but Windows, so this is safe to call unconditionally — no
//! `cfg` gating needed here.

use tauri::WebviewWindow;
use window_vibrancy::{apply_acrylic, apply_mica};

/// Applies Mica (Windows 11) and falls back to Acrylic (Windows 10 1809+)
/// if Mica isn't available. `dark` selects the tint; pass `None` to match
/// the system theme.
pub fn apply_glass_backdrop(window: &WebviewWindow, dark: Option<bool>) {
    if apply_mica(window, dark).is_ok() {
        return;
    }
    let _ = apply_acrylic(window, Some((18, 18, 18, 125)));
}
