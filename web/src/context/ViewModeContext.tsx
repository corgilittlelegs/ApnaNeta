import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewMode = 'citizen' | 'forensic';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  isCitizenMode: boolean;
  isForensicMode: boolean;
}

const STORAGE_KEY = 'apnaneta_view_mode';

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'citizen' || saved === 'forensic') {
        return saved;
      }
    } catch {
      // localStorage may be disabled or restricted
    }
    return 'citizen'; // Default to citizen-friendly mode
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage write errors
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'citizen' ? 'forensic' : 'citizen');
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        toggleViewMode,
        isCitizenMode: viewMode === 'citizen',
        isForensicMode: viewMode === 'forensic',
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = (): ViewModeContextType => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
