import { useState, useCallback } from 'react';

export interface UseBulkSelectionReturn {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  toggleSelectAll: (ids: string[]) => void;
  selectedCount: number;
}

export function useBulkSelection(): UseBulkSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of ids) {
          next.delete(id);
        }
        return next;
      } else {
        const next = new Set(prev);
        for (const id of ids) {
          next.add(id);
        }
        return next;
      }
    });
  }, []);

  return {
    selectedIds,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    toggleSelectAll,
    selectedCount: selectedIds.size,
  };
}
