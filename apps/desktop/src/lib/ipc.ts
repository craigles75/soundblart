// Typed IPC wrappers for all Tauri commands.
//
// Types mirror src-tauri/src/types.rs exactly — this is the TypeScript side of
// the IPC contract. Field names are camelCase because all Rust structs use
// #[serde(rename_all = "camelCase")]. Keep in sync with types.rs manually, or
// adopt ts-rs to generate these at build time.
import { invoke } from '@tauri-apps/api/core';

// ─── Types (must match src-tauri/src/types.rs) ───────────────────────────────

/** Pad color category — controls gradient and playing-state border. */
export type ColorCategory =
  | 'Audience'
  | 'Nature'
  | 'Traffic'
  | 'Arcade'
  | 'Sports'
  | 'Custom';

/** A single playable .wav file. */
export interface Sound {
  name: string;
  path: string;
  /** 1-based position within the parent panel (display as zero-padded "01", "02"). */
  index: number;
  /** Name of the parent panel (denormalized for fast lookup). */
  panelName: string;
  /** File size in bytes — used for disk usage stats. */
  fileSizeBytes: number;
}

/** A named group of sounds mapped from one subdirectory. */
export interface Panel {
  name: string;
  /** Derived from panel name by Scanner; controls SoundPad gradient. */
  colorCategory: ColorCategory;
  sounds: Sound[];
  /** Number of sounds in this panel. */
  soundCount: number;
  /** The directory paths that contributed sounds to this panel. */
  sourceDirectories: string[];
}

/** Live audio session state (emitted on soundblart://session-changed). */
export interface Session {
  activePanelName: string | null;
  playingSoundPath: string | null;
  masterVolume: number;
  isLive: boolean;
}

/** Aggregate library index statistics. */
export interface LibraryStats {
  panelCount: number;
  soundCount: number;
  directoryCount: number;
}

/** A single root directory tracked by the library. */
export interface DirectoryInfo {
  path: string;
  /** True if this is a read-only preset directory (cannot be removed). */
  readOnly: boolean;
}

/** Updated index state returned after directory mutations. */
export interface IndexState {
  directories: DirectoryInfo[];
  stats: LibraryStats;
}

// ─── Audio Commands ───────────────────────────────────────────────────────────

export const playSound = (path: string): Promise<void> =>
  invoke<void>('play_sound', { path });

export const stopSound = (): Promise<void> =>
  invoke<void>('stop_sound');

export const setVolume = (level: number): Promise<void> =>
  invoke<void>('set_volume', { level });

export const getSession = (): Promise<Session> =>
  invoke<Session>('get_session');

export const previewSound = (path: string): Promise<void> =>
  invoke<void>('preview_sound', { path });

export const stopPreview = (): Promise<void> =>
  invoke<void>('stop_preview');

// ─── Library Commands ─────────────────────────────────────────────────────────

export const getPanels = (): Promise<Panel[]> =>
  invoke<Panel[]>('get_panels');

export const setActivePanel = (panelName: string): Promise<void> =>
  invoke<void>('set_active_panel', { panelName });

export const getDirectories = (): Promise<DirectoryInfo[]> =>
  invoke<DirectoryInfo[]>('get_directories');

export const getLibraryStats = (): Promise<LibraryStats> =>
  invoke<LibraryStats>('get_library_stats');

// ─── Directory Commands ───────────────────────────────────────────────────────

export const pickDirectory = (): Promise<string | null> =>
  invoke<string | null>('pick_directory');

/** Returns updated IndexState (directories + stats) after rescan. */
export const addDirectory = (path: string): Promise<IndexState> =>
  invoke<IndexState>('add_directory', { path });

export const removeDirectory = (path: string): Promise<void> =>
  invoke<void>('remove_directory', { path });

/** Returns refreshed panel list after full rescan. */
export const refreshLibrary = (): Promise<Panel[]> =>
  invoke<Panel[]>('refresh_library');
