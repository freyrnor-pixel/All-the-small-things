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
 * (glass/metal/rock/paper) from a single base colour, tinted toward that
 * finish's real-world hue — see "Materials" section below.
 *
 * Connections:
 *   Imports → —
 *   Used by → app/_layout.tsx, app/budget.tsx, app/capture.tsx, app/focus.tsx, app/habit-form.tsx, app/habits.tsx, app/health.tsx, app/index.tsx, app/meals.tsx, app/onboarding/guided.tsx, app/onboarding/index.tsx, app/onboarding/language.tsx, app/onboarding/privacy.tsx, app/onboarding/step2.tsx, app/onboarding/step3.tsx, app/onboarding/step4.tsx, app/onboarding/step5.tsx, app/onboarding/step6.tsx, app/plans.tsx, app/scan.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/shopping.tsx, app/task-form.tsx, components/BubbleMenu.tsx, components/DatePickerCalendar.tsx, components/DayTimeline.tsx, components/ExpandableCard.tsx, components/HintCard.tsx, components/MonthlyPickerSheet.tsx, components/QuickAddSheet.tsx, components/ShoppingRow.tsx, components/TaskItem.tsx, components/TimePickerWheel.tsx, lib/useAppTheme.ts
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
 *     independent settings), but getMaterialStyle() now also tints the input base toward
 *     a per-finish reference hue (icy blue glass, steel grey metal, stone grey rock, warm
 *     paper) before shading it — so the same base colour still looks recognizably
 *     different per finish. The tint blends hue/saturation at the base's own lightness
 *     (see tint() below), which keeps existing text-contrast assumptions intact.
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
  /** Hint/explanation box surface — derived from `orange` (primary), not `green`, so it always harmonizes with the theme's own accent rather than an unrelated secondary hue. */
  hintBg: string;
  hintBorder: string;
  hintAccent: string;
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

function relLuminance(hex: string): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const DARK_TEXT = '#1E293B';

/**
 * Returns whichever of near-black (DARK_TEXT) or white text has the higher WCAG
 * contrast ratio against hexBg. Picking the actual winner (rather than a flat
 * luminance>0.6 threshold, which this replaced) matters once a background's
 * luminance lands in a mid-range zone — e.g. an amber bubble tinted toward
 * paper's cream hue scored only 2.96:1 against white but 4.95:1 against dark
 * text, and the old threshold picked the worse one.
 */
export function contrastOn(hexBg: string): string {
  const bgLum = relLuminance(hexBg);
  const darkLum = relLuminance(DARK_TEXT);
  const contrastWithWhite = (Math.max(bgLum, 1) + 0.05) / (Math.min(bgLum, 1) + 0.05);
  const contrastWithDark = (Math.max(bgLum, darkLum) + 0.05) / (Math.min(bgLum, darkLum) + 0.05);
  return contrastWithDark >= contrastWithWhite ? DARK_TEXT : '#FFFFFF';
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
      // Same ~10%-step elevation ladder as the static dark themes (see
      // DARK_THEMES above) — white/offWhite/grayLight rise from cream in
      // increasingly bright layers instead of all sitting within a hair of it.
      white: lighten(lighten('#0C0C14', 0.08), 0.1),
      offWhite: lighten('#0C0C14', 0.08),
      gray: '#6A6A80',
      grayLight: lighten(lighten(lighten('#0C0C14', 0.08), 0.1), 0.1),
      text: '#EEEEF8',
      textLight: '#9090B0',
      danger: '#F87171',
      dangerLight: '#280808',
      shadow: 'rgba(0,0,0,0.6)',
      // Full accent colour, undimmed — see DARK_THEMES border comment.
      border: primary,
      neutral: '#505068',
      hintBg: darken(primary, 0.75),
      hintBorder: darken(primary, 0.5),
      hintAccent: lighten(primary, 0.2),
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
    white: lighten(primary, 0.985),
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
    hintBg: lighten(primary, 0.9),
    hintBorder: lighten(primary, 0.65),
    hintAccent: primary,
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
    white: lighten('#2563EB', 0.985),
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
    hintBg: lighten('#2563EB', 0.9),
    hintBorder: lighten('#2563EB', 0.65),
    hintAccent: '#2563EB',
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
    white: lighten('#0EA5E9', 0.985),
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
    hintBg: lighten('#0EA5E9', 0.9),
    hintBorder: lighten('#0EA5E9', 0.65),
    hintAccent: '#0EA5E9',
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
    white: lighten('#7C3AED', 0.985),
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
    hintBg: lighten('#7C3AED', 0.9),
    hintBorder: lighten('#7C3AED', 0.65),
    hintAccent: '#7C3AED',
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
    white: lighten('#16A34A', 0.985),
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
    hintBg: lighten('#16A34A', 0.9),
    hintBorder: lighten('#16A34A', 0.65),
    hintAccent: '#16A34A',
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
    hintBg: lighten('#6B6B8A', 0.9),
    hintBorder: lighten('#6B6B8A', 0.65),
    hintAccent: '#6B6B8A',
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
    // white/offWhite/grayLight step up from cream in ~10%-lighter layers (each
    // visibly brighter than the one below) so cards actually read as raised —
    // a flat near-cream-vs-near-black gap was nearly invisible before.
    white: '#32353e',
    offWhite: '#1b1f29',
    gray: '#6A8AA0',
    grayLight: '#474951',
    text: '#E6F1FE',
    textLight: '#8FB8DE',
    danger: '#FC8181',
    dangerLight: '#2A0A0A',
    shadow: 'rgba(0,0,0,0.6)',
    // Full accent colour, undimmed — a darkened/desaturated border all but
    // disappeared against the lightened white above; the raw accent reads
    // as a clear, deliberate outline instead.
    border: '#4EA8FC',
    neutral: '#52708C',
    hintBg: darken('#4EA8FC', 0.75),
    hintBorder: darken('#4EA8FC', 0.5),
    hintAccent: lighten('#4EA8FC', 0.15),
  },
  tech: {
    cream: '#080E16',
    orange: '#38BDF8',
    orangeLight: '#0A2030',
    green: '#22D3EE',
    greenLight: '#081820',
    brown: '#7DD3FC',
    brownLight: '#0C1A28',
    white: '#33373e',
    offWhite: '#1c2129',
    gray: '#4A6070',
    grayLight: '#474b51',
    text: '#D0E8F8',
    textLight: '#6AA8C8',
    danger: '#FB7185',
    dangerLight: '#280810',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#38BDF8',
    neutral: '#3A5870',
    hintBg: darken('#38BDF8', 0.75),
    hintBorder: darken('#38BDF8', 0.5),
    hintAccent: lighten('#38BDF8', 0.15),
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
    white: '#37333f',
    offWhite: '#211c2a',
    gray: '#7850A0',
    grayLight: '#4b4752',
    text: '#F3E8FF',
    textLight: '#C4A0E8',
    danger: '#F472B6',
    dangerLight: '#2A0820',
    shadow: 'rgba(0,0,0,0.7)',
    border: '#A855F7',
    neutral: '#6840A0',
    hintBg: darken('#A855F7', 0.75),
    hintBorder: darken('#A855F7', 0.5),
    hintAccent: lighten('#A855F7', 0.15),
  },
  nature: {
    cream: '#08140A',
    orange: '#22C55E',
    orangeLight: '#0A2810',
    green: '#16A34A',
    greenLight: '#061608',
    brown: '#FB923C',
    brownLight: '#2A1408',
    white: '#333d35',
    offWhite: '#1c271e',
    gray: '#4A7050',
    grayLight: '#475049',
    text: '#D0F0D8',
    textLight: '#6AB87A',
    danger: '#F87171',
    dangerLight: '#280808',
    shadow: 'rgba(0,0,0,0.6)',
    border: '#22C55E',
    neutral: '#387048',
    hintBg: darken('#22C55E', 0.75),
    hintBorder: darken('#22C55E', 0.5),
    hintAccent: lighten('#22C55E', 0.15),
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
    hintBg: darken('#8888AA', 0.75),
    hintBorder: darken('#8888AA', 0.5),
    hintAccent: lighten('#8888AA', 0.15),
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
 * so every value's luminance lands in a tight ~0.42-0.55 range. That luminance band is
 * still worth keeping tight even though BubbleMenu now resolves its icon/label color
 * dynamically via contrastOn(material.contrastBase) rather than a hardcoded white —
 * the tighter the band, the more predictable each entry looks across every material
 * finish's tint/shade.
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
  capture: '#D6399C', // magenta-pink  — quick jot-it-down spark (AP-02), distinct from every hue above
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
// stays OTA-safe) derived from a single base colour, tinted toward that
// finish's real-world hue (see MATERIAL_TINT) before the existing
// lighten/darken shading is applied. Independent from colour themes — any
// bubble's hue and finish can vary separately, the tint just makes sure two
// finishes never render as the literal same colour for the same base.

export type MaterialName = 'glass' | 'metal' | 'rock' | 'paper' | 'plain';

export const MATERIAL_META: Record<MaterialName, { label: string }> = {
  glass: { label: 'Glass' },
  metal: { label: 'Metal' },
  rock: { label: 'Rock' },
  paper: { label: 'Paper' },
  plain: { label: 'Plain' },
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
  /**
   * Opaque hex equivalent of `backgroundColor` — pass this to contrastOn(),
   * never `backgroundColor` itself, since glass's backgroundColor is a
   * translucent rgba() string that contrastOn() can't parse.
   */
  contrastBase: string;
};

/** lighten() for amount >= 0, darken() for amount < 0 — one knob, either direction. */
function shade(hex: string, amount: number): string {
  return amount >= 0 ? lighten(hex, amount) : darken(hex, -amount);
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Per-channel linear blend toward hexB; t=0 → hexA, t=1 → hexB. */
function mix(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function hexToHsl(hex: string): [number, number, number] {
  const [r0, g0, b0] = hexToRgb(hex);
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
}

/**
 * Blend `base` toward `target`'s hue/saturation while keeping base's own
 * lightness — re-lighting the target to base's lightness *before* mixing
 * means the blend shifts hue/chroma rather than just averaging two different
 * brightness levels (which mostly cancels out hue and barely moves it; tried
 * that first). Keeping lightness anchored to `base` is also what keeps this
 * contrast-safe: every existing shade()/contrastOn() call downstream of this
 * was tuned against `base`'s lightness, so preserving it means the finish's
 * colour changes without quietly breaking text contrast on top of it.
 */
function tint(base: string, target: string, ratio: number): string {
  const [, , baseL] = hexToHsl(base);
  const [targetH, targetS] = hexToHsl(target);
  const relit = hslToHex(targetH, targetS, baseL);
  return mix(base, relit, ratio);
}

/** Real-world reference hue + blend strength each finish tints its base toward. */
const MATERIAL_TINT: Record<'glass' | 'metal' | 'rock' | 'paper', { color: string; ratio: number }> = {
  glass: { color: '#5AB4E6', ratio: 0.55 }, // icy window blue
  metal: { color: '#9AA5AD', ratio: 0.6 }, // brushed steel grey
  rock: { color: '#7D7870', ratio: 0.62 }, // stone grey
  paper: { color: '#E0D2B0', ratio: 0.5 }, // cream / kraft paper
};

// Constant across every finish so switching materials never resizes a card —
// RN/Yoga grows a content-sized box when borderWidth increases (border adds
// onto the intrinsic size unless an explicit width/height is set), so the
// old per-finish widths (1 / 1.5 / 2 / 1 / 1) made cards visibly jump size
// when the material setting changed.
const MATERIAL_BORDER_WIDTH = 1.5;

/**
 * Per-finish surface tokens for bubble/FAB rendering, computed from a single
 * base colour. Spread the border/shadow keys onto the outer (shadow-casting)
 * view and `backgroundColor` + `sheenColor` onto an inner overflow:hidden mask
 * — see components/BubbleMenu.tsx for the two-layer render pattern.
 */
export function getMaterialStyle(base: string, material: MaterialName): MaterialStyle {
  switch (material) {
    case 'metal': {
      const tinted = tint(base, MATERIAL_TINT.metal.color, MATERIAL_TINT.metal.ratio);
      const bg = shade(tinted, -0.08);
      return {
        backgroundColor: bg,
        borderWidth: MATERIAL_BORDER_WIDTH,
        borderColor: shade(tinted, -0.3),
        borderTopColor: shade(tinted, 0.4),
        borderBottomColor: shade(tinted, -0.5),
        shadowOpacity: 0.32,
        shadowRadius: 8,
        elevation: 9,
        sheenColor: rgba('#FFFFFF', 0.3),
        contrastBase: bg,
      };
    }
    case 'rock': {
      const tinted = tint(base, MATERIAL_TINT.rock.color, MATERIAL_TINT.rock.ratio);
      const bg = shade(tinted, -0.18);
      return {
        backgroundColor: bg,
        borderWidth: MATERIAL_BORDER_WIDTH,
        borderColor: shade(tinted, -0.4),
        borderTopColor: shade(tinted, -0.05),
        borderBottomColor: shade(tinted, -0.55),
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
        sheenColor: rgba('#FFFFFF', 0.06),
        contrastBase: bg,
      };
    }
    case 'paper': {
      const tinted = tint(base, MATERIAL_TINT.paper.color, MATERIAL_TINT.paper.ratio);
      const bg = shade(tinted, 0.08);
      return {
        backgroundColor: bg,
        borderWidth: MATERIAL_BORDER_WIDTH,
        borderColor: shade(tinted, -0.08),
        borderTopColor: shade(tinted, 0.18),
        borderBottomColor: shade(tinted, -0.12),
        shadowOpacity: 0.09,
        shadowRadius: 4,
        elevation: 2,
        sheenColor: rgba('#FFFFFF', 0.18),
        contrastBase: bg,
      };
    }
    case 'glass': {
      const tinted = tint(base, MATERIAL_TINT.glass.color, MATERIAL_TINT.glass.ratio);
      return {
        backgroundColor: rgba(tinted, 0.72),
        borderWidth: MATERIAL_BORDER_WIDTH,
        borderColor: rgba('#FFFFFF', 0.5),
        borderTopColor: rgba('#FFFFFF', 0.75),
        borderBottomColor: rgba('#000000', 0.15),
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 6,
        sheenColor: rgba('#FFFFFF', 0.5),
        contrastBase: tinted,
      };
    }
    // No-finish baseline: a flat, even fill with a hairline border and no
    // bevel/sheen — for anyone who wants surfaces to just sit there quietly
    // rather than read as glass/metal/rock/paper.
    case 'plain':
    default:
      return {
        backgroundColor: base,
        borderWidth: MATERIAL_BORDER_WIDTH,
        borderColor: shade(base, -0.06),
        borderTopColor: shade(base, -0.06),
        borderBottomColor: shade(base, -0.06),
        shadowOpacity: 0.1,
        shadowRadius: 7,
        elevation: 3,
        sheenColor: rgba('#FFFFFF', 0),
        contrastBase: base,
      };
  }
}
