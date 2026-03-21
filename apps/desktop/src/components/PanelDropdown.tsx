import { useState, useRef, useEffect, useCallback } from 'react';
import type { Panel } from '../lib/ipc';
import { setActivePanel } from '../lib/ipc';

interface PanelDropdownProps {
  panels: Panel[];
  activePanelName: string | null;
  onError?: (message: string) => void;
}

export function PanelDropdown({ panels, activePanelName, onError }: PanelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const focusedIndexRef = useRef(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  const activePanel = panels.find((p) => p.name === activePanelName);

  const handleSelect = useCallback(async (panelName: string) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    if (panelName !== activePanelName) {
      try {
        await setActivePanel(panelName);
      } catch (err) {
        onError?.(String(err));
      }
    }
  }, [activePanelName, onError]);

  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    const activeIdx = panels.findIndex((p) => p.name === activePanelName);
    const idx = activeIdx >= 0 ? activeIdx : 0;
    setFocusedIndex(idx);
    focusedIndexRef.current = idx;
  }, [panels, activePanelName]);

  // Keep focusedIndexRef in sync with state
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  // Close on click outside, Escape, and arrow key navigation
  // Uses refs to avoid re-attaching listeners on every focusedIndex change
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentPanels = panelsRef.current;
      const idx = focusedIndexRef.current;

      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          {
            const next = Math.min(idx + 1, currentPanels.length - 1);
            setFocusedIndex(next);
            focusedIndexRef.current = next;
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          {
            const next = Math.max(idx - 1, 0);
            setFocusedIndex(next);
            focusedIndexRef.current = next;
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (idx >= 0 && idx < currentPanels.length) {
            handleSelectRef.current(currentPanels[idx].name);
          }
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          focusedIndexRef.current = 0;
          break;
        case 'End':
          e.preventDefault();
          {
            const last = currentPanels.length - 1;
            setFocusedIndex(last);
            focusedIndexRef.current = last;
          }
          break;
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Scroll focused option into view
  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const option = list.children[focusedIndex] as HTMLElement | undefined;
    option?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, focusedIndex]);

  if (panels.length === 0) {
    return (
      <div className="font-body text-body-md text-on-surface-variant/60">
        No panels available
      </div>
    );
  }

  const focusedPanelId = focusedIndex >= 0 && panels[focusedIndex]
    ? `panel-option-${panels[focusedIndex].name}`
    : undefined;

  const listboxId = 'panel-listbox';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        className={[
          'flex items-center gap-2 px-4 py-2 rounded-chip',
          'bg-surface-high text-on-surface',
          'font-body text-label-lg',
          'hover:bg-surface-highest transition-colors',
        ].join(' ')}
      >
        <span className="truncate">{activePanel?.name ?? 'Select Panel'}</span>
        <span className="text-on-surface-variant font-body text-label-sm">
          {activePanel ? `${activePanel.soundCount} sounds` : ''}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 ml-1 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Sound panels"
          aria-activedescendant={focusedPanelId}
          tabIndex={-1}
          className={[
            'absolute z-50 mt-1 left-0 min-w-[200px]',
            'bg-surface-high rounded-card py-1',
            'shadow-modal overflow-y-auto max-h-[320px]',
            'animate-dropdown-in outline-none',
          ].join(' ')}
        >
          {panels.map((panel, index) => {
            const isActive = panel.name === activePanelName;
            const isFocused = index === focusedIndex;
            return (
              <li
                key={panel.name}
                id={`panel-option-${panel.name}`}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(panel.name)}
                className={[
                  'w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer',
                  'font-body text-body-md transition-colors',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : isFocused
                      ? 'text-on-surface bg-surface-container'
                      : 'text-on-surface hover:bg-surface-container',
                ].join(' ')}
              >
                <span className="truncate">{panel.name}</span>
                <span className="text-on-surface-variant text-label-sm flex-shrink-0">
                  {panel.soundCount} {panel.soundCount === 1 ? 'sound' : 'sounds'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
