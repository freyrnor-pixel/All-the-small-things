/**
 * theme.ts — design tokens: colour themes (light/dark) + spacing/radius/type/shadow scales.
 *
 * Defines the five named colour palettes (warm/cool/forest/rose + highcontrast),
 * their dark variants, and shared layout constants. `getTheme(name, isDark)` resolves
 * a palette; lib/useAppTheme.ts wraps it to react to the user's theme + dark-mode
 * settings. The static `Colors` export is the default warm palette.
 * `getSoftTheme(colors, name)` returns a gentler, lower-contrast variant for
 * emotional/health screens. `Fonts` holds the rounded Nunito family tokens, `Layout`
 * the shared card padding/rhythm. `getFontSize(base, scale)` applies the user's
 * fontSize preference to a base pt.
 *
 * Connections:
 *   Imports → —
 *   Used by → app/_layout.tsx, app/focus.tsx, app/habit-form.tsx, app/habits.tsx, app/health.tsx, app/index.tsx, app/meals.tsx, app/onboarding/guided.tsx, app/onboarding/index.tsx, app/onboarding/language.tsx, app/onboarding/privacy.tsx, app/onboarding/step2.tsx, app/onboarding/step3.tsx, app/onboarding/step4.tsx, app/onboarding/step5.tsx, app/scan.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/shopping.tsx, app/task-form.tsx, components/BubbleMenu.tsx, components/DatePickerCalendar.tsx, components/ExpandableCard.tsx, components/HintCard.tsx, components/MonthlyPickerSheet.tsx, components/QuickAddSheet.tsx, components/ShoppingRow.tsx, components/TaskItem.tsx, components/TimePickerWheel.tsx, lib/useAppTheme.ts
 *   Data    → none (pure constants)
 *
 * Edit notes:
 *   - Every theme must implement the full AppColors interface — add a new key to
 *     ALL palettes (warm/cool/forest/rose, light AND DARK_THEMES) or getTheme returns undefined colours.
 *   - For theme-aware screens prefer useAppTheme() over the static `Colors`,
 *     which is always the light warm palette.
 *   - `neutral` is a muted mid-tone used for shame-free UI elements (empty habit circles, backlog badges).
 */
export type ThemeName = 'warm' | 'cool' | 'forest' | 'rose' | 'highcontrast';
export type FontSizeScale = 'small' | 'default' | 'large';

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
  border: string;
  /** Muted neutral tone — used for shame-free empty circles / backlog badges. */
  neutral: string;
}

const fontScaleMap: Record<FontSizeScale, number> = { small: 0.875, default: 1, large: 1.2 };

/** Apply the user's fontSize preference to any base point size. */
export function getFontSize(base: number, scale: FontSizeScale): number {
  return Math.round(base * fontScaleMap[scale]);
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
  border: '#E8E0D8',
  neutral: '#C4B8AC',
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
    border: '#DDE3EC',
    neutral: '#A8BCCA',
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
    border: '#D8E4DA',
    neutral: '#A0B8A6',
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
    border: '#EAD9DF',
    neutral: '#C0A8B5',
  },
  // High-contrast / accessibility theme: near-black text on pure white, strong
  // saturated accents and heavy borders for users who need maximum legibility.
  highcontrast: {
    cream: '#FFFFFF',
    orange: '#B34A00',
    orangeLight: '#FFE0C2',
    green: '#1E7A2E',
    greenLight: '#C2F0C8',
    brown: '#1A1A1A',
    brownLight: '#4A4A4A',
    white: '#FFFFFF',
    offWhite: '#F2F2F2',
    gray: '#5A5A5A',
    grayLight: '#E0E0E0',
    text: '#000000',
    textLight: '#2A2A2A',
    danger: '#C00000',
    dangerLight: '#FFD6D6',
    shadow: 'rgba(0,0,0,0.35)',
    border: '#000000',
    neutral: '#5A5A5A',
  },
};

export const THEME_META: Record<ThemeName, { label: string; emoji: string }> = {
  warm: { label: 'Varm', emoji: '🍊' },
  cool: { label: 'Kjølig', emoji: '🫐' },
  forest: { label: 'Skog', emoji: '🌿' },
  rose: { label: 'Rose', emoji: '🌸' },
  highcontrast: { label: 'Høy kontrast', emoji: '⬛' },
};

export const DARK_THEMES: Record<ThemeName, AppColors> = {
  warm: {
    cream: '#1A1410',
    orange: '#F4A261',
    orangeLight: '#3D2010',
    green: '#6BAA75',
    greenLight: '#152515',
    brown: '#C49A6C',
    brownLight: '#4A2810',
    white: '#242018',
    offWhite: '#1D1810',
    gray: '#8A7060',
    grayLight: '#2E2420',
    text: '#F0E8D8',
    textLight: '#B09070',
    danger: '#E07070',
    dangerLight: '#3A1212',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#3A3530',
    neutral: '#786050',
  },
  cool: {
    cream: '#101822',
    orange: '#5FA8D8',
    orangeLight: '#102030',
    green: '#4A9E8C',
    greenLight: '#0E2018',
    brown: '#7AABCA',
    brownLight: '#152535',
    white: '#182535',
    offWhite: '#121E2B',
    gray: '#6A8E9E',
    grayLight: '#1E3040',
    text: '#D8EAF8',
    textLight: '#7AABCA',
    danger: '#C05050',
    dangerLight: '#2A1010',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#2A3140',
    neutral: '#506880',
  },
  forest: {
    cream: '#101A10',
    orange: '#6EAE7A',
    orangeLight: '#102015',
    green: '#4A7D57',
    greenLight: '#0E2012',
    brown: '#8CB898',
    brownLight: '#1A2E1E',
    white: '#181E18',
    offWhite: '#121812',
    gray: '#6A9070',
    grayLight: '#1E2E1E',
    text: '#D0EAD8',
    textLight: '#8CB898',
    danger: '#C06050',
    dangerLight: '#2A1010',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#253029',
    neutral: '#506858',
  },
  rose: {
    cream: '#1E1018',
    orange: '#D4688A',
    orangeLight: '#380E20',
    green: '#6A9E8A',
    greenLight: '#152018',
    brown: '#C49AB5',
    brownLight: '#4A1830',
    white: '#261520',
    offWhite: '#1E1018',
    gray: '#9A7080',
    grayLight: '#2E1E28',
    text: '#F0D8E8',
    textLight: '#C49AB5',
    danger: '#C06070',
    dangerLight: '#2A1020',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#3A2830',
    neutral: '#785060',
  },
  // High-contrast dark: pure white text on true black, bright accents, white borders.
  highcontrast: {
    cream: '#000000',
    orange: '#FFB060',
    orangeLight: '#3A2410',
    green: '#5EE070',
    greenLight: '#0E2A12',
    brown: '#FFFFFF',
    brownLight: '#CFCFCF',
    white: '#0A0A0A',
    offWhite: '#141414',
    gray: '#B0B0B0',
    grayLight: '#1F1F1F',
    text: '#FFFFFF',
    textLight: '#E0E0E0',
    danger: '#FF6B6B',
    dangerLight: '#3A0E0E',
    shadow: 'rgba(0,0,0,0.8)',
    border: '#FFFFFF',
    neutral: '#B0B0B0',
  },
};

export function getTheme(name: string, isDark = false): AppColors {
  const map = isDark ? DARK_THEMES : THEMES;
  return map[name as ThemeName] ?? (isDark ? DARK_THEMES.warm : warmColors);
}

/**
 * Soften a palette for emotional / health screens: warms and lowers the contrast
 * of text and surfaces so the screen reads gentler than productivity screens.
 * Pure-function transform over any AppColors — call from useSoftTheme()/per-screen.
 * The high-contrast theme is returned unchanged so accessibility is never reduced.
 */
export function getSoftTheme(c: AppColors, themeName?: string): AppColors {
  if (themeName === 'highcontrast') return c;
  return {
    ...c,
    // Lift body text slightly toward the muted tone (lower contrast, less clinical).
    text: c.textLight,
    // Replace alarm-red danger accents with the calm neutral on soft screens.
    danger: c.neutral,
  };
}

export const Colors = warmColors;

export const FeatureColors = {
  task:    '#F4A261',
  scan:    '#E8C46A',
  habits:  '#8CC97E',
  health:  '#6BAA75',
  meals:   '#56B89E',
  shop:    '#4AAFCA',
  shared:  '#5590D4',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Shared card/layout rhythm. Use these instead of ad-hoc padding so every card
 * breathes the same on every screen (cramped cards read as stressful).
 *   cardPadding   — interior padding for cards (≥16 vertical, generous).
 *   cardGap       — consistent vertical margin between stacked cards.
 *   maxVisible    — soft cap on items shown before an "and X more…" nudge.
 */
export const Layout = {
  cardPadding: 18,
  cardPaddingV: 18,
  cardPaddingH: 16,
  cardGap: 14,
  maxVisible: 5,
};

export const Radius = {
  sm: 10,
  md: 18,
  lg: 26,
  full: 999,
};

// Body text is never below 16; secondary/caption text never below 14.
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

/**
 * Rounded-typeface family tokens (Nunito). Loaded in app/_layout.tsx via expo-font;
 * the regular face is also set as the global Text default there, so most text
 * inherits it automatically. Use these tokens directly for weighted text
 * (headings, emphasis) since RN won't auto-map fontWeight to a named face.
 */
export const Fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 5,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
};
