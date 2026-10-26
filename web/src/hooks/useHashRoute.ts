import { useEffect } from 'react';

export type MainPanelTab = 'spec' | 'dag' | 'xray' | 'hub';

interface HashRouteState {
  activeTab: MainPanelTab;
  setActiveTab: (tab: MainPanelTab) => void;
  dagViewMode?: 'dag' | 'kanban' | 'list';
  setDagViewMode?: (mode: 'dag' | 'kanban' | 'list') => void;
}

export function useHashRoute({
  activeTab,
  setActiveTab,
  dagViewMode,
  setDagViewMode,
}: HashRouteState) {
  // Sync hash -> state on mount and hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (!raw) return;

      const [panel, subview] = raw.split('/');

      if (panel === 'spec' || panel === 'docs') {
        setActiveTab('spec');
      } else if (panel === 'dag') {
        setActiveTab('dag');
        if (
          subview &&
          (subview === 'dag' || subview === 'kanban' || subview === 'list') &&
          setDagViewMode
        ) {
          setDagViewMode(subview);
        }
      } else if (panel === 'xray') {
        setActiveTab('xray');
      } else if (panel === 'hub') {
        setActiveTab('hub');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab, setDagViewMode]);

  // Sync state -> hash when activeTab or dagViewMode changes
  useEffect(() => {
    let targetHash = `#${activeTab}`;
    if (activeTab === 'dag' && dagViewMode && dagViewMode !== 'dag') {
      targetHash = `#dag/${dagViewMode}`;
    }
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, [activeTab, dagViewMode]);
}

