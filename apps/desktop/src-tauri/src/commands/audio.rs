use tauri::{AppHandle, Emitter, State};

use crate::config::store::ConfigStore;
use crate::error::CommandResult;
use crate::library::validator;
use crate::types::Session;

use super::AppStateDeps;

/// Build a Session snapshot from the current state.
fn build_session(deps: &AppStateDeps) -> Session {
    let mut audio = deps.audio.lock().unwrap();
    let session = deps.session.lock().unwrap();
    Session {
        active_panel_name: session.active_panel_name.clone(),
        playing_sound_path: audio.current_path().map(String::from),
        master_volume: audio.volume(),
        is_live: audio.is_playing(),
    }
}

/// Emit session-changed event to the frontend.
fn emit_session_changed(app: &AppHandle, deps: &AppStateDeps) {
    let session = build_session(deps);
    let _ = app.emit("soundblart://session-changed", &session);
}

/// Check if a sound finished naturally and emit the sound-finished event if so.
fn check_and_emit_sound_finished(app: &AppHandle, deps: &AppStateDeps) {
    let finished_path = {
        let mut audio = deps.audio.lock().unwrap();
        audio.check_sound_finished()
    };
    if let Some(path) = finished_path {
        let _ = app.emit("soundblart://sound-finished", serde_json::json!({ "path": path }));
        emit_session_changed(app, deps);
    }
}

#[tauri::command]
pub fn play_sound(
    app: AppHandle,
    path: String,
    deps: State<'_, AppStateDeps>,
) -> CommandResult<()> {
    // Check for naturally finished sound before processing
    check_and_emit_sound_finished(&app, &deps);

    // Validate the sound path against approved roots
    {
        let config = deps.config.lock().unwrap();
        validator::validate_sound_path(&path, &config.directory_paths)
            .map_err(|e| e.to_string())?;
    }

    // Play the sound
    {
        let mut audio = deps.audio.lock().unwrap();
        audio.play_sound(&path).map_err(|e| e.to_string())?;
    }

    emit_session_changed(&app, &deps);
    Ok(())
}

#[tauri::command]
pub fn stop_sound(app: AppHandle, deps: State<'_, AppStateDeps>) -> CommandResult<()> {
    {
        let mut audio = deps.audio.lock().unwrap();
        audio.stop().map_err(|e| e.to_string())?;
    }

    emit_session_changed(&app, &deps);
    Ok(())
}

#[tauri::command]
pub fn set_volume(
    app: AppHandle,
    level: f32,
    deps: State<'_, AppStateDeps>,
) -> CommandResult<()> {
    let clamped = level.clamp(0.0, 1.0);

    {
        let mut audio = deps.audio.lock().unwrap();
        audio.set_volume(clamped).map_err(|e| e.to_string())?;
    }

    // Persist volume to config
    {
        let mut config = deps.config.lock().unwrap();
        config.master_volume = clamped;
        let _ = ConfigStore::save(&app, &config);
    }

    emit_session_changed(&app, &deps);
    Ok(())
}

#[tauri::command]
pub fn get_session(deps: State<'_, AppStateDeps>) -> CommandResult<Session> {
    Ok(build_session(&deps))
}

#[tauri::command]
pub fn preview_sound(
    _app: AppHandle,
    path: String,
    deps: State<'_, AppStateDeps>,
) -> CommandResult<()> {
    // Validate the sound path
    {
        let config = deps.config.lock().unwrap();
        validator::validate_sound_path(&path, &config.directory_paths)
            .map_err(|e| e.to_string())?;
    }

    let mut audio = deps.audio.lock().unwrap();
    audio.preview_sound(&path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn stop_preview(deps: State<'_, AppStateDeps>) -> CommandResult<()> {
    let mut audio = deps.audio.lock().unwrap();
    audio.stop_preview().map_err(|e| e.to_string())?;
    Ok(())
}
