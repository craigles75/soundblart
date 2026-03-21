# Feature Specification: Soundblart — Native Desktop App & Website

**Feature Branch**: `001-native-desktop-rewrite`
**Created**: 2026-03-21
**Status**: Draft
**Input**: User description: "let's create a new native desktop implementation. This should work for both MacOS and Windows. Don't feel you need to copy existing patterns if there are better options out there. Research options to build a native desktop app and website. Use the designs in the ~/Code/soundblart/designs folder"

---

## Overview

Soundblart is a redesigned, premium soundboard application for content creators, streamers, podcasters, and meeting hosts. It replaces the existing SoundBlart app with a high-end "tactile studio" experience: a dark neon-neumorphic interface where sound pads feel like physical buttons on a real mixing console. The product ships as a native desktop application (macOS and Windows) and a companion website.

The design system ("The Neon Neumorphic Studio") is specified in `designs/stitch/sonic_pad_pro/DESIGN.md` and the three screen mockups in `designs/stitch/`. The app name is **Soundblart**.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Trigger Sounds Live During a Session (Priority: P1)

A podcaster or meeting host has a live session open. They want to inject sound effects instantly — applause, laughter, a whistle — with a single tap or click, without any lag or friction. The sound pad grid is the primary surface of the app.

**Why this priority**: This is the core use case. Every other feature exists to support this moment. Without reliable, instant sound triggering, the app has no value.

**Independent Test**: Launch the app with a sound library loaded. Click any sound pad. The correct `.wav` file plays immediately with no perceptible delay. Clicking the same pad again while it is playing stops it (toggle). Clicking a different pad while one is playing stops the first and starts the second.

**Acceptance Scenarios**:

1. **Given** the app is open on the Studio screen with a panel loaded, **When** the user clicks a sound pad, **Then** the corresponding sound begins playing within 50ms and the pad visually indicates its active state.
2. **Given** a sound is playing, **When** the user clicks the same pad again, **Then** playback stops immediately (toggle behavior).
3. **Given** a sound is playing, **When** the user clicks a different pad, **Then** the first sound stops and the new sound begins immediately.
4. **Given** the app is open, **When** the user adjusts the master volume slider, **Then** the output level changes in real time without interrupting playback.
5. **Given** the Studio screen is active, **When** the user changes the active sound panel (e.g., from "Audience" to "Nature"), **Then** the pad grid updates to show that panel's sounds.
6. **Given** the app is open, **When** the user looks at the Studio header, **Then** they see a "Live Output" indicator showing current audio output status.

---

### User Story 2 — Browse & Preview the Sound Library (Priority: P2)

A user wants to explore what sound groups (panels) are available in their library, understand how many samples each group contains, and preview a sound before committing to using it in a session.

**Why this priority**: Users need confidence in their library contents before going live. Browsing enables discovery and session preparation.

**Independent Test**: Navigate to the Library screen. All configured sound directories are indexed and their top-level folders appear as category cards with names and sample counts. Clicking a category shows its individual sounds. A preview play button lets the user audition a sound without switching the active studio panel.

**Acceptance Scenarios**:

1. **Given** one or more sound directories are configured, **When** the user navigates to the Library screen, **Then** each top-level folder appears as a category card showing the folder name and total number of `.wav` files it contains.
2. **Given** the Library screen is visible, **When** the user clicks a category card, **Then** they see the individual sounds within that category.
3. **Given** a sound is visible in the Library, **When** the user clicks its preview/play button, **Then** the sound plays for audition; clicking again stops it.
4. **Given** the Library screen is open, **When** no sound directories are configured, **Then** the user sees a clear prompt to add a directory rather than an empty or broken state.

---

### User Story 3 — Configure Sound Directories (Priority: P3)

The app has two sound sources: **System Sounds** (bundled presets, always present, cannot be removed) and **User Sounds** (a single folder the user selects on their machine). Inside the User Sounds folder, the user creates subfolders using Finder or Explorer — each subfolder becomes a sound group (panel), and `.wav` files placed inside are the sounds. The Settings screen is where the user views both directories and changes the User Sounds path.

**Why this priority**: Without a configured User Sounds directory, the user is limited to bundled presets. Directory configuration unlocks the full personal library experience.

**Independent Test**: Open the Settings screen. Both System Sounds and User Sounds entries are visible. Click "Change User Sounds Directory" and pick a folder that contains subfolders with `.wav` files. Return to Studio or Library — those subfolders appear as panels with their sounds loaded. Add a new subfolder externally (Finder/Explorer), return to Settings and click Refresh — the new panel appears.

**Acceptance Scenarios**:

1. **Given** the Settings screen is open, **When** the user views it, **Then** they see two directory entries: System Sounds (read-only, shows bundled presets path) and User Sounds (shows currently configured path or a prompt if none is set).
2. **Given** the Settings screen is open, **When** the user clicks "Change User Sounds Directory," **Then** a native OS folder picker opens; selecting a folder replaces the current User Sounds path.
3. **Given** a User Sounds directory is configured with subfolders containing `.wav` files, **When** the user opens Studio or Library, **Then** each subfolder appears as a panel and its `.wav` files are available as sounds.
4. **Given** the user has added a subfolder or new `.wav` files to the User Sounds directory using Finder or Explorer, **When** they click "Refresh Library" in Settings, **Then** the new panel or sounds appear in the library.
5. **Given** the Settings screen is open, **When** the user views the stats section, **Then** they see total asset count, total disk usage (across both System and User Sounds), index state (clean/stale), and last-indexed latency.
6. **Given** no User Sounds directory has been configured yet, **When** the user opens the Settings screen, **Then** they see a clear prompt to select a User Sounds folder, not an error state.

---

### User Story 4 — Marketing Website with Phased Web App (Priority: P4)

Phase 1 is a polished marketing and download site: Soundblart branding, feature highlights, screenshots, and download links for macOS and Windows. Phase 2 (future, not in scope for initial delivery) is a web-based soundboard running in the browser. The marketing site ships alongside the desktop app; the web app is a documented future milestone.

**Why this priority**: The website extends Soundblart's reach to users who discover it online and gives them a home to download the desktop app. The web app phase is deferred to keep the initial scope focused.

**Independent Test**: A user who has never heard of Soundblart visits the website, understands what the product does within 10 seconds of landing, and can download the correct installer for their OS (macOS or Windows) within 3 clicks.

**Acceptance Scenarios**:

1. **Given** a user visits the Soundblart website, **When** the page loads, **Then** they immediately see the app name, a one-sentence description of what it does, and a primary call-to-action to download.
2. **Given** a user is on the website, **When** they click the download action, **Then** they are presented with platform-specific download options for macOS and Windows.
3. **Given** a user visits the website on any screen size, **When** the page renders, **Then** the design is fully usable and consistent with the Soundblart visual identity (Neon Neumorphic design system).
4. **Given** the web app phase is not yet built, **When** a user looks for a browser-based version, **Then** the site clearly communicates that a web app is coming soon, without implying it is currently available.

---

### Edge Cases

- What happens when a configured directory is moved, renamed, or deleted from the filesystem? That directory MUST show a clear error state in the Folders screen without crashing the app.
- What happens when a `.wav` file is corrupted or unreadable? That file MUST be skipped silently and not prevent the rest of the panel from loading.
- What happens when a panel contains zero `.wav` files (only subdirectories or non-wav files)? That panel MUST NOT appear in the Studio or Library.
- What happens when two configured directories contain panels with the same name? Panels with identical names MUST be merged so the user sees one combined panel.
- What happens when audio output device is unavailable or disconnected mid-session? The app MUST surface a clear error and recover when a device becomes available again.
- What happens when the user attempts to add the same directory twice? The app MUST prevent duplicate entries and inform the user.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST run natively on macOS (current major version and one prior) and Windows 10/11.
- **FR-002**: The Studio screen MUST display a grid of sound pads for the active panel; each pad shows the sound name, a category color, and an index number.
- **FR-003**: Clicking a sound pad MUST trigger playback of that sound within 50ms.
- **FR-004**: Clicking an actively playing pad MUST stop playback (toggle behavior).
- **FR-005**: Clicking a new pad while another is playing MUST stop the playing sound and start the new one immediately. Only one sound plays at any time (strict single-voice model — no layering or overlap).
- **FR-006**: A master volume control MUST allow real-time gain adjustment from 0–100% without interrupting playback.
- **FR-007**: The user MUST be able to switch between sound panels (top-level folder groups) while on the Studio screen.
- **FR-008**: The Library screen MUST display all indexed sound categories as cards with name and sample count.
- **FR-009**: The Settings screen MUST display two directory entries: System Sounds (read-only, bundled presets path) and User Sounds (user-configurable path). The System Sounds entry MUST NOT be changeable or removable.
- **FR-010**: The Settings screen MUST allow the user to change the User Sounds directory via a native OS folder picker dialog.
- **FR-011**: When no User Sounds directory has been configured, the Settings screen MUST display a prompt to select one rather than an error state.
- **FR-011b**: The Folders screen MUST display both indexed directories (System Sounds and User Sounds) with their index state (clean/stale/error), asset count, disk usage, and last-indexed latency.
- **FR-011c**: The Folders screen MUST provide a "Refresh Library" action that rescans both directories and updates all stats.
- **FR-013**: The app MUST persist the User Sounds directory path across sessions (survive app quit and relaunch).
- **FR-014**: Only `.wav` files MUST be loaded as sounds; other file types MUST be ignored silently.
- **FR-015**: Each non-hidden top-level subfolder within a sound directory MUST become a panel. Files at the root level of a directory (not in a subfolder) MUST be ignored.
- **FR-016**: If System Sounds and User Sounds contain subfolders with the same name, their sounds MUST be merged into a single panel.
- **FR-017**: The app MUST ship with bundled System Sounds available on first launch, requiring no configuration from the user.
- **FR-018**: The visual design MUST follow the Neon Neumorphic design system: dark aesthetic, Space Grotesk headlines, Plus Jakarta Sans body, no 1px separator lines, tactile press animations (scale to 0.96x on press), and the defined color palette (primary #ff8f6f, secondary #91f78e, tertiary #44a5ff, base surface #0e0e0e).
- **FR-019**: Navigation MUST include four sections accessible from a persistent nav element: Studio, Library, Folders, and Settings. Folders = directory inspection + Refresh. Settings = User Sounds directory configuration.
- **FR-020**: The Folders screen MUST display aggregate stats across both directories: total indexed asset count, total disk usage, overall index state (clean/stale), and last-indexed latency.

### Key Entities

- **Sound**: A single `.wav` file. Has a display name (derived from filename without extension), a file path, an index number within its panel, and belongs to one Panel.
- **Panel**: A named group of Sounds corresponding to a filesystem subfolder. Has a name, a color category (Audience/Nature/Traffic/Sports/Arcade or user-defined), and an ordered list of Sounds. Panels from System Sounds and User Sounds with the same name are merged.
- **System Sounds Directory**: The bundled presets directory, fixed at install time. Read-only; cannot be changed or removed by the user. Always present.
- **User Sounds Directory**: A single user-selected root folder. Each non-hidden subfolder becomes a Panel; `.wav` files within those subfolders are Sounds. Subfolders and files are managed externally (Finder/Explorer); the app scans on launch and on Refresh.
- **Session**: The active runtime state — which Panel is selected, which Sound (if any) is currently playing, and the current master volume level. Only one Sound plays at a time.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sound pads respond to user input and begin audio playback within 50 milliseconds of a click or tap.
- **SC-002**: The app launches and reaches the Studio screen ready for use within 3 seconds on a standard desktop machine.
- **SC-003**: Library indexing for a directory containing up to 500 `.wav` files completes within 2 seconds.
- **SC-004**: The app runs continuously for a 2-hour session without crashes, audio glitches, or memory growth that impacts performance.
- **SC-005**: All core workflows (trigger sound, switch panel, add directory, refresh library) are completable in 3 or fewer user actions each.
- **SC-006**: Every user story (P1–P3) is fully functional on both macOS and Windows with no feature disparity.
- **SC-007**: A first-time user can trigger their first sound within 60 seconds of launching the app using only the bundled preset sounds, with no configuration required.

### Assumptions

- Users have audio output configured on their machine; the app relies on the OS default audio device and does not need to provide device selection in this phase.
- Sound files are organized in flat one-level-deep subfolder structures (panel → sounds). Deeply nested subdirectories do not create sub-panels.
- The app is single-user with local storage only; no cloud sync, user accounts, or shared libraries are required in this phase.
- Website scope (US4) is resolved: Phase 1 is a marketing/download site; Phase 2 web app is a future milestone.
- Users manage their User Sounds folder structure (subfolders, `.wav` files) using the OS file manager (Finder on macOS, Explorer on Windows). The app does not create, rename, or delete folders or files.
- Global keyboard shortcuts (triggering sounds while another app is in focus) are out of scope for this phase. Sounds are triggered by clicking pads when the Soundblart window is focused.

---

## Clarifications

### Session 2026-03-21

- Q: What is the canonical app name? → A: **Soundblart** (not "Sonic Atelier"). "Sonic Atelier" was the design prototype name used in the Stitch mockups. The shipping product is named Soundblart. The design system referenced in FR-018 is the "Neon Neumorphic" visual language applied to Soundblart, not a separately branded system.
- Q: What does the Settings screen contain? → A: The Settings screen contains **directory configuration**: a read-only **System Sounds** directory (bundled presets, cannot be changed) and a user-configurable **User Sounds** directory (user selects a folder; subfolders within it become sound groups/panels; sounds are `.wav` files added to those subfolders). Users create subfolders and add sound files externally (via Finder/Explorer), then refresh the library within the app to pick up changes.
- Q: Single-voice vs polyphonic audio model? → A: **Strict single-voice** — only one sound plays at a time. Clicking any pad stops the currently playing sound and starts the new one. No overlap, no modifier keys for layering.
- Q: Are the Folders and Settings screens the same screen or distinct? → A: **Distinct screens with separate roles.** Settings = configure the User Sounds directory path. Folders = view the indexed directory contents, index state, stats (total assets, disk usage, latency), and Refresh Library action.
- Q: Global keyboard shortcuts to trigger sounds while another app is in focus? → A: **No — out of scope for this phase.** The Soundblart window must be focused to trigger sounds. No global hotkeys, no OS-level Accessibility permission required.
