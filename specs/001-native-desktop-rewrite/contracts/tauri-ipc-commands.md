# Tauri IPC Command Contracts

**Branch**: `001-native-desktop-rewrite`
**Interface type**: Tauri v2 `invoke()` commands — the contract between the React frontend (WebView) and the Rust backend.

All commands are invoked from the frontend as:
```typescript
import { invoke } from '@tauri-apps/api/core';
const result = await invoke<ReturnType>('command_name', { arg1, arg2 });
```

All commands return `Result<T, String>` on the Rust side, which maps to a resolved promise (T) or rejected promise (String error message) in JavaScript.

**Security invariant on every path-accepting command**: The Rust handler MUST call `validate_sound_path(path, approved_roots)` before any filesystem operation. The frontend is untrusted.

---

## Audio Commands

### `play_sound`

Triggers playback of a `.wav` file. Stops any currently playing sound first (single-voice model).

```typescript
invoke<void>('play_sound', { path: string })
```

**Arguments**:
- `path` — Absolute path to a `.wav` file

**Preconditions**:
- `path` must canonicalize without error
- `path` must be within an approved directory root
- Extension must be `.wav`
- `loaded_sounds` must contain an entry for `path` (populated at library scan time)

**Side effects**:
- Stops the currently playing sound (if any) via kira `StaticSoundHandle::stop()`
- Starts playback of the new sound via `AudioManager::play()`
- Updates `Session.playing_sound_path` to `path`
- Updates `Session.is_live` to `true`

**Errors**:
- `"Path outside approved directory"` — path traversal attempt
- `"Sound not loaded: {path}"` — library has not been scanned or sound was not found during scan
- `"Audio engine error: {detail}"` — kira playback failure

**Frontend update**: After `play_sound` resolves, the frontend re-renders pad active states via a subsequent `get_session()` call or via a Tauri event (`soundblart://session-changed`).

---

### `stop_sound`

Stops whatever sound is currently playing. No-op if nothing is playing.

```typescript
invoke<void>('stop_sound')
```

**Arguments**: None

**Side effects**:
- Calls `StaticSoundHandle::stop()` on the current handle (if any)
- Sets `Session.playing_sound_path` to `None`
- Sets `Session.is_live` to `false`

**Errors**: `"Audio engine error: {detail}"`

---

### `set_volume`

Sets the master output volume. Applied to the kira `AudioManager`'s main track.

```typescript
invoke<void>('set_volume', { level: number })
```

**Arguments**:
- `level` — f32 in [0.0, 1.0]. Clamped server-side: `level.clamp(0.0, 1.0)`.

**Side effects**:
- Updates the kira main track volume in real time (no interruption to playing sound)
- Persists `level` to `AppConfig.master_volume` (debounced, 500ms)

**Errors**: `"Audio engine error: {detail}"`

---

### `get_session`

Returns the current session state (active panel, playing sound, volume, live status).

```typescript
invoke<Session>('get_session')
```

**Return type**:
```typescript
interface Session {
  active_panel_name: string | null;
  playing_sound_path: string | null;
  master_volume: number;         // [0.0, 1.0]
  is_live: boolean;
}
```

**Side effects**: None (read-only)

---

## Library Commands

### `get_panels`

Returns all panels in the current library index, ordered alphabetically by name.

```typescript
invoke<Panel[]>('get_panels')
```

**Return type**:
```typescript
interface Sound {
  path: string;
  name: string;
  index: number;          // 1-based
  panel_name: string;
  file_size_bytes: number;
}

interface Panel {
  name: string;
  color_category: 'Audience' | 'Nature' | 'Traffic' | 'Arcade' | 'Sports' | 'Custom';
  sounds: Sound[];
  sound_count: number;
}
```

**Side effects**: None (read-only)

**Errors**: `"Library not initialized"` — if called before `refresh_library` completes on first launch

---

### `set_active_panel`

Sets the active panel in the session (updates the Studio screen's sound grid).

```typescript
invoke<void>('set_active_panel', { panel_name: string })
```

**Arguments**:
- `panel_name` — Must match an existing panel name in the library index

**Side effects**:
- Updates `Session.active_panel_name`
- Persists to `AppConfig.last_active_panel` (debounced)

**Errors**: `"Panel not found: {panel_name}"`

---

## Directory Commands

### `pick_directory`

Opens the OS-native folder picker dialog and returns the selected path. Does NOT add the directory to the library (caller must call `add_directory` after).

```typescript
invoke<string | null>('pick_directory')
```

**Return type**: Absolute canonical path string, or `null` if user cancelled.

**Implementation**: Delegates to `tauri_plugin_dialog::open({ directory: true })` — this invokes `NSOpenPanel` (macOS) or `IFileOpenDialog` (Windows) in the host app process, not the WebView sandbox.

**Side effects**: None — does not modify library state.

---

### `add_directory`

Adds a directory to the library and triggers an immediate scan.

```typescript
invoke<DirectoryInfo>('add_directory', { path: string })
```

**Arguments**:
- `path` — Absolute path, typically the output of `pick_directory()`

**Return type**:
```typescript
interface DirectoryInfo {
  path: string;
  label: string;
  is_read_only: boolean;
  index_state: 'Clean' | 'Stale' | 'Indexing' | { Error: string };
  asset_count: number;
  disk_usage_bytes: number;
  last_indexed_at: string | null;  // ISO 8601
  latency_ms: number | null;
}
```

**Preconditions**:
- `path` must canonicalize to a directory (not a file)
- `path` must not already be in `AppConfig.directory_paths`

**Side effects**:
- Canonicalizes `path` via `std::fs::canonicalize()`
- Appends to `AppConfig.directory_paths` and persists immediately
- Runs filesystem scan: discovers panels and sounds, decodes WAV files into `AudioState.loaded_sounds`
- Merges new panels into `LibraryIndex` (panels with duplicate names are merged)
- Returns directory info including scan stats

**Errors**:
- `"Path is not a directory"` — path resolves to a file
- `"Directory already added"` — duplicate prevention
- `"Directory not accessible: {reason}"` — permissions or path not found
- `"Scan failed: {reason}"`

---

### `remove_directory`

Removes a directory from the library and evicts its sounds from the index.

```typescript
invoke<void>('remove_directory', { path: string })
```

**Arguments**:
- `path` — Canonical path of the directory to remove

**Preconditions**:
- `path` must exist in `AppConfig.directory_paths`
- Directory must not be `is_read_only` (bundled presets cannot be removed)

**Side effects**:
- Removes from `AppConfig.directory_paths`, persists immediately
- Stops playback if `Session.playing_sound_path` is from this directory
- Evicts all sounds from this directory from `LibraryIndex` and `AudioState.loaded_sounds`
- Re-merges any panels that had sounds from multiple directories

**Errors**:
- `"Directory not found in library"` — path not in current config
- `"Cannot remove read-only directory"` — attempting to remove bundled presets

---

### `refresh_library`

Rescans all configured directories and rebuilds the library index.

```typescript
invoke<LibraryStats>('refresh_library')
```

**Return type**:
```typescript
interface LibraryStats {
  total_asset_count: number;
  total_disk_usage_bytes: number;
  panel_count: number;
  directories: DirectoryInfo[];
  duration_ms: number;    // Total scan duration
}
```

**Side effects**:
- Sets all directories to `IndexState::Indexing` (emits `soundblart://library-refreshing` event)
- Rescans all configured directories from disk
- Rebuilds `LibraryIndex` from scratch
- Re-decodes new/changed WAV files; evicts removed sounds from `AudioState.loaded_sounds`
- Stops playback if `playing_sound_path` no longer exists post-refresh
- Emits `soundblart://library-updated` event when complete

**Error on partial failure**: Returns `LibraryStats` even if some directories have `IndexState::Error`. The error is embedded in `DirectoryInfo.index_state`, not a rejected promise.

---

### `get_directories`

Returns the current list of configured directories with their scan state.

```typescript
invoke<DirectoryInfo[]>('get_directories')
```

**Side effects**: None (read-only)

---

### `get_library_stats`

Returns aggregate stats across all configured directories.

```typescript
invoke<LibraryStats>('get_library_stats')
```

**Side effects**: None (read-only)

---

## Events (Tauri → Frontend)

The backend emits the following events via `app.emit()`. Frontend subscribes via `listen()`.

```typescript
import { listen } from '@tauri-apps/api/event';
```

| Event name | Payload | When emitted |
|---|---|---|
| `soundblart://session-changed` | `Session` | On play, stop, panel change, volume change |
| `soundblart://library-refreshing` | `{ directories: DirectoryInfo[] }` | Refresh scan begins |
| `soundblart://library-updated` | `LibraryStats` | Refresh scan completes |
| `soundblart://sound-finished` | `{ path: string }` | Sound finishes playing naturally (not stopped) |
| `soundblart://directory-error` | `{ path: string, reason: string }` | A configured directory becomes inaccessible |

---

## Capability Grants (tauri.conf.json)

The capability file that makes the above commands available to the WebView:

```json
{
  "identifier": "default",
  "description": "Soundblart — minimum required capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "fs:allow-read-file",
    "fs:allow-read-dir",
    "fs:allow-exists"
  ]
}
```

Commands registered in `lib.rs` via `tauri::Builder::invoke_handler(generate_handler![...])`. All commands are in the `commands` module and are NOT exported as plugin commands — they are app-internal.
