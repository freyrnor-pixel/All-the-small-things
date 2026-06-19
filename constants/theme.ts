/**
 * theme.ts — design tokens: colour themes (light/dark) + spacing/radius/type/shadow scales.
 *
 * Defines five named colour palettes (default/tech/gothic/nature/custom),
 * their dark variants, and shared layout constants. `getTheme(name, isDark, customColors)`
 * resolves a palette; lib/useAppTheme.ts wraps it to react to the user's theme + dark-mode
 * settings. The static `Colors` export is the default theme's light palette.
 * `getSoftTheme(colors)` returns a gentler, lower-contrast variant for emotional/health screens.
 * `Fonts` holds the rounded Nunito family tokens, `Layout` the shared card padding/rhythm.
 * `getFontSize(base, scale)` applies the user's fontSize preference to a base pt.
 * `getMaterialStyle(base, material)` computes bubble/FAB surface-finish tokens
 * (glass/metal/rock/paper) from a single base colour — see "Materials" section below.
 *
 * Connections:
 *   Imports → —
 *   Used by → app/_layout.tsx, app/focus.tsx, app/habit-form.tsx, app/habits.tsx, app/health.tsx, app/index.tsx, app/meals.tsx, app/onboarding/guided.tsx, app/onboarding/index.tsx, app/onboarding/language.tsx, app/onboarding/privacy.tsx, app/onboarding/step2.tsx, app/onboarding/step3.tsx, app/onboarding/step4.tsx, app/onboarding/step5.tsx, app/plans.tsx, app/scan.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/shopping.tsx, app/task-form.tsx, components/BubbleMenu.tsx, components/DatePickerCalendar.tsx, components/DayTimeline.tsx, components/ExpandableCard.tsx, components/HintCard.tsx, components/MonthlyPickerSheet.tsx, components/QuickAddSheet.tsx, components/ShoppingRow.tsx, components/TaskItem.tsx, components/TimePickerWheel.tsx, lib/useAppTheme.ts
 *   Data    → none (pure constants)
 *
 * Edit notes:
 *   - Every theme must implement the full AppColors interface — add a new key to
 *     ALL palettes (THEMES + DARK_THEMES) or getTheme returns undefined colours.
 *   - For theme-aware screens prefer useAppTheme() over the static `Colors`,
 *     which is always the light default palette.
 *   - `neutral` is a muted mid-tone used for shame-free UI elements (empty habit circles, backlog badges).
 *   - The 'custom' theme is computed from user's primary/secondary colors via buildCustomTheme().
 *   - Materials are a separate axis from colour themes (a bubble's hue + its finish are
 *     independent settings) — getMaterialStyle() only ever computes border/shadow/sheen
 *     tokens, never a hue, so it composes with any theme or FeatureColors value.
 */
export type ThemeName = 'default' | 'tech' | 'gothic' | 'nature' | 'custom';
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

// ─── Colour manipulation helpers for the custom theme ───────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length !== 6) return [100, 100, 100];
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Relative-luminance check: returns a readable foreground color for any background hex. */
export function contrastOn(hexBg: string): string {
  const [r, g, b] = hexToRgb(hexBg);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1E293B' : '#FFFFFF';
}

function buildCustomTheme(primary: string, secondary: string, isDark: boolean): AppColors {
  if (isDark) {
    return {
      cream: '#0C0C14',
      orange: lighten(primary, 0.2),
      orangeLight: darken(primary, 0.6),
      green: lighten(secondary, 0.2),
      greenLight: darken(secondary, 0.6),
      brown: lighten(primary, 0.4),
      brownLight: darken(primary, 0.5),
      white: '#141420',
      offWhite: '#0E0E1A',
      gray: '#6A6A80',
      grayLight: '#1E1E30',
      text: '#EEEEF8',
      textLight: '#9090B0',
      danger: '#F87171',
      dangerLight: '#280808',
      shadow: 'rgba(0,0,0,0.6)',
      border: darken(primary, 0.4),
      neutral: '#505068',
    };
  }
  return {
    cream: lighten(primary, 0.92),
    orange: primary,
    orangeLight: lighten(primary, 0.7),
    green: secondary,
    greenLight: lighten(secondary, 0.7),
    brown: darken(primary, 0.3),
    brownLight: lighten(primary, 0.4),
    white: '#FFFFFF',
    offWhite: lighten(primary, 0.85),
    gray: '#8A8A9A',
    grayLight: lighten(primary, 0.88),
    text: darken(primary, 0.6),
    textLight: darken(primary, 0.3),
    danger: '#E05050',
    dangerLight: '#FFE0E0',
    shadow: `rgba(0,0,0,0.12)`,
    border: lighten(primary, 0.6),
    neutral: lighten(primary, 0.5),
  };
}

// ─── Light themes ────────────────────────────────────────────────────────────

export const THEMES: Record<ThemeName, AppColors> = {
  // Watercolor tree logo blue, soft glow whites — clean, focused, calm.
  default: {
    cream: '#F2F8FE',
    orange: '#2563EB',
    orangeLight: '#BFDBFE',
    green: '#10B981',
    greenLight: '#A7F3D0',
    brown: '#1E3A8A',
    brownLight: '#60A5FA',
    white: '#FFFFFF',
    offWhite: '#E8F2FE',
    gray: '#94A3B8',
    grayLight: '#DCEEFC',
    text: '#142545',
    textLight: '#5C7299',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    shadow: 'rgba(30,41,59,0.12)',
    border: '#CDE6FA',
    neutral: '#A3C2E4',
  },
  // Sky blue with blue-tinted white and grey details — modern, airy.
  tech: {
    cream: '#F0F5FC',
    orange: '#0EA5E9',
    orangeLight: '#BAE6FD',
    green: '#06B6D4',
    greenLight: '#CFFAFE',
    brown: '#0369A1',
    brownLight: '#7DD3FC',
    white: '#FFFFFF',
    offWhite: '#E8F1FB',
    gray: '#6B8090',
    grayLight: '#D8E8F5',
    text: '#0C1A28',
    textLight: '#4A6070',
    danger: '#F43F5E',
    dangerLight: '#FFE4E6',
    shadow: 'rgba(12,26,40,0.12)',
    border: '#C0D8F0',
    neutral: '#8AAAC0',
  },
  // Soft purple tones in light mode; dark mode is the true gothic look.
  gothic: {
    cream: '#F5F0FF',
    orange: '#7C3AED',
    orangeLight: '#EDE9FE',
    green: '#8B5CF6',
    greenLight: '#F5F3FF',
    brown: '#5B21B6',
    brownLight: '#C4B5FD',
    white: '#FFFFFF',
    offWhite: '#F0EAFF',
    gray: '#7C6A9E',
    grayLight: '#EAE5F8',
    text: '#200E40',
    textLight: '#6B5A8A',
    danger: '#E11D48',
    dangerLight: '#FFE4E6',
    shadow: 'rgba(32,14,64,0.12)',
    border: '#DDD6FE',
    neutral: '#A890C8',
  },
  // Green seams with white, orange details — earthy, grounded.
  nature: {
    cream: '#F2FAF4',
    orange: '#16A34A',
    orangeLight: '#BBF7D0',
    green: '#15803D',
    greenLight: '#DCFCE7',
    brown: '#EA580C',
    brownLight: '#FED7AA',
    white: '#FFFFFF',
    offWhite: '#E8F5EC',
    gray: '#7A9E84',
    grayLight: '#D8EEE0',
    text: '#0D3018',
    textLight: '#4A7A58',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    shadow: 'rgba(13,48,24,0.12)',
    border: '#C0E8CC',
    neutral: '#8CB89A',
  },
  // Placeholder — replaced at runtime by buildCustomTheme() using user's chosen colors.
  custom: {
    cream: '#F8F8F8',
    orange: '#6B6B8A',
    orangeLight: '#E0E0F0',
    green: '#5A8A6B',
    greenLight: '#D0F0D8',
    brown: '#3A3A5A',
    brownLight: '#AAAAC8',
    white: '#FFFFFF',
    offWhite: '#F0F0F8',
    gray: '#8A8A9A',
    grayLight: '#E8E8F0',
    text: '#1A1A2E',
    textLight: '#6A6A80',
    danger: '#E05050',
    dangerLight: '#FFE0E0',
    shadow: 'rgba(0,0,0,0.12)',
    border: '#D0D0E0',
    neutral: '#9090A8',
  },
};

export const THEME_META: Record<ThemeName, { label: string }> = {
  default: { label: 'Default' },
  tech: { label: 'Tech' },
  gothic: { label: 'Gothic' },
  nature: { label: 'Nature' },
  custom: { label: 'Custom' },
};

// ─── Dark themes ─────────────────────────────────────────────────────────────

export const DARK_THEMES: Record<ThemeName, AppColors> = {
  default: {
    cream: '#070B16',
    orange: '#4EA8FC',
    orangeLight: '#1C3A66',
    green: '#34D399',
    greenLight: '#0D2A1A',
    brown: '#8FC7FF',
    brownLight: '#16335E',
    white: '#121928',
    offWhite: '#0C1220',
    gray: '#6A8AA0',
    grayLight: '#18233C',
    text: '#E6F1FE',
    textLight: '#8FB8DE',
    danger: '#FC8181',
    dangerLight: '#2A0A0A',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#1A3460',
    neutral: '#52708C',
  },
  tech: {
    cream: '#080E16',
    orange: '#38BDF8',
    orangeLight: '#0A2030',
    green: '#22D3EE',
    greenLight: '#081820',
    brown: '#7DD3FC',
    brownLight: '#0C1A28',
    white: '#101822',
    offWhite: '#0C1420',
    gray: '#4A6070',
    grayLight: '#141E2A',
    text: '#D0E8F8',
    textLight: '#6AA8C8',
    danger: '#FB7185',
    dangerLight: '#280810',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#142030',
    neutral: '#3A5870',
  },
  // Full dark gothic — the primary intended look for this theme.
  gothic: {
    cream: '#0E0818',
    orange: '#A855F7',
    orangeLight: '#2A1050',
    green: '#C084FC',
    greenLight: '#1A0830',
    brown: '#E9D5FF',
    brownLight: '#3A1870',
    white: '#180C28',
    offWhite: '#120820',
    gray: '#7850A0',
    grayLight: '#200E38',
    text: '#F3E8FF',
    textLight: '#C4A0E8',
    danger: '#F472B6',
    dangerLight: '#2A0820',
    shadow: 'rgba(0,0,0,0.7)',
    border: '#3A1860',
    neutral: '#6840A0',
  },
  nature: {
    cream: '#08140A',
    orange: '#22C55E',
    orangeLight: '#0A2810',
    green: '#16A34A',
    greenLight: '#061608',
    brown: '#FB923C',
    brownLight: '#2A1408',
    white: '#101C12',
    offWhite: '#0C160E',
    gray: '#4A7050',
    grayLight: '#101E12',
    text: '#D0F0D8',
    textLight: '#6AB87A',
    danger: '#F87171',
    dangerLight: '#280808',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#142818',
    neutral: '#387048',
  },
  // Placeholder — replaced at runtime by buildCustomTheme().
  custom: {
    cream: '#0C0C14',
    orange: '#8888AA',
    orangeLight: '#1E1E30',
    green: '#669A77',
    greenLight: '#0E1E12',
    brown: '#AAAACC',
    brownLight: '#181828',
    white: '#141420',
    offWhite: '#0E0E1A',
    gray: '#6A6A80',
    grayLight: '#1E1E30',
    text: '#EEEEF8',
    textLight: '#9090B0',
    danger: '#F87171',
    dangerLight: '#280808',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#252540',
    neutral: '#505068',
  },
};

export function getTheme(
  name: string,
  isDark = false,
  customColors?: { primary: string; secondary: string }
): AppColors {
  if (name === 'custom' && customColors) {
    return buildCustomTheme(customColors.primary, customColors.secondary, isDark);
  }
  const map = isDark ? DARK_THEMES : THEMES;
  return map[name as ThemeName] ?? (isDark ? DARK_THEMES.default : THEMES.default);
}

/**
 * Soften a palette for emotional / health screens: warms and lowers the contrast
 * of text and surfaces so the screen reads gentler than productivity screens.
 * Pure-function transform over any AppColors.
 */
export function getSoftTheme(c: AppColors): AppColors {
  return {
    ...c,
    text: c.textLight,
    danger: c.neutral,
  };
}

export const Colors = THEMES.default;

/**
 * Bubble/FAB accent colors for BubbleMenu + the task-type accents in task-form/TaskItem.
 * Designed as one coordinated set rather than independent picks: hues are spread
 * ~16-41° apart around the wheel (no two adjacent, so every bubble is unambiguous at a
 * glance — the old set had habits/health as near-identical greens and meals/shop as
 * near-identical cyans), saturation held in a 56-85% band, and lightness tuned per-hue
 * so every value's luminance lands in a tight ~0.42-0.55 range. That luminance cap is
 * deliberate: BubbleMenu renders a hardcoded white icon + white label on top of these
 * (no contrastOn() there), so every entry must stay dark/saturated enough for white to
 * read clearly — the old `scan`/`meals` picks were close to failing this.
 * Hue stays anchored to the feature's natural semantic family (task=blue/trust,
 * health=red/heart, habits=green/growth, shared=violet/connection, focus=red-orange/
 * energy) so the mapping still feels intuitive, not just decorative.
 */
export const FeatureColors = {
  task:    '#3A78E4', // blue          — trust / primary action
  scan:    '#D97512', // burnt amber   — camera / attention
  habits:  '#27915F', // forest green  — growth (was too close to health's old green)
  health:  '#DC3853', // rose-red      — heart / vitality
  meals:   '#AF8D1D', // ochre/mustard — food / warmth (was cyan, didn't read as "food")
  shop:    '#2096B6', // teal-cyan     — list / fresh (distinct from task's blue)
  shared:  '#8260D2', // violet        — connection
  focus:   '#E83A17', // red-orange    — energy / urgency (was a stray inline hex in BubbleMenu)
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
 * breathes the same on every screen.
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
 * the regular face is also set as the global Text default there.
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 12,
    elevation: 5,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
};

/** 20 preset colors for the custom theme color picker (5 × 4 grid). */
export const CUSTOM_COLOR_PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E',
  '#78716C', '#6B7280', '#374151', '#1E293B', '#000000',
];

// ─── Materials: bubble/FAB surface finish ───────────────────────────────────
// A finish is a set of pure style tokens (no native gradient/blur deps, so it
// stays OTA-safe) derived from a single base colour. Independent from colour
// themes — any bubble's hue and finish can vary separately.

export type MaterialName = 'glass' | 'metal' | 'rock' | 'paper';

export const MATERIAL_META: Record<MaterialName, { label: string }> = {
  glass: { label: 'Glass' },
  metal: { label: 'Metal' },
  rock: { label: 'Rock' },
  paper: { label: 'Paper' },
};

export type MaterialStyle = {
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  borderTopColor: string;
  borderBottomColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  /**
   * Android shadow depth. RN ignores shadowOpacity/shadowRadius on Android —
   * elevation is the only thing that actually draws a shadow there, so each
   * finish needs its own value or every material looks identical on Android.
   */
  elevation: number;
  /** Faint highlight overlay for the top portion of the surface. */
  sheenColor: string;
};

/** lighten() for amount >= 0, darken() for amount < 0 — one knob, either direction. */
function shade(hex: string, amount: number): string {
  return amount >= 0 ? lighten(hex, amount) : darken(hex, -amount);
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Per-finish surface tokens for bubble/FAB rendering, computed from a single
 * base colour. Spread the border/shadow keys onto the outer (shadow-casting)
 * view and `backgroundColor` + `sheenColor` onto an inner overflow:hidden mask
 * — see components/BubbleMenu.tsx for the two-layer render pattern.
 */
export function getMaterialStyle(base: string, material: MaterialName): MaterialStyle {
  switch (material) {
    case 'metal':
      return {
        backgroundColor: shade(base, -0.08),
        borderWidth: 1.5,
        borderColor: shade(base, -0.3),
        borderTopColor: shade(base, 0.4),
        borderBottomColor: shade(base, -0.5),
        shadowOpacity: 0.32,
        shadowRadius: 8,
        elevation: 9,
        sheenColor: rgba('#FFFFFF', 0.3),
      };
    case 'rock':
      return {
        backgroundColor: shade(base, -0.18),
        borderWidth: 2,
        borderColor: shade(base, -0.4),
        borderTopColor: shade(base, -0.05),
        borderBottomColor: shade(base, -0.55),
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
        sheenColor: rgba('#FFFFFF', 0.06),
      };
    case 'paper':
      return {
        backgroundColor: shade(base, 0.1),
        borderWidth: 1,
        borderColor: shade(base, -0.08),
        borderTopColor: shade(base, 0.18),
        borderBottomColor: shade(base, -0.12),
        shadowOpacity: 0.09,
        shadowRadius: 4,
        elevation: 2,
        sheenColor: rgba('#FFFFFF', 0.18),
      };
    case 'glass':
    default:
      return {
        backgroundColor: rgba(base, 0.72),
        borderWidth: 1,
        borderColor: rgba('#FFFFFF', 0.5),
        borderTopColor: rgba('#FFFFFF', 0.75),
        borderBottomColor: rgba('#000000', 0.15),
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 6,
        sheenColor: rgba('#FFFFFF', 0.5),
      };
  }
}
