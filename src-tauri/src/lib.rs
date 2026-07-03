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

            // Race to embed mpv's video window the moment its OS process
            // exists, in parallel with (not after) start()'s IPC handshake
            // below. mpv's own window can appear, at whatever default
            // size/position it happens to pick, well before the IPC pipe
            // connects and every observe_property round-trip completes —
            // waiting for all of that first left a window where mpv's
            // unsized video surface could overlap the native titlebar and
            // swallow the clicks that would otherwise start a window drag,
            // right after every app launch.
            {
                let app_handle = app.handle().clone();
                let mpv_controller = Arc::clone(&mpv_controller);
                tauri::async_runtime::spawn(async move {
                    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(10);
                    loop {
                        if let Some(pid) = mpv_controller.early_pid() {
                            let state = app_handle.state::<AppState>();
                            let main_hwnd = state.main_hwnd.load(std::sync::atomic::Ordering::Relaxed);
                            if let Some(child_hwnd) = window::embed::try_embed_once(main_hwnd, pid) {
                                tracing::info!("mpv child hwnd embedded (early race): {child_hwnd}");
                                state.set_mpv_child_hwnd(child_hwnd);
                                return;
                            }
                        }
                        if tokio::time::Instant::now() >= deadline {
                            // Not fatal — the per-event retry below keeps
                            // trying for the rest of the session.
                            return;
                        }
                        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
                    }
                });
            }

            // Spawn mpv and forward every mpv/controller event to the
            // frontend for the lifetime of the app.
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

                    // Windows passes a double-clicked/"Open with"-launched
                    // file's path as argv[1] (argv[0] is the exe itself).
                    // Without this, registering the file association
                    // (tauri.conf.json's bundle.fileAssociations) only gets
                    // the app to *launch* — the file itself was silently
                    // dropped on the floor.
                    let launch_arg = std::env::args().nth(1);
                    if let Some(path) = launch_arg {
                        tracing::info!("opening file from launch argument: {path}");
                        let state = app_handle.state::<AppState>();
                        if let Err(e) = playback::mpv_load_file(state, path.clone(), false).await {
                            tracing::error!("failed to open launch-argument file: {e}");
                        } else {
                            let _ = app_handle.emit("app://file-opened", &path);
                        }
                    }

                    let mut events = mpv_controller.subscribe();
                    loop {
                        match events.recv().await {
                            Ok(event) => {
                                tracing::debug!("mpv event: {event:?}");
                                let _ = app_handle.emit("mpv://event", &event);
                                let state = app_handle.state::<AppState>();
                                if let ControllerEvent::Crashed = event {
                                    state.set_mpv_child_hwnd(0);
                                } else if state.mpv_child_hwnd() == 0 {
                                    // The one-shot embed attempt right after
                                    // start() raced mpv's own window creation
                                    // and lost (mpv's startup time varies —
                                    // GPU/driver init, cold start — and has
                                    // been observed taking well over that
                                    // attempt's deadline). Retry on every
                                    // subsequent event so embedding still
                                    // converges instead of leaving the video
                                    // surface stranded, unsized, for the rest
                                    // of the session.
                                    if let Some(pid) = mpv_controller.pid().await {
                                        let main_hwnd = state.main_hwnd.load(std::sync::atomic::Ordering::Relaxed);
                                        if let Some(child_hwnd) = window::embed::try_embed_once(main_hwnd, pid) {
                                            tracing::info!("mpv child hwnd embedded (retry): {child_hwnd}");
                                            state.set_mpv_child_hwnd(child_hwnd);
                                        }
                                    }
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
            playback::mpv_load_file,
            playback::mpv_load_subtitle,
            playback::save_resume_state,
            tracks::mpv_list_tracks,
            tracks::mpv_set_track,
            tracks::mpv_set_aspect,
            tracks::mpv_video_info,
            tracks::mpv_set_video_filter,
            window_cmds::window_toggle_fullscreen,
            window_cmds::open_settings_window,
            files::open_video_dialog,
            files::open_subtitle_dialog,
            settings_cmds::get_settings,
            settings_cmds::set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
