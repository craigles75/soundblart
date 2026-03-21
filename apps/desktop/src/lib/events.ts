// Phase 2 (T014): Tauri event subscriptions
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { Session, LibraryStats, DirectoryInfo } from './ipc';

// ─── Event Payloads ───────────────────────────────────────────────────────────

export type SessionChangedPayload = Session;

export interface LibraryRefreshingPayload {
  directories: DirectoryInfo[];
}

export type LibraryUpdatedPayload = LibraryStats;

export interface SoundFinishedPayload {
  path: string;
}

export interface DirectoryErrorPayload {
  path: string;
  reason: string;
}

// ─── Listeners ────────────────────────────────────────────────────────────────

export const onSessionChanged = (
  handler: (payload: SessionChangedPayload) => void,
): Promise<UnlistenFn> =>
  listen<SessionChangedPayload>('soundblart://session-changed', (e) => handler(e.payload));

export const onLibraryRefreshing = (
  handler: (payload: LibraryRefreshingPayload) => void,
): Promise<UnlistenFn> =>
  listen<LibraryRefreshingPayload>('soundblart://library-refreshing', (e) => handler(e.payload));

export const onLibraryUpdated = (
  handler: (payload: LibraryUpdatedPayload) => void,
): Promise<UnlistenFn> =>
  listen<LibraryUpdatedPayload>('soundblart://library-updated', (e) => handler(e.payload));

export const onSoundFinished = (
  handler: (payload: SoundFinishedPayload) => void,
): Promise<UnlistenFn> =>
  listen<SoundFinishedPayload>('soundblart://sound-finished', (e) => handler(e.payload));

export const onDirectoryError = (
  handler: (payload: DirectoryErrorPayload) => void,
): Promise<UnlistenFn> =>
  listen<DirectoryErrorPayload>('soundblart://directory-error', (e) => handler(e.payload));
