import { useState, useCallback, useRef, useEffect } from 'react';
import { useDirectories } from '../hooks/useDirectories';
import { getLibraryStats, type LibraryStats } from '../lib/ipc';

export function Folders() {
  const { directories, isLoading, isRefreshing, error, directoryErrors, refresh } = useDirectories();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const s = await getLibraryStats();
      setStats(s);
    } catch (err) {
      setStats(null);
      showToast(String(err));
    }
  }, [showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      await loadStats();
    } catch (err) {
      showToast(String(err));
    }
  }, [refresh, loadStats, showToast]);

  if (isLoading) {
    return error ? (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="font-body text-body-md text-error-dim text-center">{error}</p>
      </div>
    ) : (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-4 overflow-hidden">
      {/* ─── Toast ────────────────────────────────────────────── */}
      {toast && (
        <div
          role="alert"
          className="mb-3 px-4 py-2.5 rounded-card bg-error/15 text-error-dim font-body text-body-md flex items-center justify-between"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              setToast(null);
            }}
            className="ml-3 text-error-dim/60 hover:text-error-dim transition-colors"
            aria-label="Dismiss error"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
      )}

      {/* ─── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-headline-md text-on-surface">Folders</h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-chip',
            'font-body text-label-lg transition-all duration-120',
            isRefreshing
              ? 'bg-surface-container text-on-surface-variant cursor-wait'
              : 'bg-surface-high text-on-surface hover:bg-surface-highest active:scale-[0.97]',
          ].join(' ')}
          aria-label="Refresh library"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={isRefreshing ? 'animate-spin-slow' : ''}
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 11-2.636-6.364" />
            <path d="M21 3v6h-6" />
          </svg>
          {isRefreshing ? 'Refreshing…' : 'Refresh Library'}
        </button>
      </div>

      {/* ─── Error state ──────────────────────────────────────── */}
      {error && (
        <div className="mb-3 px-4 py-2.5 rounded-card bg-error/15 text-error-dim font-body text-body-md">
          {error}
        </div>
      )}

      {/* ─── Directory list ───────────────────────────────────── */}
      <ul className="flex flex-col gap-2 overflow-y-auto flex-1 p-1" aria-label="Sound directories">
        {directories.length === 0 ? (
          <li className="flex-1 flex items-center justify-center">
            <p className="font-body text-body-md text-on-surface-variant text-center">
              No directories configured.
            </p>
          </li>
        ) : (
          directories.map((dir) => {
            const dirError = directoryErrors.get(dir.path);
            const hasError = !!dirError;

            return (
              <li
                key={dir.path}
                className="flex items-center gap-4 px-4 py-3 rounded-card bg-surface-high shadow-glass"
              >
                {/* Icon */}
                <span className="flex-shrink-0 text-on-surface-variant">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                </span>

                {/* Path and label */}
                <div className="flex-1 min-w-0">
                  <p className="font-body text-body-md text-on-surface truncate">
                    {dirLabel(dir.path)}
                  </p>
                  <p className="font-body text-label-sm text-on-surface-variant truncate">
                    {dir.path}
                  </p>
                  {hasError && (
                    <p className="font-body text-label-sm text-error-dim mt-0.5">
                      {dirError}
                    </p>
                  )}
                </div>

                {/* Badges */}
                {dir.readOnly && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-chip bg-surface-container font-body text-label-sm text-on-surface-variant">
                    System
                  </span>
                )}

                {/* Status indicator */}
                <span
                  className={[
                    'w-2 h-2 rounded-full flex-shrink-0',
                    hasError ? 'bg-error' : 'bg-secondary',
                  ].join(' ')}
                  title={hasError ? dirError : 'Indexed'}
                  aria-label={hasError ? `Error: ${dirError}` : 'Directory indexed'}
                />
              </li>
            );
          })
        )}
      </ul>

      {/* ─── Aggregate stats ──────────────────────────────────── */}
      {stats && (
        <div className="glass rounded-card px-6 py-3 mt-3 flex items-center justify-between">
          <StatItem label="Directories" value={stats.directoryCount} />
          <StatItem label="Panels" value={stats.panelCount} />
          <StatItem label="Sounds" value={stats.soundCount} />
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-display text-title-md text-on-surface tabular-nums">{value}</span>
      <span className="font-body text-label-sm text-on-surface-variant">{label}</span>
    </div>
  );
}

function dirLabel(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
