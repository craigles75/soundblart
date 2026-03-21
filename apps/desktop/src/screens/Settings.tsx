import { useState, useCallback, useRef, useEffect } from 'react';
import { useDirectories } from '../hooks/useDirectories';
import { pickDirectory, addDirectory, removeDirectory } from '../lib/ipc';

export function Settings() {
  const { directories, isLoading, refresh } = useDirectories();
  const [toast, setToast] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
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

  const systemDir = directories.find((d) => d.readOnly);
  const userDir = directories.find((d) => !d.readOnly);

  const handleChangeUserDir = useCallback(async () => {
    try {
      setIsChanging(true);
      const picked = await pickDirectory();
      if (!picked) return;

      // Remove old user dir first, saving path for recovery
      const oldPath = userDir?.path;
      if (oldPath) {
        try {
          await removeDirectory(oldPath);
        } catch (err) {
          showToast(`Failed to remove old directory: ${String(err)}`);
          return;
        }
      }

      // Add the new directory; recover old dir on failure
      try {
        await addDirectory(picked);
      } catch (err) {
        if (oldPath) {
          try {
            await addDirectory(oldPath);
          } catch {
            // Recovery also failed — user will need to re-add manually
          }
        }
        showToast(`Failed to add directory: ${String(err)}`);
        return;
      }

      await refresh();
    } catch (err) {
      showToast(String(err));
    } finally {
      setIsChanging(false);
    }
  }, [userDir, refresh, showToast]);

  if (isLoading) {
    return (
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
      <div className="mb-6">
        <h1 className="font-display text-headline-md text-on-surface">Settings</h1>
        <p className="font-body text-body-md text-on-surface-variant mt-1">
          Configure your sound directories.
        </p>
      </div>

      {/* ─── Directory entries ─────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* System Sounds */}
        <DirectoryEntry
          label="System Sounds"
          description="Bundled preset sounds. Cannot be changed."
          path={systemDir?.path ?? null}
          isReadOnly
        />

        {/* User Sounds */}
        {userDir ? (
          <DirectoryEntry
            label="User Sounds"
            description="Your custom sound directory. Subfolders become panels."
            path={userDir.path}
          />
        ) : (
          <div className="flex flex-col gap-3 p-5 rounded-card bg-surface-high shadow-glass">
            <div>
              <h3 className="font-display text-title-md text-on-surface">User Sounds</h3>
              <p className="font-body text-body-md text-on-surface-variant mt-1">
                No directory selected yet. Choose a folder containing subfolders of .wav files.
              </p>
            </div>
          </div>
        )}

        {/* Change / Set directory button */}
        <button
          type="button"
          onClick={handleChangeUserDir}
          disabled={isChanging}
          aria-label={userDir ? 'Change user sounds directory' : 'Select user sounds directory'}
          className={[
            'flex items-center justify-center gap-2 px-4 py-2.5 rounded-chip',
            'font-body text-label-lg transition-all duration-120',
            isChanging
              ? 'bg-surface-container text-on-surface-variant cursor-wait'
              : 'bg-primary/15 text-primary hover:bg-primary/25 active:scale-[0.97]',
          ].join(' ')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            <path d="M12 11v6M9 14h6" />
          </svg>
          {isChanging ? 'Selecting…' : userDir ? 'Change User Sounds Directory' : 'Select User Sounds Directory'}
        </button>
      </div>
    </div>
  );
}

// ─── Directory Entry ──────────────────────────────────────────────────────────

interface DirectoryEntryProps {
  label: string;
  description: string;
  path: string | null;
  isReadOnly?: boolean;
}

function DirectoryEntry({ label, description, path, isReadOnly = false }: DirectoryEntryProps) {
  return (
    <div className="flex flex-col gap-1 p-5 rounded-card bg-surface-high shadow-glass">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-title-md text-on-surface">{label}</h3>
        {isReadOnly && (
          <span className="px-2 py-0.5 rounded-chip bg-surface-container font-body text-label-sm text-on-surface-variant">
            Read-only
          </span>
        )}
      </div>
      <p className="font-body text-body-md text-on-surface-variant">{description}</p>
      {path && (
        <p className="font-body text-label-sm text-on-surface-variant mt-1 truncate" title={path}>
          {path}
        </p>
      )}
    </div>
  );
}
