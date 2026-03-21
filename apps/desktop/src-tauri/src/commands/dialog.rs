use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::error::CommandResult;

/// Open a native OS directory picker.
///
/// Returns `Some(path)` if the user selects a directory, or `None` if the
/// dialog is cancelled.
#[tauri::command]
pub fn pick_directory(app: AppHandle) -> CommandResult<Option<String>> {
    let path = app
        .dialog()
        .file()
        .blocking_pick_folder();

    Ok(path.map(|p| p.to_string()))
}
