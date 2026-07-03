use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::Arc;

use tokio::sync::RwLock;

use crate::mpv::MpvController;
use crate::persistence::PersistenceStore;

/// Sentinel for "not yet known" in the HWND caches below — real HWNDs are
/// never zero, so this is safe to use with plain atomics for lock-free
/// reads from the synchronous window-event callback.
const NO_HWND: isize = 0;

pub struct AppState {
    pub mpv: Arc<MpvController>,
    pub persistence: Arc<PersistenceStore>,
    pub main_hwnd: AtomicIsize,
    pub mpv_child_hwnd: AtomicIsize,
    pub current_file: RwLock<Option<String>>,
}

impl AppState {
    pub fn new(mpv: Arc<MpvController>, persistence: Arc<PersistenceStore>) -> Self {
        Self {
            mpv,
            persistence,
            main_hwnd: AtomicIsize::new(NO_HWND),
            mpv_child_hwnd: AtomicIsize::new(NO_HWND),
            current_file: RwLock::new(None),
        }
    }

    pub fn set_main_hwnd(&self, hwnd: isize) {
        self.main_hwnd.store(hwnd, Ordering::Relaxed);
    }

    pub fn set_mpv_child_hwnd(&self, hwnd: isize) {
        self.mpv_child_hwnd.store(hwnd, Ordering::Relaxed);
    }

    pub fn mpv_child_hwnd(&self) -> isize {
        self.mpv_child_hwnd.load(Ordering::Relaxed)
    }

    /// Re-pins mpv's embedded child window to the main window's current
    /// client rect. No-op until both HWNDs are known (mpv may still be
    /// starting) or on non-Windows platforms.
    pub fn resync_embed(&self) {
        let main = self.main_hwnd.load(Ordering::Relaxed);
        let child = self.mpv_child_hwnd.load(Ordering::Relaxed);
        if main != NO_HWND && child != NO_HWND {
            let _ = crate::window::embed::resync(main, child);
        }
    }
}
