import { useState, useEffect } from 'react';

/**
 * Custom hook that synchronizes component state with browser localStorage.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch (e) {
      console.warn(`Failed reading localStorage key "${key}":`, e);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed writing localStorage key "${key}":`, e);
    }
  }, [key, state]);

  return [state, setState];
}

