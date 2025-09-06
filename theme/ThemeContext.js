import React, { createContext, useContext, useMemo, useState } from 'react';
import { lightColors, darkColors } from './colors';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light'); // in futuro potrai leggere il tema di sistema
  const colors = mode === 'dark' ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      mode,
      colors,
      toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Restituisce un tema per React Navigation che ESTENDE
 * DefaultTheme/DarkTheme, così manteniamo fonts, spacing, ecc.
 */
export function navThemeFor(mode) {
  const c = mode === 'dark' ? darkColors : lightColors;
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      // mappiamo i nostri colori personalizzati
      primary: c.primary,
      background: c.background,
      card: c.card,
      text: c.text,
      border: c.border,
      notification: c.accent,
    },
  };
}
