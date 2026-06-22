/**
 * UnFocus — ThemeProvider
 *
 * Wraps the entire app. Provides the active ColorPalette and shadow styles
 * to every component via useTheme().
 *
 * Persists `scheme` and `darkMode` to AsyncStorage so they survive app restart.
 *
 * Usage:
 *   // In your root layout (app/_layout.tsx):
 *   import { ThemeProvider } from '@/components/ThemeProvider';
 *   export default function RootLayout() {
 *     return <ThemeProvider><Stack /></ThemeProvider>;
 *   }
 *
 *   // In any component:
 *   import { useTheme } from '@/components/ThemeProvider';
 *   const { colors, shadows, scheme, setScheme, darkMode, setDarkMode } = useTheme();
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHEMES, SchemeName, ColorPalette } from '@/constants/colors';
import { makeShadows, ShadowStyle } from '@/constants/theme';

const STORAGE_KEY_SCHEME   = 'unfocus_scheme';
const STORAGE_KEY_DARKMODE = 'unfocus_darkMode';

interface ThemeContextValue {
  scheme:     SchemeName;
  setScheme:  (s: SchemeName) => void;
  darkMode:   boolean;
  setDarkMode:(v: boolean) => void;
  colors:     ColorPalette;
  shadows:    ReturnType<typeof makeShadows>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme,   setSchemeState]   = useState<SchemeName>('default');
  const [darkMode, setDarkModeState] = useState(false);

  // Load persisted preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedScheme, storedDark] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SCHEME),
          AsyncStorage.getItem(STORAGE_KEY_DARKMODE),
        ]);
        if (storedScheme) setSchemeState(storedScheme as SchemeName);
        if (storedDark)   setDarkModeState(storedDark === 'true');
      } catch {
        // Silently fall back to defaults if storage is unavailable
      }
    })();
  }, []);

  const setScheme = (s: SchemeName) => {
    setSchemeState(s);
    AsyncStorage.setItem(STORAGE_KEY_SCHEME, s).catch(() => {});
  };

  const setDarkMode = (v: boolean) => {
    setDarkModeState(v);
    AsyncStorage.setItem(STORAGE_KEY_DARKMODE, String(v)).catch(() => {});
  };

  const palette = SCHEMES[scheme];
  const colors  = darkMode ? palette.dark : palette.light;
  const shadows = makeShadows(colors.shadowColor);

  return (
    <ThemeContext.Provider value={{ scheme, setScheme, darkMode, setDarkMode, colors, shadows }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
