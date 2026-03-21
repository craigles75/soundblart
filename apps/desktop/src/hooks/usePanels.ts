// Phase 3 (T024): Full implementation
import { useState, useEffect, useCallback } from 'react';
import { getPanels, type Panel } from '../lib/ipc';
import { onLibraryUpdated } from '../lib/events';

export interface UsePanelsReturn {
  panels: Panel[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePanels(): UsePanelsReturn {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const p = await getPanels();
      setPanels(p);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    let unlisten: (() => void) | undefined;
    onLibraryUpdated(() => refresh()).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [refresh]);

  return { panels, isLoading, error, refresh };
}
