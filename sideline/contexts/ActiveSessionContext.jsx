import { createContext, useContext, useMemo, useState } from 'react';

const ActiveSessionContext = createContext(undefined);

export function ActiveSessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);

  const value = useMemo(
    () => ({
      activeSession,
      setActiveSession,
      clearActiveSession: () => setActiveSession(null),
    }),
    [activeSession]
  );

  return (
    <ActiveSessionContext.Provider value={value}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error('useActiveSession must be used within an ActiveSessionProvider');
  }
  return context;
}
