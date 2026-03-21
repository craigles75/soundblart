use std::sync::mpsc;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::error::CommandResult;

/// Open a native OS directory picker.
///
/// Returns `Some(path)` if the user selects a directory, or `None` if the
/// dialog is cancelled.
///
/// Uses a channel to bridge the callback-based API without blocking the
/// main thread.
#[tauri::command]
pub async fn pick_directory(app: AppHandle) -> CommandResult<Option<String>> {
    let (tx, rx) = mpsc::channel::<Option<String>>();

    app.dialog()
        .file()
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path.map(|p| p.to_string()));
        });

    let result = rx
        .recv()
        .map_err(|_| "Dialog was closed unexpectedly".to_string())?;

    Ok(result)
}
