use crate::update_source::HttpSource;
use serde::Serialize;
use std::{
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager};
use velopack::{Error, UpdateCheck, UpdateInfo, UpdateManager};

const GITHUB_ASSETS: &str = "https://github.com/whxtelxs/T-Helper/releases/latest/download";
const CHECK_TIMEOUT: Duration = Duration::from_secs(12);
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Clone)]
struct Pending {
    source: String,
    info: UpdateInfo,
}

#[derive(Default)]
pub struct UpdateCell {
    operation: Mutex<()>,
    pending: Mutex<Option<Pending>>,
    downloaded: Mutex<Option<(UpdateManager, UpdateInfo)>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    installed: bool,
    available: bool,
    version: Option<String>,
}

fn feeds() -> Vec<String> {
    let mut urls = vec![GITHUB_ASSETS.to_owned()];
    if let Ok(url) = std::env::var("T_HELPER_UPDATE_MIRROR") {
        let url = url.trim();
        if !url.is_empty() && url != GITHUB_ASSETS {
            urls.push(url.to_owned());
        }
    }
    urls
}

fn manager(source: &str, deadline: Instant) -> Result<UpdateManager, Error> {
    UpdateManager::new(HttpSource::new(source, deadline)?, None, None)
}

fn error_code(error: Error) -> String {
    match error {
        Error::NotInstalled(_) => "not-installed".into(),
        Error::Network(_) => "network".into(),
        other => other.to_string(),
    }
}

#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<UpdateStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<UpdateCell>();
        let _guard = state.operation.try_lock().map_err(|_| "busy")?;
        if !cfg!(windows) {
            return Ok(UpdateStatus {
                installed: false,
                available: false,
                version: None,
            });
        }
        let mut last = "network".to_string();
        for source in feeds() {
            let result = manager(&source, Instant::now() + CHECK_TIMEOUT)
                .and_then(|manager| manager.check_for_updates());
            match result {
                Err(Error::NotInstalled(_)) => {
                    return Ok(UpdateStatus {
                        installed: false,
                        available: false,
                        version: None,
                    })
                }
                Err(error) => last = error_code(error),
                Ok(UpdateCheck::UpdateAvailable(info)) => {
                    let version = info.TargetFullRelease.Version.clone();
                    *state.pending.lock().map_err(|_| "state")? = Some(Pending {
                        source,
                        info: *info,
                    });
                    return Ok(UpdateStatus {
                        installed: true,
                        available: true,
                        version: Some(version),
                    });
                }
                Ok(_) => {
                    *state.pending.lock().map_err(|_| "state")? = None;
                    return Ok(UpdateStatus {
                        installed: true,
                        available: false,
                        version: None,
                    });
                }
            }
        }
        Err(last)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn install_update(app: AppHandle, expected_version: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<UpdateCell>();
        let _guard = state.operation.try_lock().map_err(|_| "busy")?;
        let pending = state
            .pending
            .lock()
            .map_err(|_| "state")?
            .clone()
            .ok_or("none")?;
        if pending.info.TargetFullRelease.Version != expected_version {
            return Err("version-changed".into());
        }
        let deadline = Instant::now() + DOWNLOAD_TIMEOUT;
        let mut sources = vec![pending.source.clone()];
        sources.extend(
            feeds()
                .into_iter()
                .filter(|source| source != &pending.source),
        );
        let mut last = "network".to_string();
        for source in sources {
            if Instant::now() >= deadline {
                break;
            }
            let manager = match manager(&source, deadline) {
                Ok(manager) => manager,
                Err(error) => {
                    last = error_code(error);
                    continue;
                }
            };
            let (sender, receiver) = std::sync::mpsc::channel::<i16>();
            let result = std::thread::scope(|scope| {
                let handle = &app;
                scope.spawn(move || {
                    while let Ok(percent) = receiver.recv() {
                        let _ = handle.emit("update://progress", percent);
                    }
                });
                manager.download_updates(&pending.info, Some(sender))
            });
            match result {
                Ok(()) => {
                    *state.downloaded.lock().map_err(|_| "state")? = Some((manager, pending.info));
                    return Ok(());
                }
                Err(error) => last = error_code(error),
            }
        }
        Err(last)
    })
    .await
    .map_err(|error| error.to_string())?
}
#[tauri::command]
pub async fn apply_update(app: AppHandle, expected_version: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<UpdateCell>();
        let _guard = state.operation.try_lock().map_err(|_| "busy")?;
        let downloaded = state.downloaded.lock().map_err(|_| "state")?;
        let (manager, info) = downloaded.as_ref().ok_or("none")?;
        if info.TargetFullRelease.Version != expected_version {
            return Err("version-changed".into());
        }
        manager.apply_updates_and_restart(info).map_err(error_code)
    })
    .await
    .map_err(|error| error.to_string())?
}
