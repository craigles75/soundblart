// Phase 5 (T034): Full implementation
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
    try {
      const dirs = await getDirectories();
      setDirectories(dirs);
      setError(null);
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
      // Re-fetch directories after library refresh
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

    const unlisteners: Array<() => void> = [];

    onLibraryUpdated(() => loadDirectories()).then((fn) => {
      unlisteners.push(fn);
    });

    onDirectoryError(({ path, reason }) => {
      setDirectoryErrors((prev) => new Map(prev).set(path, reason));
    }).then((fn) => {
      unlisteners.push(fn);
    });

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [loadDirectories]);

  return { directories, isLoading, isRefreshing, error, directoryErrors, refresh };
}
