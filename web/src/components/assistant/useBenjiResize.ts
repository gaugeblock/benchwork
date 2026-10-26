import { useState, useEffect, useCallback, useRef } from 'react';

const MIN_WIDTH = 320;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 380;

const WIDTH_STORAGE_KEY = 'benji_sidebar_width';
const DOCK_STORAGE_KEY = 'benji_sidebar_dock';
const COLLAPSED_STORAGE_KEY = 'benji_sidebar_collapsed';

export type BenjiDock = 'left' | 'right';

export function useBenjiResize() {
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(WIDTH_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_WIDTH;
  });

  const [dock, setDock] = useState<BenjiDock>(() => {
    const saved = localStorage.getItem(DOCK_STORAGE_KEY);
    return saved === 'right' ? 'right' : 'left';
  });

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  });

  const isDragging = useRef(false);

  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, width.toString());
  }, [width]);

  useEffect(() => {
    localStorage.setItem(DOCK_STORAGE_KEY, dock);
  }, [dock]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed.toString());
  }, [collapsed]);

  const toggleDock = useCallback(() => {
    setDock((prev) => (prev === 'left' ? 'right' : 'left'));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = width;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;
        const delta =
          dock === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [width, dock]
  );

  return {
    width,
    dock,
    collapsed,
    setCollapsed,
    toggleDock,
    toggleCollapsed,
    startResizing,
  };
}

