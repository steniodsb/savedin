import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'savedin_collapsed_sections';

interface CollapsedSections {
  [key: string]: boolean;
}

export function useCollapsibleSections() {
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(() => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const isCollapsed = useCallback((sectionId: string) => {
    return collapsedSections[sectionId] ?? false; // Default expanded
  }, [collapsedSections]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const setCollapsed = useCallback((sectionId: string, collapsed: boolean) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: collapsed,
    }));
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedSections({});
  }, []);

  const collapseAll = useCallback((sectionIds: string[]) => {
    const newState: CollapsedSections = {};
    sectionIds.forEach(id => {
      newState[id] = true;
    });
    setCollapsedSections(newState);
  }, []);

  return {
    isCollapsed,
    toggleSection,
    setCollapsed,
    expandAll,
    collapseAll,
  };
}
