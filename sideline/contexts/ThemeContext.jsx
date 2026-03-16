import React, { createContext, useContext } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Provides the system color scheme (light/dark) to the rest of the app.
const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ colorScheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
