// Phase 3 (T023): Full implementation
// Stub with correct type signature so TypeScript resolves during Phase 1.
import { useState, useEffect, useCallback } from 'react';
import { getSession, type Session } from '../lib/ipc';
import { onSessionChanged } from '../lib/events';

const DEFAULT_SESSION: Session = {
  activePanelName: null,
  playingSoundPath: null,
  masterVolume: 1.0,
  isLive: false,
};

export interface UseSessionReturn {
  session: Session;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await getSession();
      setSession(s);
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
    onSessionChanged((payload) => setSession(payload)).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [refresh]);

  return { session, isLoading, error, refresh };
}
