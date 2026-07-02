mod commands;
mod mpv;
mod persistence;
mod state;
mod window;

use std::sync::Arc;

use tauri::{Emitter, Manager};

use commands::{files, playback, settings_cmds, tracks, window_cmds};
use mpv::{ControllerEvent, MpvController};
use persistence::PersistenceStore;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let main_window = app
                .get_webview_window("main")
                .expect("main window declared in tauri.conf.json must exist");

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("app data dir must be resolvable");
            let persistence = Arc::new(PersistenceStore::load(&app_data_dir));

            // bundle.resources in tauri.conf.json is the glob string
            // "resources/mpv/*" — Tauri's resource bundler preserves the
            // full relative path (including the "resources/" segment)
            // under $RESOURCE, it does NOT flatten to "mpv/*". Resolving
            // the wrong path here means Command::spawn silently fails
            // with a missing-file error that never reaches the user (see
            // the emit below for how we now surface it).
            let bundled_mpv = app
                .path()
                .resolve("resources/mpv/mpv.exe", tauri::path::BaseDirectory::Resource)
                .expect("bundled mpv.exe resource path must be resolvable");
            tracing::info!("resolved bundled mpv path: {}", bundled_mpv.display());
            tracing::info!("mpv binary exists on disk: {}", bundled_mpv.exists());

            let main_hwnd = match window::embed::main_hwnd(&main_window) {
                Ok(hwnd) => {
                    tracing::info!("main window hwnd: {hwnd}");
                    hwnd
                }
                Err(e) => {
                    tracing::error!("failed to get main window hwnd: {e}");
                    0
                }
            };
            let mpv_controller = MpvController::new(bundled_mpv, main_hwnd);

            let app_state = AppState::new(Arc::clone(&mpv_controller), Arc::clone(&persistence));
            app_state.set_main_hwnd(main_hwnd);
            app.manage(app_state);

            window::vibrancy::apply_glass_backdrop(&main_window, None);
            // TEMPORARILY DISABLED: the custom WM_NCHITTEST subclass was
            // meant to add edge-resize + Snap Layout hover support to this
            // undecorated window, but real-hardware testing showed it
            // breaks basic window dragging outright (data-tauri-drag-region
            // + startDragging() work fine on the natively-decorated
            // settings window, but freeze the main window solid — this
            // subclass is the only thing that differs between the two).
            // Re-enable once resize/hit-testing is reworked and confirmed
            // not to interfere with normal drag.
            // window::chrome::install(
            //     &main_window,
            //     Arc::clone(&app.state::<AppState>().maximize_rect),
            // );

            // Restore last window geometry, then reveal the window (it
            // starts hidden to avoid a flash of unstyled/undecorated content
            // before Mica/Acrylic is applied).
            {
                let persistence = Arc::clone(&persistence);
                let main_window = main_window.clone();
                tauri::async_runtime::spawn(async move {
                    let settings = persistence.snapshot().await;
                    let _ = main_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width: settings.window.width,
                        height: settings.window.height,
                    }));
                    if let (Some(x), Some(y)) = (settings.window.x, settings.window.y) {
                        let _ = main_window.set_position(tauri::Position::Logical(
                            tauri::LogicalPosition { x, y },
                        ));
                    }
                    let _ = main_window.show();
                });
            }

            // Spawn mpv, embed its video window, and forward every mpv/
            // controller event to the frontend for the lifetime of the app.
            {
                let app_handle = app.handle().clone();
                let mpv_controller = Arc::clone(&mpv_controller);
                tauri::async_runtime::spawn(async move {
                    tracing::info!("starting mpv...");
                    if let Err(e) = mpv_controller.start().await {
                        tracing::error!("failed to start mpv: {e}");
                        let _ = app_handle.emit("mpv://event", ControllerEvent::StartFailed(e.to_string()));
                        return;
                    }
                    tracing::info!("mpv started and IPC connected");

                    match mpv_controller.pid().await {
                        Some(pid) => {
                            tracing::info!("mpv pid: {pid}, embedding window...");
                            let state = app_handle.state::<AppState>();
                            let main_hwnd = state.main_hwnd.load(std::sync::atomic::Ordering::Relaxed);
                            match window::embed::embed_and_resize(main_hwnd, pid) {
                                Ok(child_hwnd) => {
                                    tracing::info!("mpv child hwnd embedded: {child_hwnd}");
                                    state.set_mpv_child_hwnd(child_hwnd);
                                }
                                Err(e) => tracing::warn!("mpv window embed failed: {e}"),
                            }
                        }
                        None => tracing::warn!("mpv started but pid() returned None (unexpected)"),
                    }

                    let mut events = mpv_controller.subscribe();
                    loop {
                        match events.recv().await {
                            Ok(event) => {
                                tracing::debug!("mpv event: {event:?}");
                                let _ = app_handle.emit("mpv://event", &event);
                                if let ControllerEvent::Crashed = event {
                                    let state = app_handle.state::<AppState>();
                                    state.set_mpv_child_hwnd(0);
                                }
                            }
                            Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                        }
                    }
                });
            }

            // Keep mpv's embedded window pinned to the client rect across
            // resize/move/DPI-change.
            {
                let app_handle = app.handle().clone();
                main_window.on_window_event(move |event| match event {
                    tauri::WindowEvent::Resized(_) | tauri::WindowEvent::ScaleFactorChanged { .. } => {
                        app_handle.state::<AppState>().resync_embed();
                    }
                    _ => {}
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            playback::mpv_play,
            playback::mpv_pause,
            playback::mpv_toggle_play,
            playback::mpv_seek,
            playback::mpv_set_property,
            playback::mpv_get_property,
            playback::mpv_set_speed,
            playback::mpv_set_volume,
            playback::mpv_toggle_mute,
            playback::mpv_screenshot,
            playback::mpv_load_file,
            playback::mpv_load_subtitle,
            playback::save_resume_state,
            tracks::mpv_list_tracks,
            tracks::mpv_set_track,
            tracks::mpv_set_aspect,
            window_cmds::window_minimize,
            window_cmds::window_toggle_maximize,
            window_cmds::window_close,
            window_cmds::window_toggle_fullscreen,
            window_cmds::set_maximize_button_rect,
            window_cmds::open_settings_window,
            files::open_video_dialog,
            files::open_subtitle_dialog,
            settings_cmds::get_settings,
            settings_cmds::set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
