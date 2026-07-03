//! Positions mpv's native child HWND (created via `--wid`) to fill the main
//! window's client rect, at the bottom of the Z-order so the WebView2
//! overlay's transparent regions show the video through it. Windows-only —
//! see module docs on `mpv::ipc` for why the rest of the platform gets a
//! no-op stub.

use tauri::WebviewWindow;

#[derive(Debug)]
pub struct EmbedError(pub String);

impl std::fmt::Display for EmbedError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "window embed error: {}", self.0)
    }
}

impl std::error::Error for EmbedError {}

impl From<EmbedError> for String {
    fn from(e: EmbedError) -> Self {
        e.to_string()
    }
}

/// Returns the raw HWND (as an isize) of the given window, to be passed to
/// mpv as `--wid`.
pub fn main_hwnd(window: &WebviewWindow) -> Result<isize, EmbedError> {
    win::main_hwnd(window)
}

/// Single, non-blocking attempt to locate and embed mpv's child window — no
/// internal poll/sleep loop. Meant to be called repeatedly from a caller
/// that already has its own retry cadence (e.g. once per incoming mpv
/// event), so a slow first attempt doesn't permanently strand video
/// embedding: mpv's window-creation time varies (GPU/driver init, cold
/// start) and has been observed taking well over the fast-path deadline
/// below on real hardware.
pub fn try_embed_once(parent: isize, mpv_pid: u32) -> Option<isize> {
    win::try_embed_once(parent, mpv_pid)
}

/// Re-applies the full-client-rect position to an already-located mpv child
/// window. Call on every `Resized`/`Moved`/scale-factor-changed event.
pub fn resync(parent: isize, mpv_child: isize) -> Result<(), EmbedError> {
    win::resync(parent, mpv_child)
}

#[cfg(target_os = "windows")]
mod win {
    use super::EmbedError;
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use std::ffi::c_void;
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumChildWindows, GetClientRect, GetWindowThreadProcessId, SetWindowPos, HWND_BOTTOM,
        SWP_NOACTIVATE,
    };

    pub fn main_hwnd(window: &tauri::WebviewWindow) -> Result<isize, EmbedError> {
        match window
            .window_handle()
            .map_err(|e| EmbedError(e.to_string()))?
            .as_raw()
        {
            RawWindowHandle::Win32(handle) => Ok(handle.hwnd.get() as isize),
            _ => Err(EmbedError("window is not a Win32 window".into())),
        }
    }

    struct FindByPid {
        pid: u32,
        found: Option<isize>,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let ctx = &mut *(lparam.0 as *mut FindByPid);
        let mut child_pid = 0u32;
        let _ = GetWindowThreadProcessId(hwnd, Some(&mut child_pid));
        if child_pid == ctx.pid {
            ctx.found = Some(hwnd.0 as isize);
            return BOOL(0);
        }
        BOOL(1)
    }

    pub fn try_embed_once(parent: isize, mpv_pid: u32) -> Option<isize> {
        let mut ctx = FindByPid {
            pid: mpv_pid,
            found: None,
        };
        unsafe {
            let _ = EnumChildWindows(
                Some(HWND(parent as *mut c_void)),
                Some(enum_proc),
                LPARAM(&mut ctx as *mut _ as isize),
            );
        }
        let child = ctx.found?;
        resync(parent, child).ok()?;
        Some(child)
    }

    pub fn resync(parent: isize, mpv_child: isize) -> Result<(), EmbedError> {
        unsafe {
            let mut rect = RECT::default();
            GetClientRect(HWND(parent as *mut c_void), &mut rect)
                .map_err(|e| EmbedError(e.to_string()))?;
            SetWindowPos(
                HWND(mpv_child as *mut c_void),
                Some(HWND_BOTTOM),
                0,
                0,
                rect.right - rect.left,
                rect.bottom - rect.top,
                SWP_NOACTIVATE,
            )
            .map_err(|e| EmbedError(e.to_string()))?;
        }
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
mod win {
    use super::EmbedError;

    pub fn main_hwnd(_window: &tauri::WebviewWindow) -> Result<isize, EmbedError> {
        Err(EmbedError("window embedding is only supported on Windows".into()))
    }

    pub fn resync(_parent: isize, _mpv_child: isize) -> Result<(), EmbedError> {
        Err(EmbedError("window embedding is only supported on Windows".into()))
    }

    pub fn try_embed_once(_parent: isize, _mpv_pid: u32) -> Option<isize> {
        None
    }
}
