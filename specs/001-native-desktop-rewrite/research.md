# Research: Soundblart — Native Desktop Rewrite

**Branch**: `001-native-desktop-rewrite`
**Phase 0 output** — all NEEDS CLARIFICATION resolved
**Sources**: python-senior-engineer, windows-native-dev, macos-engineer, ux-ui-designer, security-engineer agents

---

## Decision 1 — Desktop Framework

**Decision**: **Tauri v2** (Rust backend + system WebView frontend)

**Rationale**:
- Binary size: 8–15 MB (vs Flutter 20–40 MB, Electron 120–180 MB) — smallest of all viable candidates
- Frontend IS the design: the HTML/Tailwind mockups run directly in the WebView with zero translation cost. The "Neon Neumorphic" design system is already Tailwind CSS — it becomes the app.
- Cross-platform: WKWebView (macOS) + WebView2 (Windows 10/11) — both are actively maintained by Apple and Microsoft respectively, patched with OS updates
- The audio path bypasses the WebView entirely (see Decision 2), eliminating the WebView2 audio reliability problem
- Tauri v2 (stable October 2024) has mature macOS notarization, universal binary, NSIS installer, and code signing tooling built in
- Rust + IPC model is safer than Electron's Node.js-in-renderer architecture

**Flutter disqualified on**: Windows audio latency — `audioplayers` on Windows reports 50–150ms (GitHub issue tracker), violating the 50ms hard requirement. Additionally, every design change in the HTML mockup requires manual re-implementation in Flutter widgets — the translation cost is prohibitive for a design-differentiated app.

**Electron disqualified on**: Binary size — 120–180 MB minimum, blowing past any reasonable target for a consumer desktop tool.

**Alternatives considered**: PyQt6/PySide6 (80–200 MB bundled Python, HTML mockup unusable), .NET MAUI (macOS via Mac Catalyst is second-class, HTML mockup unusable), Wails v2 (thinner Go audio ecosystem, less mature tooling).

---

## Decision 2 — Audio Architecture

**Decision**: Rust backend audio via Tauri `invoke()` — **never use Web Audio API for playback**

**Audio library**: **kira** (polyphonic, lock-free command queue) + **symphonia** (pure-Rust WAV decoder)

**Rationale**:

| Path | macOS latency | Windows latency | Reliability |
|---|---|---|---|
| Web Audio API (WKWebView) | 30–100ms | 35–80ms | Hardware-dependent, NOT guaranteed <50ms |
| Rust (kira + cpal/CoreAudio) | **10–20ms** | — | Guaranteed |
| Rust (kira + cpal/WASAPI shared) | — | **15–30ms** | Guaranteed |

Web Audio API via WKWebView on macOS runs in the WebContent sandbox process, which cannot request a smaller HAL buffer size. The result is non-deterministic latency with spikes to 80–120ms under load. On Windows, WebView2's WASAPI buffer sizing is conservative and hardware-dependent (35–80ms). Neither path reliably meets the 50ms requirement.

By routing audio through Tauri's `invoke()` IPC (1–3ms overhead), kira's lock-free command queue (~1ms), and cpal's CoreAudio/WASAPI backend (~10–15ms hardware buffer at 256 frames), the total end-to-end budget is **~20ms** on both platforms — 30ms inside the 50ms target.

**Usage pattern** (zero-latency at trigger time):
1. At startup: decode all `.wav` files in selected directories into `StaticSoundData` (PCM in memory) using symphonia
2. At button click: JS calls `invoke('play_sound', { path })` → Rust handler fires kira playback command (~1ms) → audio thread picks up within one buffer period

**kira chosen over rodio** for:
- Native polyphonic playback (multiple simultaneous sounds without manual mixing)
- Lock-free command queue between UI thread and audio thread — no mutex contention at trigger time
- Built-in volume/fade control per sound handle
- rodio's default 4096-frame buffer gives ~93ms latency on Windows out of the box; tuning is possible but kira's design is better suited to soundboard use

**WASAPI shared mode** (not exclusive): exclusive mode would silence other audio (the video call) — architecturally incompatible with the use case. Shared mode at 256-frame buffer gives 15–30ms total.

---

## Decision 3 — Frontend Stack

**Decision**: **React + Tailwind CSS** (inside Tauri WebView)

**Rationale**:
- React (or Svelte) + Tailwind allows direct use of the HTML mockup's Tailwind class names
- React chosen (over Svelte) for wider ecosystem, easier hiring, and compatibility with the shared `packages/ui` monorepo approach
- Vite as bundler (Tauri v2's default — `create-tauri-app` generates a Vite project)
- Tailwind v3 config from the mockups becomes `packages/ui/tailwind.config.js` (shared with website)

**Design token inheritance**: The full Tailwind color palette (`surface`, `primary`, `secondary`, `tertiary`, etc.) is identical across all three HTML mockup files — zero token drift. This config moves verbatim into the shared package.

---

## Decision 4 — Website Stack

**Decision**: **Astro + Tailwind CSS** (Phase 1 marketing/download site)

**Rationale**:
- Astro ships zero JS by default — the marketing site is fast and aligns with a premium brand
- Astro's component model is HTML-native (`.astro` files are essentially HTML + optional frontmatter) — the Tailwind mockup slots in with minimal transformation
- Astro supports React islands — when Phase 2 (web app) arrives, interactive soundboard components can be progressively added without a full rewrite
- Shared design tokens: `packages/ui/tailwind.config.js` is imported by both the Tauri frontend and the Astro site

---

## Decision 5 — Monorepo Structure

**Decision**: **pnpm workspaces** (Turborepo optional, not required initially)

```
soundblart/                     ← repo root
  packages/
    ui/                         ← shared Tailwind config + React components
      tailwind.config.js        ← single source of all design tokens
      src/
        components/             ← shared UI components (SoundPad, NavItem, etc.)
  apps/
    desktop/                    ← Tauri v2 app
      src/                      ← React frontend
      src-tauri/                ← Rust backend
    website/                    ← Astro marketing site
  soundbites/                   ← existing bundled preset .wav files (unchanged)
```

The existing `soundblart/` Flutter directory is preserved but not used in the new build. The Rust project lives at `apps/desktop/src-tauri/`.

---

## Decision 6 — Distribution

### macOS
- Format: **Universal .dmg** (arm64 + x86_64 fat binary, `--target universal-apple-darwin`)
- Distribution: **Direct download** (not Mac App Store) — MAS App Sandbox is incompatible with reading `.wav` files from arbitrary user-chosen directories without security-scoped bookmarks (non-trivial implementation cost, deferred)
- Minimum: **macOS 13.0 (Ventura)**
- Signing: Developer ID Application certificate + Hardened Runtime + `notarytool` notarization (all handled by `tauri build` with env vars)
- Required entitlement: `com.apple.security.cs.allow-jit` (WKWebView JIT requirement)
- Update: Tauri's built-in updater (JSON manifest at a URL we control)

### Windows
- Format: **NSIS installer** (Tauri bundler default) — `.exe` installer, installs to Program Files, full filesystem access for arbitrary sound folder picking
- MSIX rejected: `broadFileSystemAccess` capability required for arbitrary folder picking adds Store review friction; NSIS is zero-friction for direct distribution
- Code signing: **EV (Extended Validation) certificate** — OV cert triggers SmartScreen warnings on new publisher for months; EV grants immediate SmartScreen trust. ~$300–500/year from DigiCert, Sectigo, or GlobalSign. Requires cloud HSM signing service (DigiCert KeyLocker or SSL.com eSigner) for CI/CD
- Windows minimum: **Windows 10** (WebView2 ships with Windows 10 20H2+; bootstrapper handles older builds)
- Update: Tauri's built-in updater

---

## Decision 7 — Security Architecture

Three must-implement decisions identified by the security agent:

### 7.1 Tauri Capability Set (Least Privilege)

`src-tauri/capabilities/default.json` — minimum required:
```json
{
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "fs:allow-read-file",
    "fs:allow-read-dir",
    "fs:allow-exists"
  ]
}
```
Explicitly NOT granted: `fs:allow-write-file`, `fs:allow-remove-file`, `shell:allow-execute`, `shell:allow-spawn`, `http:default`.

### 7.2 Path Validation in Every Rust Command

Every Tauri command that accepts a filesystem path MUST:
1. Call `std::fs::canonicalize()` to resolve symlinks and normalize `..` segments
2. Verify the canonical path starts with an approved root (directory the user explicitly selected via picker)
3. Verify `.wav` extension
4. Check file size ≤ 50MB before loading

```rust
fn validate_sound_path(path: &str, approved_roots: &[PathBuf]) -> Result<PathBuf, String> {
    let canonical = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
    let is_allowed = approved_roots.iter().any(|r| canonical.starts_with(r));
    if !is_allowed { return Err("Path outside approved directory".into()); }
    if canonical.extension().and_then(|e| e.to_str()) != Some("wav") {
        return Err("Only .wav files permitted".into());
    }
    Ok(canonical)
}
```

### 7.3 Content Security Policy

`tauri.conf.json` CSP:
```
default-src 'self'; script-src 'self'; connect-src ipc: asset: https://ipc.localhost; img-src 'self' asset: https://asset.localhost; style-src 'self' 'unsafe-inline'; media-src asset:; object-src 'none'; base-uri 'self'; form-action 'none'
```

### 7.4 macOS Entitlements (Minimal)

```xml
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
</dict>
```
No `cs.disable-library-validation`. No App Sandbox for initial release (direct .dmg only).

### 7.5 Windows EV Certificate
Obtain before first release. OV cert SmartScreen warnings on new publisher are a meaningful user experience failure and security harm (conditions users to bypass warnings).

---

## Decision 8 — Design System Gaps to Resolve Before Implementation

Five gaps identified in the mockup audit that MUST be resolved in code:

| Gap | Severity | Resolution |
|---|---|---|
| No "playing" state for sound pads | **P0** | Add: 2px solid primary border + inset white shadow at 0.25 opacity + stop icon always visible |
| Inactive nav items `#484847` fails WCAG AA (1.95:1) | **Must fix** | Change to `#adaaaa` (on-surface-variant) → 5.1:1 |
| Pad sublabel `on-primary-fixed/60` fails WCAG AA (2.1:1) | **Must fix** | Use 80%+ opacity → ~3.5:1 |
| No focus-visible styles (keyboard nav) | **Must fix** | `outline: 2px solid #ff8f6f; outline-offset: 2px` on `:focus-visible` globally |
| Library cards are `<div>` not `<button>` | **Must fix** | Add `role="button"` + `tabindex="0"` or convert to `<button>` |

Desktop adaptations required (mockups are mobile-first):
- Replace bottom nav with **left sidebar rail** (72px collapsed / 220px expanded) — consistent across all screens
- macOS window: add `padding-top: 28px` to header to clear traffic-light buttons (or use `fullSizeContentView`)
- Sound pad grid: always 3 columns on desktop (remove 2-col mobile fallback)
- Standardize all screens on `max-w-7xl` (1280px) — Studio uses max-w-6xl, causing layout shift
- Play icon visible at 10–15% opacity at rest on desktop (hover is primary affordance, not touch)
- Add `prefers-reduced-motion` support for `animate-pulse` and 700ms image transitions

---

## Key Technical Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| kira/cpal WASAPI buffer resizing API instability | Low | Pin kira to tested version; integration test on Windows in CI |
| WebKit vs WebView2 CSS divergence for neumorphic shadows | Medium | Visual regression test on both platforms before each release |
| macOS `allow-jit` entitlement causing App Notarization friction | Low | Tauri handles this automatically; well-documented requirement |
| EV certificate CI signing (cloud HSM) setup complexity | Medium | Budget 2–3 days for initial Windows signing pipeline setup |
| Security-scoped bookmarks if App Store is added later | Low | Document as known gap; implement only when MAS is targeted |
