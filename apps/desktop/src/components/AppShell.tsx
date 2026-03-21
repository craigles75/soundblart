// AppShell — collapsible nav rail + main content area.
// macOS traffic-light clearance (pt-7), WCAG-compliant colors, and
// No-Line Rule sectioning are all implemented here.
// Phase 2 (T016): will add tooltip/Popover components for icon-only items.
import React, { useState } from 'react';
import type { Screen } from '../App';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'studio',
    label: 'Studio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'library',
    label: 'Library',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M4 19V5a2 2 0 012-2h12a2 2 0 012 2v14" />
        <path d="M4 19h16" />
        <path d="M9 7h6M9 11h6" />
      </svg>
    ),
  },
  {
    id: 'folders',
    label: 'Folders',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

interface AppShellProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  children: React.ReactNode;
}

export function AppShell({ activeScreen, onNavigate, children }: AppShellProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    // macOS traffic-light clearance: pt-7 (28px)
    <div className="flex h-screen bg-surface overflow-hidden pt-7">
      {/* ─── Left navigation rail ─────────────────────────── */}
      {/* No 1px border — section via background shift (surface-low vs surface) per No-Line Rule */}
      <nav
        className={[
          'flex flex-col bg-surface-low',
          'transition-all duration-200',
          expanded ? 'w-[220px]' : 'w-[72px]',
        ].join(' ')}
        aria-label="Main navigation"
      >
        {/* Expand / collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center h-12 w-full text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={expanded}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            {expanded
              ? <path d="M15 19l-7-7 7-7" />
              : <path d="M9 5l7 7-7 7" />}
          </svg>
        </button>

        {/* Nav items */}
        <ul className="flex flex-col gap-1 px-2 mt-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  title={expanded ? undefined : item.label}
                  className={[
                    'flex items-center gap-3 w-full rounded-card px-3 py-2.5',
                    'transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  ].join(' ')}
                  aria-label={expanded ? undefined : item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {expanded && (
                    <span className="font-body text-label-lg truncate">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Soundblart wordmark at bottom when expanded */}
        {expanded && (
          <div className="px-4 py-4">
            <p className="font-display text-label-sm text-on-surface-variant/60 uppercase tracking-widest">
              Soundblart
            </p>
          </div>
        )}
      </nav>

      {/* ─── Main content area ────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
