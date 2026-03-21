import { useState, useCallback, useRef, useEffect } from 'react';
import { usePanels } from '../hooks/usePanels';
import { previewSound, stopPreview, type Panel, type Sound } from '../lib/ipc';
import type { Screen } from '../App';

interface LibraryProps {
  onNavigate?: (screen: Screen) => void;
}

const CATEGORY_GRADIENT: Record<string, string> = {
  Audience: 'from-primary/20 to-primary-dim/10',
  Nature:   'from-secondary/20 to-secondary-dim/10',
  Traffic:  'from-tertiary/20 to-tertiary-dim/10',
  Arcade:   'from-error/20 to-error-dim/10',
  Sports:   'from-surface-high to-surface-container',
  Custom:   'from-surface-high to-surface-container',
};

const CATEGORY_ACCENT: Record<string, string> = {
  Audience: 'text-primary',
  Nature:   'text-secondary',
  Traffic:  'text-tertiary',
  Arcade:   'text-error',
  Sports:   'text-on-surface-variant',
  Custom:   'text-on-surface-variant',
};

export function Library({ onNavigate }: LibraryProps) {
  const { panels, isLoading, error } = usePanels();
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [previewingPath, setPreviewingPath] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const safeStopPreview = useCallback(async () => {
    try {
      await stopPreview();
    } catch (err) {
      showToast(String(err));
    }
    setPreviewingPath(null);
  }, [showToast]);

  const handlePreviewToggle = useCallback(async (path: string) => {
    try {
      if (previewingPath === path) {
        await stopPreview();
        setPreviewingPath(null);
      } else {
        if (previewingPath) await stopPreview();
        await previewSound(path);
        setPreviewingPath(path);
      }
    } catch (err) {
      showToast(String(err));
    }
  }, [previewingPath, showToast]);

  const handleCardClick = useCallback(async (panelName: string) => {
    if (previewingPath) {
      await safeStopPreview();
    }
    setExpandedPanel((prev) => (prev === panelName ? null : panelName));
  }, [previewingPath, safeStopPreview]);

  const handleBack = useCallback(async () => {
    if (previewingPath) {
      await safeStopPreview();
    }
    setExpandedPanel(null);
  }, [previewingPath, safeStopPreview]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="font-body text-body-md text-error text-center">{error}</p>
      </div>
    );
  }

  if (panels.length === 0) {
    return <EmptyState onNavigate={onNavigate} />;
  }

  const expandedPanelData = panels.find((p) => p.name === expandedPanel);

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
        <h1 className="font-display text-headline-md text-on-surface">Library</h1>
        <span className="font-body text-label-sm text-on-surface-variant">
          {panels.length} {panels.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      {/* ─── Content: cards or expanded panel ─────────────────── */}
      {expandedPanelData ? (
        <SoundList
          panel={expandedPanelData}
          previewingPath={previewingPath}
          onPreviewToggle={handlePreviewToggle}
          onBack={handleBack}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 p-1">
          {panels.map((panel) => (
            <CategoryCard
              key={panel.name}
              panel={panel}
              onClick={() => handleCardClick(panel.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  panel: Panel;
  onClick: () => void;
}

function CategoryCard({ panel, onClick }: CategoryCardProps) {
  const gradient = CATEGORY_GRADIENT[panel.colorCategory] ?? CATEGORY_GRADIENT.Custom;
  const accent = CATEGORY_ACCENT[panel.colorCategory] ?? CATEGORY_ACCENT.Custom;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col justify-between p-5 rounded-card text-left',
        'bg-gradient-to-br', gradient,
        'shadow-pad-rest',
        'hover:scale-[1.01] active:scale-[0.98] transition-transform duration-120',
        'min-h-[120px]',
      ].join(' ')}
      aria-label={`${panel.name} — ${panel.soundCount} ${panel.soundCount === 1 ? 'sound' : 'sounds'}`}
    >
      <span className={`font-display text-title-lg ${accent}`}>
        {panel.name}
      </span>
      <span className="font-body text-label-sm text-on-surface-variant mt-2">
        {panel.soundCount} {panel.soundCount === 1 ? 'sound' : 'sounds'}
      </span>
    </button>
  );
}

// ─── Sound List (expanded panel) ──────────────────────────────────────────────

interface SoundListProps {
  panel: Panel;
  previewingPath: string | null;
  onPreviewToggle: (path: string) => void;
  onBack: () => void;
}

function SoundList({ panel, previewingPath, onPreviewToggle, onBack }: SoundListProps) {
  const accent = CATEGORY_ACCENT[panel.colorCategory] ?? CATEGORY_ACCENT.Custom;
  const backRef = useRef<HTMLButtonElement>(null);

  // Move focus to back button when sound list mounts
  useEffect(() => {
    backRef.current?.focus();
  }, []);

  // Escape key closes the expanded panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onBack]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-3">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          className="flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          aria-label="Back to categories"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className={`font-display text-title-lg ${accent}`}>{panel.name}</h2>
        <span className="font-body text-label-sm text-on-surface-variant">
          {panel.soundCount} {panel.soundCount === 1 ? 'sound' : 'sounds'}
        </span>
      </div>

      {/* Sound rows */}
      <ul className="flex flex-col gap-1.5 overflow-y-auto flex-1 p-1" aria-label={`Sounds in ${panel.name}`}>
        {panel.sounds.map((sound) => (
          <SoundRow
            key={sound.path}
            sound={sound}
            isPreviewing={previewingPath === sound.path}
            onPreviewToggle={() => onPreviewToggle(sound.path)}
          />
        ))}
      </ul>
    </div>
  );
}

// ─── Sound Row ────────────────────────────────────────────────────────────────

interface SoundRowProps {
  sound: Sound;
  isPreviewing: boolean;
  onPreviewToggle: () => void;
}

function SoundRow({ sound, isPreviewing, onPreviewToggle }: SoundRowProps) {
  const paddedIndex = String(sound.index).padStart(2, '0');

  return (
    <li
      className={[
        'flex items-center gap-3 px-4 py-2.5 rounded-card transition-all duration-120',
        'border-l-[3px]',
      isPreviewing
          ? 'bg-surface-container library-row-playing border-l-primary'
          : 'bg-surface-high hover:bg-surface-container border-l-transparent',
      ].join(' ')}
    >
      <span className="font-body text-label-sm text-on-surface-variant w-6 text-right tabular-nums" aria-hidden="true">
        {paddedIndex}
      </span>
      <span className="font-body text-body-md text-on-surface flex-1 truncate">
        {sound.name}
      </span>
      <button
        type="button"
        onClick={onPreviewToggle}
        className={[
          'flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full transition-colors',
          isPreviewing
            ? 'text-primary bg-primary/15'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-highest',
        ].join(' ')}
        aria-label={isPreviewing ? `Stop previewing ${sound.name}` : `Preview ${sound.name}`}
        aria-pressed={isPreviewing}
      >
        {isPreviewing ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="3" y="3" width="10" height="10" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4 2.5l10 5.5-10 5.5V2.5z" />
          </svg>
        )}
      </button>
    </li>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onNavigate?: (screen: Screen) => void;
}

function EmptyState({ onNavigate }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-on-surface-variant/30" aria-hidden="true">
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
      <p className="font-body text-body-md text-on-surface-variant/60 text-center max-w-[280px]">
        No sound directories configured yet. Add a directory to start building your library.
      </p>
      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="font-body text-label-lg text-primary hover:text-primary-dim transition-colors py-2 px-3"
        >
          Go to Settings
        </button>
      )}
    </div>
  );
}
