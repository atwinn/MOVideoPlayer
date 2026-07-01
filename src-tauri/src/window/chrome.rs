//! Borderless-window chrome: resize-border hit-testing and Windows 11 Snap
//! Layout support for the custom maximize button, via `WM_NCHITTEST`
//! subclassing. Titlebar drag itself is handled by Tauri's own
//! `data-tauri-drag-region`/`startDragging()` and needs no Win32 code.
//! Windows-only; no-op elsewhere.

use std::sync::atomic::{AtomicI32, Ordering};
use std::sync::Arc;

use tauri::WebviewWindow;

/// Screen-space rect of the custom maximize button, kept in sync from the
/// frontend via `set_maximize_button_rect` so `WM_NCHITTEST` can report
/// `HTMAXBUTTON` over it and trigger the native Snap Layout flyout.
#[derive(Default)]
pub struct MaximizeButtonRect {
    left: AtomicI32,
    top: AtomicI32,
    right: AtomicI32,
    bottom: AtomicI32,
}

impl MaximizeButtonRect {
    pub fn set(&self, left: i32, top: i32, right: i32, bottom: i32) {
        self.left.store(left, Ordering::Relaxed);
        self.top.store(top, Ordering::Relaxed);
        self.right.store(right, Ordering::Relaxed);
        self.bottom.store(bottom, Ordering::Relaxed);
    }

    fn contains(&self, x: i32, y: i32) -> bool {
        x >= self.left.load(Ordering::Relaxed)
            && x < self.right.load(Ordering::Relaxed)
            && y >= self.top.load(Ordering::Relaxed)
            && y < self.bottom.load(Ordering::Relaxed)
    }
}

pub fn install(window: &WebviewWindow, maximize_rect: Arc<MaximizeButtonRect>) {
    win::install(window, maximize_rect);
}

#[cfg(target_os = "windows")]
mod win {
    use super::MaximizeButtonRect;
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use std::ffi::c_void;
    use std::sync::Arc;
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowRect, HTBOTTOM, HTBOTTOMLEFT, HTBOTTOMRIGHT, HTCLIENT, HTLEFT, HTMAXBUTTON,
        HTRIGHT, HTTOP, HTTOPLEFT, HTTOPRIGHT, WM_NCHITTEST,
    };

    const RESIZE_BORDER_PX: i32 = 8;
    const SUBCLASS_ID: usize = 1;

    pub fn install(window: &tauri::WebviewWindow, maximize_rect: Arc<MaximizeButtonRect>) {
        let Ok(RawWindowHandle::Win32(handle)) = window.window_handle().map(|h| h.as_raw()) else {
            return;
        };
        let hwnd = HWND(handle.hwnd.get() as *mut c_void);
        let ctx = Box::new(maximize_rect);
        let ctx_ptr = Box::into_raw(ctx) as usize;
        unsafe {
            let _ = SetWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID, ctx_ptr);
        }
    }

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _uidsubclass: usize,
        dwrefdata: usize,
    ) -> LRESULT {
        if msg == WM_NCHITTEST {
            let maximize_rect = &*(dwrefdata as *const MaximizeButtonRect);
            let x = (lparam.0 & 0xFFFF) as i16 as i32;
            let y = ((lparam.0 >> 16) & 0xFFFF) as i16 as i32;

            if maximize_rect.contains(x, y) {
                return LRESULT(HTMAXBUTTON as isize);
            }

            let mut window_rect = Default::default();
            if GetWindowRect(hwnd, &mut window_rect).is_ok() {
                let hit = hit_test_resize_border(&window_rect, x, y);
                if let Some(hit) = hit {
                    return LRESULT(hit as isize);
                }
            }
            return LRESULT(HTCLIENT as isize);
        }
        DefSubclassProc(hwnd, msg, wparam, lparam)
    }

    fn hit_test_resize_border(
        rect: &windows::Win32::Foundation::RECT,
        x: i32,
        y: i32,
    ) -> Option<u32> {
        let on_left = x < rect.left + RESIZE_BORDER_PX;
        let on_right = x >= rect.right - RESIZE_BORDER_PX;
        let on_top = y < rect.top + RESIZE_BORDER_PX;
        let on_bottom = y >= rect.bottom - RESIZE_BORDER_PX;

        match (on_left, on_right, on_top, on_bottom) {
            (true, _, true, _) => Some(HTTOPLEFT),
            (_, true, true, _) => Some(HTTOPRIGHT),
            (true, _, _, true) => Some(HTBOTTOMLEFT),
            (_, true, _, true) => Some(HTBOTTOMRIGHT),
            (true, false, false, false) => Some(HTLEFT),
            (false, true, false, false) => Some(HTRIGHT),
            (false, false, true, false) => Some(HTTOP),
            (false, false, false, true) => Some(HTBOTTOM),
            _ => None,
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod win {
    use super::MaximizeButtonRect;
    use std::sync::Arc;

    pub fn install(_window: &tauri::WebviewWindow, _maximize_rect: Arc<MaximizeButtonRect>) {}
}
