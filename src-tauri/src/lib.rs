mod opened_file;
mod update;
mod update_source;

use opened_file::{take_opened_file, OpenedFile};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager, RunEvent};
use update::{apply_update, check_update, install_update, UpdateCell};

const OPEN_EVENT: &str = "thelp://open";
const PACKAGE_EXTENSION: &str = "thelp";

#[tauri::command]
fn show_main_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

fn is_package(path: &Path) -> bool {
    path.extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case(PACKAGE_EXTENSION))
}

fn package_from_args<I: IntoIterator<Item = String>>(args: I) -> Option<PathBuf> {
    args.into_iter()
        .skip(1)
        .map(PathBuf::from)
        .find(|path| is_package(path) && path.is_file())
}

fn remember(app: &AppHandle, path: PathBuf) {
    let Some(state) = app.try_state::<OpenedFile>() else {
        return;
    };
    state.push(path);
    let _ = app.emit(OPEN_EVENT, ());
}

#[cfg(target_os = "macos")]
fn on_run_event(app: &AppHandle, event: &RunEvent) {
    if let RunEvent::Opened { urls } = event {
        let opened = urls
            .iter()
            .filter_map(|url| url.to_file_path().ok())
            .find(|path| is_package(path));
        if let Some(path) = opened {
            remember(app, path);
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn on_run_event(_app: &AppHandle, _event: &RunEvent) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            if let Some(path) = package_from_args(argv) {
                remember(app, path);
            }
        }));
    }

    let app = builder
        .plugin(tauri_plugin_opener::init())
        .manage(OpenedFile::default())
        .manage(UpdateCell::default())
        .invoke_handler(tauri::generate_handler![
            take_opened_file,
            show_main_window,
            check_update,
            install_update,
            apply_update
        ])
        .setup(|app| {
            if let Some(path) = package_from_args(std::env::args()) {
                remember(app.handle(), path);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to start T-Helper");

    app.run(|app, event| on_run_event(app, &event));
}
