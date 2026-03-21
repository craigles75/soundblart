import { useState, useCallback, useRef } from 'react';
import { useSession } from '../hooks/useSession';
import { usePanels } from '../hooks/usePanels';
import { SoundGrid } from '../components/SoundGrid';
import { PanelDropdown } from '../components/PanelDropdown';
import { VolumeSlider } from '../components/VolumeSlider';

export function Studio() {
  const { session, isLoading: sessionLoading, error: sessionError } = useSession();
  const { panels, isLoading: panelsLoading, error: panelsError } = usePanels();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoading = sessionLoading || panelsLoading;
  const error = sessionError ?? panelsError;
  const activePanel = panels.find((p) => p.name === session.activePanelName) ?? panels[0] ?? null;

  const handleError = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-4">
      {/* ─── Toast error ────────────────────────────────────── */}
      {toast && (
        <div
          role="alert"
          className="mb-3 px-4 py-2.5 rounded-card bg-error/15 text-error font-body text-body-md flex items-center justify-between"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              setToast(null);
            }}
            className="ml-3 text-error/60 hover:text-error transition-colors"
            aria-label="Dismiss error"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
      )}

      {/* ─── Header: Panel selector + Live indicator ─────────── */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <PanelDropdown
          panels={panels}
          activePanelName={activePanel?.name ?? null}
          onError={handleError}
        />

        <LiveIndicator isLive={session.isLive} />
      </div>

      {/* ─── Sound pad grid ──────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-body-md text-error text-center">{error}</p>
        </div>
      ) : panels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-body-md text-on-surface-variant/60 text-center">
            No panels found. Add a sound directory in Settings to get started.
          </p>
        </div>
      ) : (
        <SoundGrid
          panel={activePanel}
          playingSoundPath={session.playingSoundPath}
          onError={handleError}
        />
      )}

      {/* ─── Volume control (glass bar) ──────────────────────── */}
      <div className="glass rounded-card px-6 py-3 mt-3">
        <VolumeSlider volume={session.masterVolume} onError={handleError} />
      </div>
    </div>
  );
}

interface LiveIndicatorProps {
  isLive: boolean;
}

function LiveIndicator({ isLive }: LiveIndicatorProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={isLive ? 'Live output active' : 'No active output'}
    >
      <span
        className={[
          'w-2 h-2 rounded-full',
          isLive ? 'bg-secondary animate-live-pulse' : 'bg-on-surface-variant/30',
        ].join(' ')}
      />
      <span className="font-body text-label-sm text-on-surface-variant">
        {isLive ? 'Live Output' : 'Idle'}
      </span>
    </div>
  );
}
