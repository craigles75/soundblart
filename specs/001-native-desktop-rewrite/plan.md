# Implementation Plan: Soundblart — Native Desktop Rewrite

**Branch**: `001-native-desktop-rewrite` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-native-desktop-rewrite/spec.md`

---

## Summary

Soundblart is rebuilt from Flutter to **Tauri v2** (Rust backend + React/Tailwind WebView frontend) targeting macOS and Windows. The existing HTML/Tailwind mockups (`designs/stitch/`) become the app's frontend directly — zero design translation cost. Audio playback routes through a Rust backend (kira + symphonia + platform audio APIs) to achieve guaranteed <30ms end-to-end latency on both platforms, bypassing the WebView's unreliable Web Audio API path. A companion Astro marketing site shares design tokens via a pnpm monorepo. The Flutter codebase (`soundblart/`) is superseded but not deleted.

**Key decisions (all resolved in research.md)**:
- Framework: Tauri v2 (Flutter disqualified on Windows audio latency; Electron on binary size)
- Audio: kira (polyphonic, lock-free) + symphonia (WAV decode) via `invoke()` IPC — never Web Audio API
- Frontend: React + Tailwind CSS (direct from mockups)
- Website: Astro + Tailwind CSS (shared design tokens)
- Distribution: NSIS installer (Windows, EV cert) + universal .dmg (macOS, notarized)

---

## Technical Context

**Language/Version**: Rust stable 1.77+ (backend); TypeScript/React 18 (frontend); Node.js 20+
**Primary Dependencies**: Tauri v2, kira 0.9.x, symphonia 0.5.x, cpal 0.15.x (via kira), tauri-plugin-store, tauri-plugin-dialog, React 18, Tailwind CSS v3, Vite 5, Astro 4
**Storage**: JSON file via `tauri-plugin-store` at platform app config dir (macOS: `~/Library/Application Support/com.soundblart.app/`; Windows: `%APPDATA%\com.soundblart.app\`)
**Testing**: `cargo test` (Rust unit + integration), Vitest (React frontend), manual cross-platform regression for audio latency and visual rendering
**Target Platform**: macOS 13.0+ (Ventura, universal arm64+x86_64), Windows 10/11 (x86_64)
**Project Type**: Desktop app (Tauri) + static website (Astro)
**Performance Goals**: Sound pad trigger → audio output ≤50ms (target ~20ms); app launch → Studio screen ready ≤3s; library scan ≤2s for 500 WAV files
**Constraints**: Binary ≤20MB (Tauri achieves 8–15MB); offline-only (no network calls from app); single-user local storage only; `.wav` files only
**Scale/Scope**: Single-user local app; library up to ~10,000 WAV files across multiple directories; 4 screens (Studio, Library, Folders, Settings); 1 website (marketing + download)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Simplicity First** | ✅ PASS | Tauri v2's architecture is inherently simple: one Rust binary + WebView. No state management packages in the frontend (React context for local state). YAGNI applied — no cloud sync, accounts, or plugin system in scope. |
| **II. Filesystem-Driven Sound Discovery** | ✅ PASS | Folder = panel, .wav = sound, no database. LibraryIndex is rebuilt from filesystem on every scan. Only `.wav` files loaded; enforced in Rust scanner AND in `validate_sound_path()`. |
| **III. Service Isolation & Single Responsibility** | ✅ PASS | Rust modules: `audio/` (kira only), `library/` (scanner + index only), `config/` (persistence only). Commands in `commands/` delegate to services; services do not call each other. |
| **IV. Cross-Platform Desktop Parity** | ✅ PASS | Single Tauri codebase targets both platforms. Audio uses platform-native APIs via cpal (CoreAudio/WASAPI) — same kira abstraction, different HAL. CI builds both platforms on every tag. |
| **V. Test & Analyze Before Merge** | ✅ PASS | `cargo test` required; Rust backend unit-testable without frontend. `cargo clippy` (equivalent to `flutter analyze`) required. Frontend: Vitest for component tests. |

**Complexity Tracking**: No constitution violations. No complexity justification required.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-native-desktop-rewrite/
├── plan.md              ← This file
├── research.md          ← Framework + audio + security decisions (Phase 0)
├── data-model.md        ← Entity definitions (Phase 1)
├── quickstart.md        ← Developer setup guide (Phase 1)
├── contracts/
│   └── tauri-ipc-commands.md  ← Tauri IPC command contracts (Phase 1)
└── tasks.md             ← Task breakdown (Phase 2 — /speckit.tasks)
```

### Source Code (repository root)

```text
soundblart/                      ← repo root
  packages/
    ui/                          ← Shared design system package
      package.json               ←   name: @soundblart/ui
      tailwind.config.js         ←   Single source of all Tailwind design tokens
      src/
        components/              ←   Shared React components (SoundPad, NavItem, etc.)
        index.ts                 ←   Package exports
  apps/
    desktop/                     ← Tauri v2 desktop application
      package.json               ←   name: @soundblart/desktop
      vite.config.ts
      index.html
      src/                       ←   React frontend
        screens/
          Studio.tsx             ←   Sound pad grid, session controls
          Library.tsx            ←   Category cards bento grid
          Folders.tsx            ←   Directory management + stats
          Settings.tsx           ←   Volume, preferences
        components/              ←   Desktop-specific components
        hooks/                   ←   useSession(), usePanels(), useDirectories()
        lib/
          ipc.ts                 ←   Typed wrappers around invoke() calls
          events.ts              ←   Tauri event subscriptions
      src-tauri/                 ←   Rust backend
        tauri.conf.json
        capabilities/
          default.json           ←   Tauri capability grants (least-privilege)
        entitlements.plist       ←   macOS: only allow-jit
        Cargo.toml
        src/
          main.rs                ←   Entry point
          lib.rs                 ←   Tauri builder, plugin + command registration
          commands/
            audio.rs             ←   play_sound, stop_sound, set_volume, get_session
            library.rs           ←   get_panels, add_directory, remove_directory, refresh_library
            dialog.rs            ←   pick_directory (wraps tauri-plugin-dialog)
          audio/
            manager.rs           ←   AudioState struct, kira AudioManager wrapper
            loader.rs            ←   WAV decode via symphonia → StaticSoundData
          library/
            scanner.rs           ←   Filesystem scan → Panel + Sound discovery
            index.rs             ←   LibraryIndex struct, panel merging, RwLock
            validator.rs         ←   validate_sound_path(), file size guard
          config/
            store.rs             ←   AppConfig persistence via tauri-plugin-store
          presets/
            installer.rs         ←   First-run copy of bundled soundbites/ to app support dir
        icons/                   ←   App icons (all sizes, Tauri requirement)
        sounds/                  ←   Bundled preset .wav files (copied from soundbites/)
    website/                     ← Astro marketing site
      package.json               ←   name: @soundblart/website
      astro.config.mjs
      src/
        pages/
          index.astro            ←   Landing page (hero, features, download CTAs)
          download.astro         ←   Platform-specific download page
        components/              ←   Astro/React island components
        styles/
          global.css             ←   Tailwind base + Sonic Atelier utilities
      public/
        screenshots/             ←   App screenshots for marketing
  soundbites/                    ← Existing bundled preset WAV files (unchanged)
  soundblart/                    ← Legacy Flutter app (preserved, not used in build)
  .github/
    workflows/
      release.yml                ← Updated: builds Tauri macOS + Windows + website
  pnpm-workspace.yaml
  package.json                   ← Workspace root
```

**Structure Decision**: pnpm monorepo with `packages/ui` for shared design tokens and `apps/desktop` + `apps/website` for the two deliverables. The existing `soundblart/` Flutter directory is preserved but excluded from the new build pipeline. The new Rust project is at `apps/desktop/src-tauri/`.

---

## Phase 0: Research — Complete

See [`research.md`](./research.md) for full findings. All NEEDS CLARIFICATION items resolved:

- ✅ Framework: Tauri v2
- ✅ Audio library: kira + symphonia (NOT Web Audio API)
- ✅ Frontend: React + Tailwind CSS
- ✅ Website: Astro + Tailwind CSS
- ✅ Distribution: NSIS (Windows, EV cert) + .dmg (macOS, notarized)
- ✅ macOS minimum: 13.0 (Ventura)
- ✅ Security: capability set, path validation, CSP, entitlements defined

---

## Phase 1: Design & Contracts — Complete

### data-model.md

Entities: `Sound`, `Panel`, `Directory`, `Session`, `AppConfig`, `LibraryIndex`, `AudioState`, `ColorCategory`, `IndexState`.

Key design decisions:
- `LibraryIndex` behind `RwLock` (readers never block each other; only refresh acquires write lock)
- `AudioState.loaded_sounds` pre-populated at scan time (decode-at-load, not decode-at-play)
- `AppConfig` persists only 4 fields: directory paths, volume, last active panel, schema version
- Panel name merging: case-insensitive exact match across directories → combined panel

### contracts/tauri-ipc-commands.md

All 12 IPC commands defined with TypeScript signatures, preconditions, side effects, error messages, and Tauri event payloads. Every path-accepting command has `validate_sound_path()` as a security precondition.

**Command surface**:
- Audio: `play_sound`, `stop_sound`, `set_volume`, `get_session`
- Library: `get_panels`, `set_active_panel`, `get_directories`, `get_library_stats`
- Directory management: `pick_directory`, `add_directory`, `remove_directory`, `refresh_library`
- Events: `soundblart://session-changed`, `soundblart://library-updated`, `soundblart://sound-finished`, `soundblart://directory-error`

### Design System Gaps (must address in implementation)

Five gaps from the UX audit that require implementation decisions, not just code:

1. **Playing state** (P0): No mockup exists. Spec: 2px solid primary (#ff8f6f) border + inset white shadow at 0.25 opacity + stop icon always visible. Add to `SoundPad` component.
2. **Inactive nav contrast** (WCAG fail): Change `#484847` → `#adaaaa` (on-surface-variant). Affects sidebar rail and desktop top bar.
3. **Pad sublabel contrast** (WCAG fail): Change `on-primary-fixed/60` → 80%+ opacity.
4. **Focus-visible**: Add `outline: 2px solid #ff8f6f; outline-offset: 2px` on `:focus-visible` globally in `global.css`.
5. **Library cards**: Convert `<div class="... cursor-pointer">` → `<button>` or add `role="button" tabindex="0"`.

### Desktop Adaptations (not in mockups)

- **Navigation**: Left sidebar rail (72px collapsed / 220px expanded) replaces mobile bottom nav
- **macOS window**: `padding-top: 28px` on header (or `fullSizeContentView` with manual inset)
- **Pad grid**: Always 3 columns on desktop; play icon 10–15% opacity at rest (not fully hidden)
- **Max-width**: Standardize all screens to `max-w-7xl` (1280px)
- **Scrolling**: Overflow-y within each screen region, not full-page scroll

### Constitution Check (post-design re-evaluation)

All five principles still pass. No violations introduced by the design decisions.

---

## CI/CD Pipeline (updated from existing release.yml)

```yaml
# Trigger: push v* tag (unchanged)
jobs:
  build-macos:
    runs-on: macos-14
    steps:
      - Install Rust (stable, targets: aarch64-apple-darwin x86_64-apple-darwin)
      - Install Node 20 + pnpm
      - pnpm install
      - Import Developer ID certificate (keychain)
      - pnpm tauri build --target universal-apple-darwin
        (env: APPLE_SIGNING_IDENTITY, APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID)
      - Upload .dmg artifact

  build-windows:
    runs-on: windows-latest
    steps:
      - Install Rust (stable)
      - Install Node 20 + pnpm
      - pnpm install
      - pnpm tauri build
        (env: TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD)
        Note: EV cert signing via cloud HSM (DigiCert KeyLocker or SSL.com eSigner)
      - Upload .exe (NSIS) artifact

  build-website:
    runs-on: ubuntu-latest
    steps:
      - pnpm install
      - pnpm --filter @soundblart/website build
      - Deploy to hosting (TBD: Cloudflare Pages, Netlify, or Vercel)
```

---

## Key Risks and Mitigations

| Risk | Mitigation |
|---|---|
| kira/cpal WASAPI buffer resizing API instability | Pin kira version; run audio latency integration test in Windows CI |
| WebKit vs WebView2 CSS rendering divergence for neumorphic shadows | Visual regression screenshot test on both platforms before release |
| EV certificate cloud HSM CI setup complexity | Budget 2–3 days; document step-by-step in `docs/signing.md` |
| Rust learning curve for team new to Rust | audio/ and library/ modules are pure-Rust with no async complexity; ~600–800 lines total |
| macOS `allow-jit` entitlement rejected by Apple notarization | Well-documented Tauri requirement; no risk in practice |

---

## Open Questions (for tasks phase)

1. **Settings screen scope**: The mockup nav has a Settings tab but no Settings screen mockup exists. What goes there? (Assumed: volume control already in Studio; Settings = about, version, update check)
2. **Sound preview in Library**: Preview plays a sound without changing the active Studio panel — does it use the same kira instance or a separate preview channel?
3. **Auto-refresh**: Should the app watch configured directories for filesystem changes (using `notify` crate) and auto-mark as Stale, or only refresh on user action?
