use std::path::Path;

use crate::error::AppError;

/// Maximum allowed file size for a .wav file (50 MB).
const MAX_FILE_SIZE_BYTES: u64 = 52_428_800;

/// Validates that a sound path is safe to access.
///
/// Performs all four security checks required by the IPC contract:
/// 1. Canonicalize — resolve symlinks, reject paths that don't resolve
/// 2. Approved-root prefix — canonical path must start with one of the approved roots
/// 3. .wav extension — only WAV files are permitted
/// 4. 50 MB file size guard — reject excessively large files
///
/// # Errors
///
/// Returns a specific `AppError` variant for each failed check.
pub fn validate_sound_path(path: &str, approved_roots: &[String]) -> Result<std::path::PathBuf, AppError> {
    // 1. Canonicalize — resolves symlinks, "..", etc.
    let canonical = std::fs::canonicalize(path).map_err(|e| AppError::PathResolution {
        path: path.to_string(),
        reason: e.to_string(),
    })?;

    // 2. Approved-root prefix check
    let in_approved_root = approved_roots.iter().any(|root| {
        if let Ok(canonical_root) = std::fs::canonicalize(root) {
            canonical.starts_with(&canonical_root)
        } else {
            false
        }
    });
    if !in_approved_root {
        return Err(AppError::PathTraversal(canonical.display().to_string()));
    }

    // 3. .wav extension guard (case-insensitive)
    match canonical.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("wav") => {}
        other => {
            return Err(AppError::InvalidExtension {
                path: canonical.display().to_string(),
                ext: other.unwrap_or("none").to_string(),
            });
        }
    }

    // 4. File size guard
    let metadata = std::fs::metadata(&canonical)?;
    let size = metadata.len();
    if size > MAX_FILE_SIZE_BYTES {
        return Err(AppError::FileTooLarge {
            size,
            limit: MAX_FILE_SIZE_BYTES,
            path: canonical.display().to_string(),
        });
    }

    Ok(canonical)
}

/// Return `true` if `path` is an existing, readable directory.
pub fn is_valid_directory(path: &Path) -> bool {
    path.is_dir()
        && std::fs::read_dir(path).is_ok()
}

/// Return `true` if `path` points to a file we can attempt to decode.
///
/// Checks: file exists, extension is `.wav` (case-insensitive), size > 0 and ≤ 50 MB.
pub fn is_valid_sound_file(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    let ext_ok = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("wav"))
        .unwrap_or(false);
    if !ext_ok {
        return false;
    }
    match std::fs::metadata(path) {
        Ok(m) => {
            let size = m.len();
            size > 0 && size <= MAX_FILE_SIZE_BYTES
        }
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;

    #[test]
    fn rejects_path_outside_approved_roots() {
        let dir = tempfile::tempdir().unwrap();
        let approved_dir = tempfile::tempdir().unwrap();

        let file_path = dir.path().join("test.wav");
        let mut f = fs::File::create(&file_path).unwrap();
        f.write_all(&[0u8; 44]).unwrap(); // minimal WAV-ish bytes

        let result = validate_sound_path(
            file_path.to_str().unwrap(),
            &[approved_dir.path().to_str().unwrap().to_string()],
        );
        assert!(matches!(result, Err(AppError::PathTraversal(_))));
    }

    #[test]
    fn rejects_non_wav_extension() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.mp3");
        let mut f = fs::File::create(&file_path).unwrap();
        f.write_all(&[0u8; 44]).unwrap();

        let result = validate_sound_path(
            file_path.to_str().unwrap(),
            &[dir.path().to_str().unwrap().to_string()],
        );
        assert!(matches!(result, Err(AppError::InvalidExtension { .. })));
    }

    #[test]
    fn accepts_valid_wav_in_approved_root() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.wav");
        let mut f = fs::File::create(&file_path).unwrap();
        f.write_all(&[0u8; 44]).unwrap();

        let result = validate_sound_path(
            file_path.to_str().unwrap(),
            &[dir.path().to_str().unwrap().to_string()],
        );
        assert!(result.is_ok());
    }

    #[test]
    fn rejects_nonexistent_path() {
        let dir = tempfile::tempdir().unwrap();
        let result = validate_sound_path(
            "/nonexistent/path/sound.wav",
            &[dir.path().to_str().unwrap().to_string()],
        );
        assert!(matches!(result, Err(AppError::PathResolution { .. })));
    }

    #[test]
    fn is_valid_sound_file_accepts_wav() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("good.wav");
        let mut f = fs::File::create(&file_path).unwrap();
        f.write_all(&[0u8; 100]).unwrap();
        assert!(is_valid_sound_file(&file_path));
    }

    #[test]
    fn is_valid_sound_file_rejects_non_wav() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("bad.mp3");
        let mut f = fs::File::create(&file_path).unwrap();
        f.write_all(&[0u8; 100]).unwrap();
        assert!(!is_valid_sound_file(&file_path));
    }

    #[test]
    fn is_valid_sound_file_rejects_empty() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("empty.wav");
        fs::File::create(&file_path).unwrap();
        assert!(!is_valid_sound_file(&file_path));
    }
}
