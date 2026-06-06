export type ThemeName = 'warm' | 'cool' | 'forest' | 'rose';

export interface AppColors {
  cream: string;
  orange: string;
  orangeLight: string;
  green: string;
  greenLight: string;
  brown: string;
  brownLight: string;
  white: string;
  offWhite: string;
  gray: string;
  grayLight: string;
  text: string;
  textLight: string;
  danger: string;
  dangerLight: string;
  shadow: string;
}

const warmColors: AppColors = {
  cream: '#FDF6EC',
  orange: '#F4A261',
  orangeLight: '#FDDCBC',
  green: '#6BAA75',
  greenLight: '#C8E6CC',
  brown: '#8B5E3C',
  brownLight: '#C49A6C',
  white: '#FFFFFF',
  offWhite: '#FAF3E8',
  gray: '#9E9E9E',
  grayLight: '#F0EDE8',
  text: '#3D2B1F',
  textLight: '#7A6252',
  danger: '#E07070',
  dangerLight: '#FADADD',
  shadow: 'rgba(61,43,31,0.12)',
};

export const THEMES: Record<ThemeName, AppColors> = {
  warm: warmColors,
  cool: {
    cream: '#EEF6FB',
    orange: '#4A8EC2',
    orangeLight: '#BADAEF',
    green: '#4A9E8C',
    greenLight: '#BAE0DA',
    brown: '#2C5978',
    brownLight: '#7AABCA',
    white: '#FFFFFF',
    offWhite: '#E8F2F9',
    gray: '#8A9EAA',
    grayLight: '#DDE8EF',
    text: '#1A3A52',
    textLight: '#4A6A80',
    danger: '#C05050',
    dangerLight: '#F8D0D0',
    shadow: 'rgba(26,58,82,0.12)',
  },
  forest: {
    cream: '#F0F7F0',
    orange: '#5E9E6A',
    orangeLight: '#BEE0C2',
    green: '#4A7D57',
    greenLight: '#AECFB5',
    brown: '#3A5E42',
    brownLight: '#8CB898',
    white: '#FFFFFF',
    offWhite: '#E8F2EA',
    gray: '#8AA694',
    grayLight: '#DBE8DC',
    text: '#1A3D22',
    textLight: '#4A6E52',
    danger: '#C06050',
    dangerLight: '#F5D5D0',
    shadow: 'rgba(26,61,34,0.12)',
  },
  rose: {
    cream: '#FDF0F5',
    orange: '#D4688A',
    orangeLight: '#EFBFD0',
    green: '#6A9E8A',
    greenLight: '#C0DEDA',
    brown: '#8A3D62',
    brownLight: '#C49AB5',
    white: '#FFFFFF',
    offWhite: '#FAE8F0',
    gray: '#AA8A9A',
    grayLight: '#EFE0E8',
    text: '#3D1A2E',
    textLight: '#7A4A62',
    danger: '#C06070',
    dangerLight: '#F5D0D8',
    shadow: 'rgba(61,26,46,0.12)',
  },
};

export const THEME_META: Record<ThemeName, { label: string; emoji: string }> = {
  warm: { label: 'Varm', emoji: '🍊' },
  cool: { label: 'Kjølig', emoji: '🫐' },
  forest: { label: 'Skog', emoji: '🌿' },
  rose: { label: 'Rose', emoji: '🌸' },
};

export function getTheme(name: string): AppColors {
  return THEMES[name as ThemeName] ?? warmColors;
}

export const Colors = warmColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

export const Shadow = {
  card: {
    shadowColor: warmColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  fab: {
    shadowColor: warmColors.brown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
