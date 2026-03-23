import { useState, useEffect, useCallback } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'savedin_sidebar_collapsed';
const SIDEBAR_STATE_EVENT = 'savedin_sidebar_state_change';

// Custom event for cross-component communication
const dispatchSidebarEvent = (collapsed: boolean) => {
  window.dispatchEvent(new CustomEvent(SIDEBAR_STATE_EVENT, { detail: { collapsed } }));
};

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  // Listen for changes from other components
  useEffect(() => {
    const handleSidebarChange = (event: CustomEvent<{ collapsed: boolean }>) => {
      setIsCollapsed(event.detail.collapsed);
    };

    window.addEventListener(SIDEBAR_STATE_EVENT as any, handleSidebarChange);
    return () => {
      window.removeEventListener(SIDEBAR_STATE_EVENT as any, handleSidebarChange);
    };
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    dispatchSidebarEvent(collapsed);
  }, []);

  const toggleCollapsed = useCallback(() => {
    const newValue = !isCollapsed;
    setCollapsed(newValue);
  }, [isCollapsed, setCollapsed]);

  return {
    isCollapsed,
    setCollapsed,
    toggleCollapsed,
  };
}

// Constants for sidebar dimensions
export const SIDEBAR_WIDTH = 288;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
