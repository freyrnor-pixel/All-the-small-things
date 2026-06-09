import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getTheme, AppColors } from '@/constants/theme';

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
