# Data Model: Soundblart — Native Desktop Rewrite

**Branch**: `001-native-desktop-rewrite`
**Phase 1 output**

---

## Entities

### Sound

Represents a single playable `.wav` file discovered on the filesystem.

| Field | Type | Description |
|---|---|---|
| `path` | String (absolute, canonical) | Filesystem path to the `.wav` file. Always canonicalized via `std::fs::canonicalize`. |
| `name` | String | Display name derived from filename: strip extension, replace underscores/hyphens with spaces, capitalize words. `"clapping_crowd.wav"` → `"Clapping Crowd"` |
| `index` | u32 | 1-based position within the parent panel (display as zero-padded `"01"`, `"02"`, etc.) |
| `panel_name` | String | Name of the parent panel (denormalized for fast lookup) |
| `file_size_bytes` | u64 | Used for disk usage stats and the 50MB pre-load guard |

**Validation rules**:
- `path` must canonicalize without error
- Extension must be `.wav` (case-insensitive)
- `file_size_bytes` must be ≤ 52,428,800 (50 MB)

**State transitions**: None — Sound is an immutable descriptor; playback state is held by Session.

---

### Panel

A named group of Sounds corresponding to one or more filesystem subfolders.

| Field | Type | Description |
|---|---|---|
| `name` | String | Display name derived from folder name. Same transform as Sound.name. |
| `color_category` | ColorCategory | Enum mapping to gradient color: `Audience` (primary/orange), `Nature` (secondary/green), `Traffic` (tertiary/blue), `Sports` (neutral), `Arcade` (error/red), `Custom` (user-defined, falls back to neutral) |
| `sounds` | Vec\<Sound\> | Ordered list of Sounds sorted by filename alphabetically |
| `source_directories` | Vec\<String\> | The directory paths that contributed sounds to this panel (used for refresh/cleanup) |

**Merging rule**: Panels with the same name (case-insensitive) from different configured directories are merged into one Panel. Their sounds lists are concatenated and re-indexed.

**Color category assignment**: Initially auto-assigned by matching panel name against known keywords (`"Audience"` → Audience, `"Nature"` → Nature, etc.). Unrecognized names fall back to `Custom` (neutral style).

**State transitions**: Panels are rebuilt on library refresh; they are not mutated in place.

---

### Directory

A user-configured root path on the filesystem that the app scans for panels.

| Field | Type | Description |
|---|---|---|
| `path` | String (absolute, canonical) | The canonicalized root path the user selected via folder picker |
| `label` | String | Display label — derived from the final path component: `/Users/alice/Music/SoundPacks` → `"SoundPacks"` |
| `is_read_only` | bool | True if the directory was pre-installed (bundled presets). Read-only directories cannot be removed by the user. |
| `index_state` | IndexState | Enum: `Clean`, `Stale`, `Indexing`, `Error(String)` |
| `asset_count` | u32 | Total number of `.wav` files discovered in this directory tree (one level deep) |
| `disk_usage_bytes` | u64 | Sum of `file_size_bytes` for all discovered sounds |
| `last_indexed_at` | Option\<DateTime\<Utc\>\> | Timestamp of last successful scan |
| `latency_ms` | Option\<f64\> | Duration of the last scan in milliseconds |

**State transitions**:

```
[not added]
    ↓ user adds via picker
Clean (initial scan complete)
    ↓ user adds/removes files externally
Stale
    ↓ user clicks Refresh / or app detects change
Indexing
    ↓ scan completes
Clean
    ↓ root path deleted/moved
Error("Directory not found")
```

**Persistence**: The `path` field is stored in the app config file. All other fields are derived on scan and not persisted (recomputed on next launch scan).

---

### Session

The live runtime state of the application. Not persisted across launches (except `master_volume`).

| Field | Type | Description |
|---|---|---|
| `active_panel_name` | Option\<String\> | The name of the currently selected panel. None if no panels are loaded. |
| `playing_sound_path` | Option\<String\> | Canonical path of the sound currently playing. None if nothing is playing. |
| `master_volume` | f32 | Master output volume, clamped to [0.0, 1.0]. Default: 1.0 |
| `is_live` | bool | True when the audio output is active (playing or ready). Used for the "Live Output" indicator. |

**Invariants**:
- `playing_sound_path` must be a path within the currently loaded library
- `master_volume` is always in [0.0, 1.0]

**State transitions** (audio):

```
Idle (playing_sound_path = None)
    ↓ user clicks pad
Playing(path)
    ↓ user clicks same pad, or sound ends naturally
Idle
    ↓ user clicks different pad while playing
Playing(new_path)  ← previous sound stopped atomically
```

**Persistence**: `master_volume` is stored in app config and restored on next launch.

---

### AppConfig

The persisted configuration written to the platform config directory on every change.

| Field | Type | Description |
|---|---|---|
| `version` | u32 | Config schema version for forward-compat migration. Current: 1 |
| `directory_paths` | Vec\<String\> | Ordered list of canonical directory paths the user has added |
| `master_volume` | f32 | Last-set master volume, restored on launch |
| `last_active_panel` | Option\<String\> | Name of the panel that was active on last quit — restored on relaunch if still available |

**Storage location**:
- macOS: `~/Library/Application Support/com.soundblart.app/config.json`
- Windows: `%APPDATA%\com.soundblart.app\config.json`

**Managed by**: `tauri-plugin-store` (wraps the above paths automatically via `app.path().app_config_dir()`)

**Security**: Paths read from `directory_paths` are re-canonicalized on load. Entries that fail canonicalization are removed with a warning, not a crash.

---

## Runtime State (Rust — not persisted)

These are in-memory structures held in Tauri `AppState`:

### LibraryIndex

```
LibraryIndex
  panels: HashMap<String, Panel>    ← keyed by panel name (case-insensitive)
  sounds: HashMap<String, Sound>    ← keyed by canonical path, for O(1) play lookup
  directories: Vec<Directory>
  total_asset_count: u32
  total_disk_usage_bytes: u64
```

Built by the scanner at startup and on refresh. Held behind a `RwLock` — readers (play, get panels) never block each other; writer (refresh) acquires exclusive lock.

### AudioState

```
AudioState
  manager: kira::manager::AudioManager    ← singleton, managed by Tauri state
  sound_handles: HashMap<String, kira::sound::static_sound::StaticSoundHandle>
  loaded_sounds: HashMap<String, kira::sound::static_sound::StaticSoundData>
      ← pre-decoded PCM, keyed by canonical path
```

`loaded_sounds` is populated at library scan time (decode-at-load, not decode-at-play). On refresh, stale entries are evicted and new paths are decoded.

---

## Entity Relationships

```
AppConfig
  1 → N  Directory (via directory_paths)

Directory
  1 → N  Panel (via filesystem scan)

Panel
  1 → N  Sound

Session
  references → Panel  (active_panel_name)
  references → Sound  (playing_sound_path)

AudioState
  references → Sound  (loaded_sounds, keyed by path)
```

---

## ColorCategory Enum

```rust
enum ColorCategory {
    Audience,   // primary:   #ff8f6f → #ff7851 gradient
    Nature,     // secondary: #91f78e → #006e1c gradient
    Traffic,    // tertiary:  #44a5ff → #2498f5 gradient
    Arcade,     // error:     #ff716c → #9f0519 gradient
    Sports,     // neutral:   surface-container-high (#20201f)
    Custom,     // neutral:   same as Sports — for unrecognized panel names
}
```

**Auto-assignment logic** (keyword matching on panel name, case-insensitive):
- Contains `"audience"`, `"crowd"`, `"people"`, `"human"` → Audience
- Contains `"nature"`, `"ambient"`, `"forest"`, `"rain"`, `"outdoor"` → Nature
- Contains `"traffic"`, `"urban"`, `"city"`, `"transport"` → Traffic
- Contains `"arcade"`, `"game"`, `"retro"`, `"8bit"` → Arcade
- Contains `"sport"`, `"athletic"`, `"gym"` → Sports
- Otherwise → Custom

---

## IndexState Enum

```rust
enum IndexState {
    Clean,            // Last scan completed successfully, filesystem unchanged
    Stale,            // Files may have changed since last scan (app detected change or user prompted)
    Indexing,         // Scan in progress — UI shows progress indicator
    Error(String),    // Root path inaccessible; String is human-readable reason
}
```
