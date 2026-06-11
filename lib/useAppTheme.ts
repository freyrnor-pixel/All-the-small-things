/**
 * useAppTheme.ts — React hooks resolving the active colour palette + dark-mode state.
 *
 * useAppTheme() reads the user's colorTheme + darkMode from the settings store and
 * the system colour scheme, then returns the matching AppColors via getTheme().
 * useIsDark() returns just the resolved dark/light boolean.
 * useAccessibility() returns { reducedMotion, fontScale } for animation and font scaling.
 *
 * Connections:
 *   Imports → constants/theme, store/useSettingsStore
 *   Used by → app/focus.tsx, app/index.tsx, app/settings.tsx, app/shopping.tsx, app/task-form.tsx, components/CompanionPet.tsx, components/TaskItem.tsx
 *   Data    → reads `colorTheme`, `darkMode`, `reducedMotion`, `fontSize` from the settings Zustand store
 *
 * Edit notes:
 *   - These are hooks — only call from React components/other hooks, never from
 *     stores or schedulers (use getTheme() directly there).
 *   - darkMode 'system' defers to useColorScheme(); keep the on/system/off logic
 *     in sync between useAppTheme and useIsDark.
 */
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getTheme, getFontSize, AppColors, FontSizeScale } from '@/constants/theme';

export function useAppTheme(): AppColors {
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const systemScheme = useColorScheme();
  const isDark = darkMode === 'on' || (darkMode === 'system' && systemScheme === 'dark');
  return getTheme(colorTheme, isDark);
}

export function useIsDark(): boolean {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const systemScheme = useColorScheme();
  return darkMode === 'on' || (darkMode === 'system' && systemScheme === 'dark');
}

/** Returns accessibility flags: whether animations should be suppressed and a font-scale helper. */
export function useAccessibility(): {
  reducedMotion: boolean;
  getFontSize: (base: number) => number;
} {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const fontSize = useSettingsStore((s) => s.fontSize) as FontSizeScale;
  return {
    reducedMotion,
    getFontSize: (base: number) => getFontSize(base, fontSize),
  };
}
