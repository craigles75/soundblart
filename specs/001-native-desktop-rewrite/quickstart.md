# Quickstart: Soundblart Desktop — Developer Setup

**Branch**: `001-native-desktop-rewrite`
**Phase 1 output**

This guide gets a developer from zero to a running Tauri v2 desktop app with audio playback in the shortest path.

---

## Prerequisites

### All platforms
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 9+
- [Rust](https://rustup.rs/) stable (1.77+)
- [Tauri CLI](https://tauri.app/start/) v2: `cargo install tauri-cli --version "^2.0"`

### macOS
- Xcode Command Line Tools: `xcode-select --install`
- macOS 13.0+ for development

### Windows
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (MSVC toolchain)
- WebView2 Runtime (pre-installed on Windows 10 20H2+)
- Windows 10 or 11

---

## Repository Layout

```
soundblart/
  packages/
    ui/                   ← Shared Tailwind config + React components
  apps/
    desktop/              ← Tauri v2 app
      src/                ← React frontend (Vite)
      src-tauri/          ← Rust backend
        src/
          commands/       ← Tauri IPC command handlers
          audio/          ← kira AudioManager + sound loading
          library/        ← filesystem scanner, LibraryIndex
          config/         ← AppConfig persistence
          main.rs
          lib.rs
    website/              ← Astro marketing site
  soundbites/             ← Bundled preset .wav files
```

---

## Setup

```bash
# 1. Clone and install all workspace dependencies
git clone <repo-url> soundblart
cd soundblart
pnpm install

# 2. Build the shared UI package (design tokens + components)
pnpm --filter @soundblart/ui build

# 3. Run the desktop app in development
cd apps/desktop
pnpm tauri dev
```

The first `tauri dev` run compiles Rust (~2–4 minutes). Subsequent runs use incremental compilation.

---

## Running the App

```bash
# Desktop app (development — hot reload for frontend, Rust recompile on backend changes)
pnpm tauri dev

# Desktop app (release build — produces .app / .exe)
pnpm tauri build

# Website (development)
pnpm --filter @soundblart/website dev

# Website (production build)
pnpm --filter @soundblart/website build
```

---

## Testing Audio Playback

On first launch the app copies bundled presets from `soundbites/` to the platform app support directory:
- macOS: `~/Library/Application Support/com.soundblart.app/presets/`
- Windows: `%APPDATA%\com.soundblart.app\presets\`

The app automatically adds this preset directory to the library on first run. You should see panels on the Studio screen immediately.

**To verify <50ms latency**:
1. Open Studio screen
2. Click any sound pad
3. Audio should be audible within one buffer period (~10ms at 256-frame buffer)
4. If there is a perceptible delay, check `src-tauri/src/audio/manager.rs` for the buffer size configuration

**To add your own sounds**:
1. Navigate to Folders screen
2. Click "Link New Directory"
3. Select any folder containing subfolders of `.wav` files
4. Return to Library — new panels appear immediately

---

## Validating the Quickstart

Run these checks to confirm a working setup:

```bash
# 1. Rust backend compiles without warnings
cd apps/desktop/src-tauri && cargo check

# 2. Frontend builds without errors
cd apps/desktop && pnpm build

# 3. All tests pass
cd apps/desktop/src-tauri && cargo test

# 4. Tauri audit — check capabilities config
cd apps/desktop && pnpm tauri info
```

If `pnpm tauri dev` fails with a WebView2 error on Windows, install the [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) manually.

---

## Key Configuration Files

| File | Purpose |
|---|---|
| `apps/desktop/src-tauri/tauri.conf.json` | App metadata, window config, CSP, capabilities, bundle config |
| `apps/desktop/src-tauri/capabilities/default.json` | Tauri capability grants (least-privilege — do not expand without security review) |
| `apps/desktop/src-tauri/entitlements.plist` | macOS Hardened Runtime entitlements (only `allow-jit`) |
| `apps/desktop/src-tauri/Cargo.toml` | Rust dependencies (kira, symphonia, tauri-plugin-store, etc.) |
| `packages/ui/tailwind.config.js` | Single source of all design tokens — used by desktop frontend AND website |

---

## Rust Backend Entry Points

| File | Purpose |
|---|---|
| `src/lib.rs` | Tauri app setup, plugin registration, command handler registration |
| `src/commands/audio.rs` | `play_sound`, `stop_sound`, `set_volume`, `get_session` |
| `src/commands/library.rs` | `get_panels`, `get_directories`, `add_directory`, `remove_directory`, `refresh_library` |
| `src/audio/manager.rs` | kira `AudioManager` wrapper, `AudioState` struct |
| `src/library/scanner.rs` | Filesystem scanner — builds `LibraryIndex` from directory roots |
| `src/library/index.rs` | `LibraryIndex` struct, panel merging logic |
| `src/config/store.rs` | `AppConfig` persistence via `tauri-plugin-store` |

---

## Development Workflow Notes

- **Frontend hot reload** works during `tauri dev` — React/Tailwind changes appear instantly in the WebView
- **Rust backend changes** trigger recompilation and restart of the Tauri process (~10–30 seconds)
- **Design tokens** are in `packages/ui/tailwind.config.js` — editing here affects both the desktop frontend and the website
- **CSP violations** appear in the WebView's DevTools console (accessible via right-click > Inspect in development builds; disabled in release builds)
- **Tauri event debugging**: subscribe to `soundblart://session-changed` in browser console during development to trace audio state transitions
