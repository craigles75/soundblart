use kira::sound::static_sound::{StaticSoundData, StaticSoundSettings};
use std::path::Path;

use crate::error::AppError;

/// Decodes audio files from disk into kira `StaticSoundData`.
///
/// Uses kira's built-in file loading which leverages symphonia for decoding.
/// Currently only WAV + PCM is enabled in Cargo.toml.
pub struct AudioLoader;

impl AudioLoader {
    /// Decode the WAV file at `path` into a kira `StaticSoundData`.
    ///
    /// The returned `StaticSoundData` holds the decoded PCM samples in memory
    /// for instant playback with no decode latency on trigger.
    pub fn load(path: &str) -> Result<StaticSoundData, AppError> {
        let p = Path::new(path);
        if !p.exists() {
            return Err(AppError::SoundNotLoaded {
                path: path.to_string(),
            });
        }

        StaticSoundData::from_file(p, StaticSoundSettings::default())
            .map_err(|e| AppError::Audio(format!("Failed to decode {}: {}", path, e)))
    }
}
