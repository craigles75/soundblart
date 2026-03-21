# Tasks: Soundblart — Native Desktop Rewrite

**Input**: Design documents from `/specs/001-native-desktop-rewrite/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/tauri-ipc-commands.md ✅, quickstart.md ✅

**Agent Assignment Key**:
- `[rust]` → rust-engineer: Rust backend, audio, library, config (Tauri commands, kira, symphonia)
- `[fe]` → frontend-engineer: React/TypeScript desktop UI, hooks, IPC wrappers
- `[ux]` → ux-engineer: Design system, Tailwind tokens, accessibility, visual polish
- `[devops]` → devops-engineer: CI/CD pipeline, signing, build tooling
- `[web]` → web-engineer: Astro marketing site

**Organization**: Tasks grouped by user story for independent implementation and testing.
**Tests**: Not generated — not requested in the feature specification.

## Format: `[ID] [P?] [Story?] [Agent] Description — file path`

- **[P]**: Can run in parallel (different files, no blocking in-phase dependency)
- **[Story]**: User story this task belongs to (US1–US4)
- **[Agent]**: Assigned role (rust / fe / ux / devops / web)

---

## Phase 1: Setup (Monorepo Scaffolding)

**Purpose**: Create the pnpm workspace, scaffold all packages, and configure the build toolchain. Must complete before Phase 2.

- [x] T001 [devops] Create pnpm monorepo root with pnpm-workspace.yaml declaring packages/ui, apps/desktop, apps/website workspaces and root package.json at soundblart/
- [x] T002 [P] [fe] Initialize packages/ui package with package.json (name: @soundblart/ui), tailwind.config.js stub, and src/index.ts barrel export
- [x] T003 [P] [fe] Scaffold apps/desktop Tauri v2 frontend with package.json (name: @soundblart/desktop), vite.config.ts (Tauri Vite plugin), and index.html entry point
- [x] T004 [P] [web] Scaffold apps/website Astro project with package.json (name: @soundblart/website) and astro.config.mjs (Tailwind integration pointing to packages/ui)
- [x] T005 [rust] Initialize apps/desktop/src-tauri Rust workspace with Cargo.toml declaring kira 0.9.x, symphonia 0.5.x (wav feature), tauri 2, tauri-plugin-store, tauri-plugin-dialog, and serde dependencies
- [x] T006 [P] [rust] Configure Tauri security: apps/desktop/src-tauri/capabilities/default.json (core:default, dialog:allow-open, fs:allow-read-file, fs:allow-read-dir, fs:allow-exists only), apps/desktop/src-tauri/entitlements.plist (allow-jit only), and tauri.conf.json CSP (script-src 'self', connect-src ipc: asset:, no external origins)
- [x] T007 [P] [ux] Define all Neon Neumorphic design tokens in packages/ui/tailwind.config.js — full color palette (primary #ff8f6f, secondary #91f78e, tertiary #44a5ff, base surface #0e0e0e), Space Grotesk + Plus Jakarta Sans font families, neumorphic shadow utilities, scale(0.96) press animation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Rust infrastructure and shared frontend scaffolding that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T008 [rust] Define all core Rust data types — Sound, Panel, ColorCategory enum, IndexState enum, Directory, Session, AppConfig, LibraryIndex, AudioState structs — per data-model.md, organized into apps/desktop/src-tauri/src/ modules (audio/, library/, config/)
- [x] T009 [P] [rust] Implement validate_sound_path() (std::fs::canonicalize, approved-root prefix check, .wav extension guard, 50MB file_size_bytes guard) in apps/desktop/src-tauri/src/library/validator.rs
- [x] T010 [P] [rust] Implement AppConfig load/save/migrate via tauri-plugin-store (directory_paths, master_volume, last_active_panel, schema version 1) in apps/desktop/src-tauri/src/config/store.rs
- [x] T011 [rust] Implement PresetInstaller (first-run copy of src-tauri/sounds/ WAV files to platform app support dir, registers system directory path in AppConfig as is_read_only: true) in apps/desktop/src-tauri/src/presets/installer.rs
- [x] T012 [rust] Wire Tauri app builder in apps/desktop/src-tauri/src/lib.rs: manage AppState (LibraryIndex behind RwLock, AudioState, Session), register tauri-plugin-store and tauri-plugin-dialog, call PresetInstaller on first run, register all command handlers via generate_handler![]
- [x] T013 [P] [ux] Create apps/desktop/src/styles/global.css with Neon Neumorphic base styles, global focus-visible outline (2px solid #ff8f6f, offset 2px), and prefers-reduced-motion support for animate-pulse and transition animations
- [x] T014 [P] [fe] Implement all 12 typed invoke() wrappers (play_sound, stop_sound, set_volume, get_session, get_panels, set_active_panel, get_directories, get_library_stats, pick_directory, add_directory, remove_directory, refresh_library) in apps/desktop/src/lib/ipc.ts and Tauri event subscriptions (session-changed, library-refreshing, library-updated, sound-finished, directory-error) in apps/desktop/src/lib/events.ts
- [x] T015 [P] [ux] Build SoundPad component in packages/ui/src/components/SoundPad.tsx with playing-state visual (2px solid #ff8f6f border, inset white shadow 0.25 opacity, stop icon always visible when playing), scale(0.96) press animation, pad sublabel at 80%+ opacity (WCAG fix), and accessible button semantics
- [x] T016 [P] [ux] Build AppShell with left sidebar navigation rail (72px collapsed / 220px expanded) in apps/desktop/src/components/AppShell.tsx — four nav items (Studio, Library, Folders, Settings), inactive nav color #adaaaa (WCAG fix from #484847), macOS traffic-light top padding (padding-top: 28px)

**Checkpoint**: Foundation complete — all user story phases can now begin, independently if staffed.

---

## Phase 3: User Story 1 — Trigger Sounds Live During a Session (P1) MVP

**Goal**: A user opens the app, sees the Studio screen with preset sound pads loaded, and can trigger/stop sounds with <50ms latency. Volume is adjustable in real time. Panel switching updates the grid.

**Independent Test**: Launch the app — preset sounds are pre-loaded (no configuration required). Click any sound pad — audio begins within 50ms. Click the same pad again while it is playing — stops. Click a different pad while one is playing — first stops, second starts immediately. Adjust volume slider — output changes without interrupting playback. Switch panel via dropdown — grid updates to that panel's sounds.

### Implementation for User Story 1

- [ ] T017 [rust] Implement AudioManager wrapper (kira AudioManager singleton, WASAPI shared mode 256-frame buffer on Windows via cpal, CoreAudio on macOS, main track volume control) and AudioState struct (sound_handles HashMap, loaded_sounds HashMap for decode-at-scan pre-population) in apps/desktop/src-tauri/src/audio/manager.rs
- [ ] T018 [P] [US1] [rust] Implement WAV loader (symphonia WAV decode → StaticSoundData, populate AudioState.loaded_sounds at scan time, skip and log corrupted files rather than crashing) in apps/desktop/src-tauri/src/audio/loader.rs
- [ ] T019 [US1] [rust] Implement play_sound (validate_sound_path, stop current handle via StaticSoundHandle::stop(), play from loaded_sounds, update Session.playing_sound_path and is_live, emit soundblart://session-changed), stop_sound, set_volume (kira main track, clamp 0.0–1.0, debounced 500ms persist to AppConfig), and get_session Tauri commands in apps/desktop/src-tauri/src/commands/audio.rs — include audio device unavailable error surfacing
- [ ] T020 [P] [US1] [rust] Implement filesystem scanner (one-level-deep subfolder scan, skip hidden directories, derive Sound.name from filename, auto-assign ColorCategory by keyword matching panel name, enforce 50MB file_size_bytes guard, skip non-.wav files silently, skip panels with zero .wav files) in apps/desktop/src-tauri/src/library/scanner.rs
- [ ] T021 [P] [US1] [rust] Implement LibraryIndex struct (HashMap<String,Panel> behind RwLock keyed by lowercased panel name for case-insensitive merge, sounds HashMap keyed by canonical path for O(1) play lookup, panel merging concatenates and re-indexes sounds across directories) in apps/desktop/src-tauri/src/library/index.rs
- [ ] T022 [US1] [rust] Implement get_panels (read lock on LibraryIndex, return sorted Panel list), set_active_panel (update Session.active_panel_name, debounced persist to AppConfig.last_active_panel, emit soundblart://session-changed) in apps/desktop/src-tauri/src/commands/library.rs
- [ ] T023 [P] [US1] [fe] Implement useSession hook (subscribes to soundblart://session-changed via events.ts, exposes playing_sound_path, master_volume, active_panel_name, is_live with initial load via get_session()) in apps/desktop/src/hooks/useSession.ts
- [ ] T024 [P] [US1] [fe] Implement usePanels hook (calls get_panels() on mount, re-fetches on soundblart://library-updated event, exposes panels array and loading state) in apps/desktop/src/hooks/usePanels.ts
- [ ] T025 [US1] [fe] Build SoundGrid component (3-column CSS grid of SoundPad, minimum 6 slots always rendered, scrollable when panel has >6 sounds, passes playing state from useSession to each SoundPad, calls play_sound or stop_sound on pad click) in apps/desktop/src/components/SoundGrid.tsx
- [ ] T026 [P] [US1] [fe] Build PanelDropdown component (lists all panels from usePanels, highlights active panel, calls set_active_panel on selection) in apps/desktop/src/components/PanelDropdown.tsx
- [ ] T027 [P] [US1] [fe] Build VolumeSlider component (range 0.0–1.0, calls set_volume on change, initializes from useSession.master_volume) in apps/desktop/src/components/VolumeSlider.tsx
- [ ] T028 [US1] [fe] Build Studio screen (SoundGrid + PanelDropdown + VolumeSlider + "Live Output" indicator from useSession.is_live, max-w-7xl layout, play icon at 10–15% opacity at rest on desktop) in apps/desktop/src/screens/Studio.tsx

**Checkpoint**: US1 complete — the app is a functional MVP soundboard with preset sounds.

---

## Phase 4: User Story 2 — Browse & Preview the Sound Library (P2)

**Goal**: Users see all panels as color-coded category cards with sound counts, can expand to individual sounds, and preview a sound without changing the active Studio session.

**Independent Test**: Navigate to Library screen — each top-level folder appears as a colored card with name and .wav count. Click a card — individual sound names and a preview button appear. Click preview — sound plays for audition; the Studio active panel and Session.playing_sound_path are unchanged. Click preview again — stops. Navigate to Library with no directories configured — a clear prompt to add a directory is shown, not a blank or broken state.

### Implementation for User Story 2

- [ ] T029 [P] [US2] [rust] Add preview_sound (separate kira StaticSoundHandle stored as AudioState.preview_handle, does NOT update Session.playing_sound_path, calls validate_sound_path) and stop_preview Tauri commands in apps/desktop/src-tauri/src/commands/audio.rs
- [ ] T030 [US2] [fe] Build Library screen with bento-grid category cards (ColorCategory gradient styling per data-model.md color map, sound_count badge, convert implicit-div pattern to explicit button elements for keyboard accessibility) in apps/desktop/src/screens/Library.tsx
- [ ] T031 [P] [US2] [fe] Add sound list expansion panel within Library screen (individual Sound rows with name, 1-based index number, and preview/stop toggle button that calls preview_sound / stop_preview) in apps/desktop/src/screens/Library.tsx
- [ ] T032 [US2] [fe] Add empty-state view in Library screen when no directories are configured (clear message and CTA link navigating to Settings screen) in apps/desktop/src/screens/Library.tsx

**Checkpoint**: US1 + US2 complete — Studio and Library screens are fully functional.

---

## Phase 5: User Story 3 — Configure Sound Directories (P3)

**Goal**: Settings screen shows System Sounds (read-only) and User Sounds (configurable via OS picker). Folders screen shows index state, asset count, disk usage, and a Refresh Library action. Both directories merge panels with the same name.

**Independent Test**: Open Settings screen — see System Sounds path labeled "System Sounds" (no remove button) and User Sounds with "Change User Sounds Directory" button (or empty-state prompt if not yet set). Click the button — OS native folder picker opens. Select a folder with .wav subfolders — return to Studio and those subfolders appear as panels. Open Folders screen — both entries show IndexState badge, asset count, disk usage, and last-indexed latency. Click "Refresh Library" — new subfolders added externally appear. Attempting to add an already-added directory is rejected with a clear message.

### Implementation for User Story 3

- [ ] T033 [rust] Implement pick_directory (tauri-plugin-dialog open({ directory: true })), add_directory (canonicalize, is-directory check, duplicate guard, append to AppConfig.directory_paths, run scanner+loader, merge into LibraryIndex, return DirectoryInfo), remove_directory (read-only guard, evict sounds from LibraryIndex and AudioState.loaded_sounds, stop playback if playing_sound_path is from this directory, re-merge remaining panels, persist config), refresh_library (set all dirs to Indexing, emit library-refreshing, full rescan, rebuild LibraryIndex, re-decode changed WAVs, evict removed sounds, emit library-updated, return LibraryStats), get_directories, get_library_stats in apps/desktop/src-tauri/src/commands/library.rs and apps/desktop/src-tauri/src/commands/dialog.rs
- [ ] T034 [P] [US3] [fe] Implement useDirectories hook (calls get_directories() on mount, re-fetches on soundblart://library-updated, exposes directories array, isRefreshing flag, and refresh action; subscribes to soundblart://directory-error to surface per-directory error state) in apps/desktop/src/hooks/useDirectories.ts
- [ ] T035 [P] [US3] [fe] Build Folders screen (lists all directories from useDirectories, each entry shows label, path, IndexState badge (Clean/Stale/Indexing/Error with error message), asset_count, disk_usage_bytes formatted as human-readable, last_indexed_at, latency_ms, aggregate stats row; "Refresh Library" button calls refresh_library, shows Indexing state during scan) in apps/desktop/src/screens/Folders.tsx
- [ ] T036 [US3] [fe] Build Settings screen (System Sounds entry: read-only, path label, no remove button; User Sounds entry: current path or empty-state prompt, "Change User Sounds Directory" button that calls pick_directory then add_directory, removes old User Sounds path via remove_directory before adding new one) in apps/desktop/src/screens/Settings.tsx

**Checkpoint**: US1 + US2 + US3 complete — full desktop app feature set delivered.

---

## Phase 6: User Story 4 — Marketing Website (P4)

**Goal**: A polished Astro marketing site with Soundblart branding, feature highlights, platform-specific download links, and a "web app coming soon" callout. Fully responsive, using the Neon Neumorphic design system.

**Independent Test**: Visit the site — immediately see "Soundblart", a one-sentence description ("A tactile soundboard for meetings, streaming, and podcasting"), and a prominent download CTA. Click Download — see separate macOS and Windows download options. Resize to any viewport — layout stays usable and on-brand. Look for a browser-based version — see "Web App Coming Soon" callout, not a broken link or missing page.

### Implementation for User Story 4

- [ ] T037 [web] Bootstrap Astro site: astro.config.mjs with @astrojs/tailwind using packages/ui/tailwind.config.js tokens, apps/website/src/styles/global.css (Neon Neumorphic base, focus-visible, Google Fonts for Space Grotesk + Plus Jakarta Sans), public/screenshots/ placeholder directory
- [ ] T038 [P] [US4] [web] Build landing page in apps/website/src/pages/index.astro: hero section (app name, one-sentence value prop, primary Download CTA button), feature highlights grid (low-latency, cross-platform, design-first), app screenshots section, footer with links
- [ ] T039 [P] [US4] [web] Build download page in apps/website/src/pages/download.astro: macOS download card (universal .dmg, macOS 13+ requirement), Windows download card (NSIS .exe, Windows 10/11), "Web App — Coming Soon" section (clearly deferred, no implied availability)
- [ ] T040 [US4] [web] Validate full responsive layout (mobile 375px through desktop 1440px) and visual consistency (Neon Neumorphic palette, typography, no broken tokens) across apps/website/src/pages/

**Checkpoint**: All four user stories complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: CI/CD pipeline, Rust tests, accessibility audit, and final validation pass.

- [ ] T041 [P] [devops] Update .github/workflows/release.yml for Tauri builds: macOS job (macos-14, universal-apple-darwin target, Developer ID signing, notarytool notarization, upload .dmg); Windows job (windows-latest, NSIS bundler, EV cert via cloud HSM env vars TAURI_SIGNING_PRIVATE_KEY / TAURI_SIGNING_PRIVATE_KEY_PASSWORD, upload .exe); Astro website job (ubuntu-latest, pnpm --filter @soundblart/website build, deploy step placeholder)
- [ ] T042 [P] [rust] Write Rust unit tests for validate_sound_path (path traversal attempts, extension checks, size guard), scanner (panel discovery, hidden-dir skip, empty-panel exclusion), and LibraryIndex panel merging (case-insensitive name match, sound re-indexing) in apps/desktop/src-tauri/src/ test modules
- [ ] T043 [P] [ux] Final accessibility and desktop-adaptation audit: verify inactive nav uses #adaaaa, pad sublabels at 80%+ opacity, play icon at 10–15% opacity at rest, max-w-7xl applied consistently on all four screens, overflow-y scrolling scoped to screen regions — fix any deviations in apps/desktop/src/
- [ ] T044 [rust] Run cargo clippy (zero warnings), cargo test (all pass), cargo check in apps/desktop/src-tauri/; run pnpm build for apps/desktop and apps/website; run pnpm tauri info and verify only approved capabilities are granted
- [ ] T045 [devops] Validate quickstart.md steps end-to-end on macOS and Windows: pnpm install → pnpm --filter @soundblart/ui build → pnpm tauri dev → cargo check + pnpm build + cargo test verification commands

---

## Phase 7.5: Pre-Release Blockers

**Purpose**: Issues that must be resolved before the app can be distributed to users.

### macOS Gatekeeper Bypass (Dev/Testing)

- [ ] T059 [devops] Until code signing is in place (T046), document the workaround for unsigned builds: run `xattr -cr /path/to/soundblart.app` to strip the quarantine flag, or launch via `pnpm tauri dev` which bypasses Gatekeeper. Add to README or quickstart.md.

### First Release Build

- [ ] T060 [devops] Merge 001-native-desktop-rewrite branch to main, then tag and push v0.1.0-alpha to trigger the CI release workflow. This will produce the first .dmg (macOS) and .exe (Windows) via tauri-apps/tauri-action and upload them to a GitHub Release. Verify both artifacts are present and downloadable. Note: without code signing (T046/T047), macOS users will need the xattr workaround and Windows users may see SmartScreen warnings.
- [ ] T061 [web] Update download page links to point to specific release assets (e.g. .dmg and .exe direct download URLs) rather than the generic /releases/latest page, OR verify that /releases/latest correctly resolves to the new Tauri release (not the old Flutter zip files). If old Flutter releases are confusing, delete them from GitHub.

**Checkpoint**: Users can download and run unsigned alpha builds from the website.

---

## Phase 8: Release Readiness & Distribution

**Purpose**: Everything needed to ship a signed, downloadable release and present a professional public face.

### Code Signing & Notarization

- [ ] T046 [devops] macOS code signing: enroll in Apple Developer Program ($99/year), generate Developer ID Application certificate, configure APPLE_CERTIFICATE, APPLE_CERTIFICATE_PASSWORD, APPLE_ID, APPLE_TEAM_ID as GitHub Actions secrets, set signingIdentity in tauri.conf.json via env var, add notarytool notarization step to release workflow
- [ ] T047 [devops] Windows code signing: acquire EV code signing certificate (or OV certificate), configure TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD as GitHub Actions secrets, verify NSIS installer is signed in release workflow output

### App Icons & Branding

- [ ] T048 [ux] Design production app icon: 1024x1024 master PNG (Soundblart logo/wordmark on dark background matching #0e0e0e palette), export to all required sizes (32x32, 128x128, 128x128@2x, 256x256, 512x512) in apps/desktop/src-tauri/icons/
- [ ] T049 [ux] Generate icon.icns (macOS) and icon.ico (Windows) from production master PNG — replace current placeholder solid-orange icons
- [ ] T050 [ux] Create favicon.svg for the marketing website (apps/website/public/favicon.svg) — currently referenced in Base.astro but missing

### Website Assets

- [ ] T051 [ux] Create Open Graph image (1200x630) for social sharing — app screenshot or branded card, add to apps/website/public/og-image.png, wire og:image and twitter:image meta tags in Base.astro
- [ ] T052 [ux] Capture app screenshots for marketing site hero section — Studio screen with sound pads active, Library screen with category cards — add to apps/website/public/screenshots/
- [ ] T053 [web] Add screenshot section to landing page (apps/website/src/pages/index.astro) between Features and How It Works sections — responsive image grid with alt text

### Domain & Hosting

- [ ] T054 [devops] Register and configure custom domain (e.g. soundblart.com) — point DNS to Vercel, add domain in Vercel project settings, verify SSL certificate provisioning
- [ ] T055 [devops] Add Vercel HTTP security headers via public/_headers or vercel.json headers config: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Permissions-Policy: camera=(), microphone=(), geolocation=()

### Distribution & Metadata

- [ ] T056 [devops] Create CHANGELOG.md at repo root — document v0.1.0 features (Studio, Library, Folders, Settings, preset sounds, cross-platform)
- [ ] T057 [devops] Add robots.txt (apps/website/public/robots.txt) and @astrojs/sitemap integration for SEO
- [ ] T058 [devops] Tag and publish v0.1.0 release — verify CI builds both platforms, uploads .dmg and .exe to GitHub release, website deploys successfully

**Checkpoint**: Soundblart is publicly downloadable, signed, and discoverable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion — BLOCKS all user story phases
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) — no story dependencies
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) + T017 (AudioManager) — independent of US1 frontend
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) + T021 (LibraryIndex) + T022 (library commands) — independent of US1/US2 frontend
- **User Story 4 (Phase 6)**: Depends on Setup (Phase 1: T001, T004, T007) only — can run in parallel with Phase 2 and user stories
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1**: No story dependencies — Rust backend (T017–T022) and React frontend (T023–T028) are separate tracks
- **US2**: Reuses AudioState (T017/T018) for preview channel (T029); Library screen (T030–T032) is frontend-only
- **US3**: Extends library commands file (T022) — T033 adds to the same file; no US1/US2 screen dependencies
- **US4**: Fully independent of US1–US3

### Critical Path (single engineer)

```
T001 → T002–T004 (parallel) → T005 → T006–T007 (parallel)
  → T008–T010 (parallel) → T011 → T012
  → T013–T016 (parallel frontend)
  → T017 → T018–T022 (parallel where marked)
  → T023–T028 (parallel where marked)
  → T029–T032 → T033–T036 → T037–T040
  → T041–T044 → T045
```

### Within Each User Story

- Backend (Rust) and frontend (React) tracks can run in parallel once their shared foundation (T008–T016) is done
- Models before services (T008 before T019–T022)
- Services before commands; commands before hooks; hooks before screens
- Validate story independently before moving to next priority

---

## Parallel Example: User Story 1

```bash
# After T017 (AudioManager) completes, launch in parallel:
Task T018: "Implement WAV loader in apps/desktop/src-tauri/src/audio/loader.rs"          [rust]
Task T020: "Implement filesystem scanner in apps/desktop/src-tauri/src/library/scanner.rs" [rust]
Task T021: "Implement LibraryIndex in apps/desktop/src-tauri/src/library/index.rs"        [rust]

# After T012 (lib.rs wired) + T013–T016 (foundation frontend), launch in parallel:
Task T023: "Implement useSession hook in apps/desktop/src/hooks/useSession.ts"           [fe]
Task T024: "Implement usePanels hook in apps/desktop/src/hooks/usePanels.ts"             [fe]
Task T026: "Build PanelDropdown in apps/desktop/src/components/PanelDropdown.tsx"        [fe]
Task T027: "Build VolumeSlider in apps/desktop/src/components/VolumeSlider.tsx"          [fe]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Studio screen with live sound triggering)
4. **STOP and VALIDATE**: Click pad → audio plays <50ms, toggle, panel switching, volume
5. Ship as v0.1 alpha with bundled preset sounds

### Incremental Delivery

1. Setup + Foundational → both Rust and frontend engineers unblocked in parallel
2. US1 (Studio) → validate independently → MVP release (soundboard works)
3. US2 (Library) → validate independently → release (browse + preview)
4. US3 (Settings + Folders) → validate independently → release (custom directories)
5. US4 (Website) → validate independently → public launch (marketing + download page live)

### Two-Engineer Parallel Strategy

- **Rust engineer**: T005 → T008–T012 → T017–T022 → T029, T033 → T042, T044
- **Frontend/UX engineer**: T002–T004, T007 → T013–T016 → T023–T028 → T030–T032 → T034–T036 → T037–T040 → T043

---

## Open Questions Resolved for Implementation

The three open questions from plan.md are resolved as follows:

1. **Settings screen scope**: Settings = User Sounds directory configuration only (as per spec clarification). Volume control stays in Studio.
2. **Sound preview in Library (US2)**: Preview uses a dedicated kira handle (AudioState.preview_handle) separate from session playback. kira's polyphonic model supports this without a second AudioManager. Implemented in T029.
3. **Auto-refresh**: User-triggered only via "Refresh Library" button in Folders screen. No filesystem watcher (notify crate) in this phase — keeps scope minimal per constitution Principle I.

---

## Notes

- [P] tasks use different files with no blocking in-phase dependency — safe to run in parallel
- Agent labels [rust] [fe] [ux] [devops] [web] indicate assigned role — see key at top
- Each user story has an Independent Test — validate before moving to next priority
- No test tasks generated (tests not requested in spec); T042 adds targeted Rust unit tests for security-critical paths
- Commit after each task or logical group; run cargo clippy + cargo test before any merge per constitution Principle V
- The Tauri capability set in T006 is security-critical — do NOT expand without explicit security review (constitution Principle III)
- All path-accepting Rust commands MUST call validate_sound_path() — this is a security invariant from contracts/tauri-ipc-commands.md
