import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ActiveSessionContext = createContext(undefined);
const ACTIVE_SESSION_STORAGE_KEY = '@sideline/activeSession';

const serializeSession = (session) => {
  if (!session) return null;
  return {
    ...session,
    date: session.date instanceof Date ? session.date.toISOString() : session.date ?? null,
    startedAt:
      session.startedAt instanceof Date
        ? session.startedAt.toISOString()
        : session.startedAt ?? null,
  };
};

const deserializeSession = (session) => {
  if (!session) return null;
  return {
    ...session,
    date: session.date ? new Date(session.date) : null,
    startedAt: session.startedAt ? new Date(session.startedAt) : null,
  };
};

export function ActiveSessionProvider({ children }) {
  const [activeSession, setActiveSessionState] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const hydrateActiveSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
        if (!raw || !isMounted) return;

        const parsed = JSON.parse(raw);
        setActiveSessionState(deserializeSession(parsed));
      } catch (error) {
        console.error('Failed to rehydrate active session:', error);
      }
    };

    hydrateActiveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const setActiveSession = async (session) => {
    setActiveSessionState(session);

    try {
      if (session) {
        await AsyncStorage.setItem(
          ACTIVE_SESSION_STORAGE_KEY,
          JSON.stringify(serializeSession(session))
        );
      } else {
        await AsyncStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to persist active session:', error);
    }
  };

  const clearActiveSession = () => {
    setActiveSession(null);
  };

  const value = useMemo(
    () => ({
      activeSession,
      setActiveSession,
      clearActiveSession,
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
