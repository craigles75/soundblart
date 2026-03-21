use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::error::AppError;
use crate::types::AppConfig;

const STORE_FILE: &str = "config.json";

// Store keys
const KEY_VERSION: &str = "version";
const KEY_DIRECTORIES: &str = "directoryPaths";
const KEY_VOLUME: &str = "masterVolume";
const KEY_ACTIVE_PANEL: &str = "lastActivePanel";

/// Thin wrapper around `tauri-plugin-store` providing typed access to
/// Soundblart's persisted configuration.
///
/// All values are serialised as JSON inside the plugin's store file at:
/// - macOS:   `~/Library/Application Support/com.soundblart.app/config.json`
/// - Windows: `%APPDATA%\com.soundblart.app\config.json`
pub struct ConfigStore;

impl ConfigStore {
    /// Load the full AppConfig from the store, falling back to defaults
    /// for any missing keys.
    pub fn load(app: &AppHandle) -> Result<AppConfig, AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        let version = store
            .get(KEY_VERSION)
            .and_then(|v| v.as_u64())
            .unwrap_or(1) as u32;

        let directory_paths: Vec<String> = store
            .get(KEY_DIRECTORIES)
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default();

        let master_volume = store
            .get(KEY_VOLUME)
            .and_then(|v| v.as_f64())
            .map(|v| v as f32)
            .unwrap_or(1.0);

        let last_active_panel: Option<String> = store
            .get(KEY_ACTIVE_PANEL)
            .and_then(|v| v.as_str().map(String::from));

        Ok(AppConfig {
            version,
            directory_paths,
            master_volume,
            last_active_panel,
        })
    }

    /// Persist the full AppConfig to the store.
    pub fn save(app: &AppHandle, config: &AppConfig) -> Result<(), AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        store.set(
            KEY_VERSION,
            serde_json::to_value(config.version).map_err(|e| AppError::Config(e.to_string()))?,
        );
        store.set(
            KEY_DIRECTORIES,
            serde_json::to_value(&config.directory_paths)
                .map_err(|e| AppError::Config(e.to_string()))?,
        );
        store.set(
            KEY_VOLUME,
            serde_json::to_value(config.master_volume)
                .map_err(|e| AppError::Config(e.to_string()))?,
        );
        store.set(
            KEY_ACTIVE_PANEL,
            serde_json::to_value(&config.last_active_panel)
                .map_err(|e| AppError::Config(e.to_string()))?,
        );

        store
            .save()
            .map_err(|e| AppError::Config(e.to_string()))?;

        Ok(())
    }

    /// Read the list of watched directories from persistent config.
    ///
    /// Returns an empty `Vec` if the key has never been written.
    pub fn get_directories(app: &AppHandle) -> Result<Vec<String>, AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        Ok(store
            .get(KEY_DIRECTORIES)
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default())
    }

    /// Persist `directories` to the store.
    pub fn set_directories(app: &AppHandle, directories: &[String]) -> Result<(), AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        store.set(
            KEY_DIRECTORIES,
            serde_json::to_value(directories).map_err(|e| AppError::Config(e.to_string()))?,
        );
        store
            .save()
            .map_err(|e| AppError::Config(e.to_string()))?;

        Ok(())
    }

    /// Read the persisted active panel name, if any.
    pub fn get_active_panel(app: &AppHandle) -> Result<Option<String>, AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        Ok(store
            .get(KEY_ACTIVE_PANEL)
            .and_then(|v| v.as_str().map(String::from)))
    }

    /// Persist the active panel name.
    pub fn set_active_panel(app: &AppHandle, panel_name: &str) -> Result<(), AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        store.set(
            KEY_ACTIVE_PANEL,
            serde_json::Value::String(panel_name.to_string()),
        );
        store
            .save()
            .map_err(|e| AppError::Config(e.to_string()))?;

        Ok(())
    }

    /// Read the persisted master volume, defaulting to `1.0` if unset.
    pub fn get_volume(app: &AppHandle) -> Result<f32, AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        Ok(store
            .get(KEY_VOLUME)
            .and_then(|v| v.as_f64())
            .map(|v| v as f32)
            .unwrap_or(1.0))
    }

    /// Persist the master volume.
    pub fn set_volume(app: &AppHandle, level: f32) -> Result<(), AppError> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| AppError::Config(e.to_string()))?;

        store.set(
            KEY_VOLUME,
            serde_json::to_value(level).map_err(|e| AppError::Config(e.to_string()))?,
        );
        store
            .save()
            .map_err(|e| AppError::Config(e.to_string()))?;

        Ok(())
    }
}
