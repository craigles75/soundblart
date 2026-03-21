// Phase 5 (T034): Full implementation
import { useState, useEffect, useCallback } from 'react';
import { getDirectories, refreshLibrary, type DirectoryInfo, type LibraryStats } from '../lib/ipc';
import { onLibraryUpdated, onDirectoryError } from '../lib/events';

export interface UseDirectoriesReturn {
  directories: DirectoryInfo[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  directoryErrors: Map<string, string>;
  refresh: () => Promise<LibraryStats | undefined>;
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

  const refresh = useCallback(async (): Promise<LibraryStats | undefined> => {
    try {
      setIsRefreshing(true);
      const stats = await refreshLibrary();
      setDirectories(stats.directories);
      return stats;
    } catch (err) {
      setError(String(err));
      return undefined;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDirectories();

    const unlisteners: Array<() => void> = [];

    onLibraryUpdated((stats) => setDirectories(stats.directories)).then((fn) => {
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
