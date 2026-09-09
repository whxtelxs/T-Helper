use std::{collections::VecDeque, fs::File, io::Read, path::PathBuf, sync::Mutex};
use tauri::{ipc::Response, AppHandle, Manager};
const MAX_IMPORT_BYTES: u64 = 8 * 1024 * 1024;

#[derive(Default)]
pub struct OpenedFile(Mutex<VecDeque<PathBuf>>);

impl OpenedFile {
    pub fn push(&self, path: PathBuf) {
        if let Ok(mut queue) = self.0.lock() {
            queue.push_back(path);
        }
    }
}

fn read_bounded(reader: impl Read) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    reader
        .take(MAX_IMPORT_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "read_failed".to_string())?;
    if bytes.len() as u64 > MAX_IMPORT_BYTES {
        return Err("too_large".into());
    }
    if bytes.is_empty() {
        return Err("invalid_format".into());
    }
    Ok(bytes)
}

#[tauri::command]
pub async fn take_opened_file(app: AppHandle) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<OpenedFile>();
        let path = state.0.lock().map_err(|_| "read_failed")?.pop_front();
        let Some(path) = path else {
            return Ok(Response::new(Vec::new()));
        };
        let file = File::open(path).map_err(|_| "read_failed")?;
        let metadata = file.metadata().map_err(|_| "read_failed")?;
        if !metadata.is_file() {
            return Err("invalid_format".into());
        }
        if metadata.len() > MAX_IMPORT_BYTES {
            return Err("too_large".into());
        }
        read_bounded(file).map(Response::new)
    })
    .await
    .map_err(|_| "read_failed".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_boundary_and_rejects_overflow() {
        assert_eq!(
            read_bounded(std::io::repeat(1).take(MAX_IMPORT_BYTES))
                .unwrap()
                .len() as u64,
            MAX_IMPORT_BYTES
        );
        assert_eq!(read_bounded(std::io::repeat(1)), Err("too_large".into()));
    }
    #[test]
    fn rejects_empty_and_preserves_bytes() {
        assert_eq!(read_bounded(&b""[..]), Err("invalid_format".into()));
        assert_eq!(read_bounded(&b"THELP"[..]).unwrap(), b"THELP");
    }
}
