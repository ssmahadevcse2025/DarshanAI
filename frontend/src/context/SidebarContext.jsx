import React, { createContext, useState, useEffect } from 'react';

export const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  // Desktop collapse state (persisted across sessions)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('darshanai_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Mobile slide-out drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync collapse state with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('darshanai_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save sidebar state to localStorage:', e);
    }
  }, [isCollapsed]);

  // Automatically reset mobile drawer when resizing back to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const openSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(true);
    } else {
      setIsCollapsed(false);
    }
  };

  const closeSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    } else {
      setIsCollapsed(true);
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        toggleSidebar,
        closeMobileSidebar,
        openSidebar,
        closeSidebar
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
