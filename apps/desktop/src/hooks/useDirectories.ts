import { useState, useEffect, useCallback } from 'react';
import { getDirectories, refreshLibrary, type DirectoryInfo } from '../lib/ipc';
import { onLibraryUpdated, onDirectoryError } from '../lib/events';

export interface UseDirectoriesReturn {
  directories: DirectoryInfo[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  directoryErrors: Map<string, string>;
  refresh: () => Promise<void>;
}

export function useDirectories(): UseDirectoriesReturn {
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directoryErrors, setDirectoryErrors] = useState<Map<string, string>>(new Map());

  const loadDirectories = useCallback(async () => {
    setIsLoading(true);
    try {
      const dirs = await getDirectories();
      setDirectories(dirs);
      setError(null);
      setDirectoryErrors(new Map());
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      await refreshLibrary();
      const dirs = await getDirectories();
      setDirectories(dirs);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDirectories();

    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    (async () => {
      try {
        const libUnlisten = await onLibraryUpdated(() => {
          if (!cancelled) loadDirectories();
        });
        if (!cancelled) unlisteners.push(libUnlisten);
        else libUnlisten();
      } catch (err) {
        console.error('Failed to listen for library updates:', err);
      }

      try {
        const errUnlisten = await onDirectoryError(({ path, reason }) => {
          if (!cancelled) {
            setDirectoryErrors((prev) => new Map(prev).set(path, reason));
          }
        });
        if (!cancelled) unlisteners.push(errUnlisten);
        else errUnlisten();
      } catch (err) {
        console.error('Failed to listen for directory errors:', err);
      }
    })();

    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }, [loadDirectories]);

  return { directories, isLoading, isRefreshing, error, directoryErrors, refresh };
}
