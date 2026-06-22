/**
 * UnFocus — Design Tokens
 * Typography, spacing, border-radius, and elevation (shadow) tokens.
 * All values match the Claude Design handoff spec exactly.
 *
 * Usage:
 *   import { FontSize, FontWeight, Spacing, Radius, Elevation } from '@/constants/theme';
 *   style={{ fontSize: FontSize.base, fontWeight: FontWeight.bold }}
 */

// ── Typography ───────────────────────────────────────────────────────────────

export const FontFamily = {
  sans: 'Nunito',
} as const;

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};

/** All sizes in sp (scale-independent pixels — same as px on non-scaled devices) */
export const FontSize = {
  xs:   11,
  sm:   12,
  smmd: 13,
  md:   14,
  base: 16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
} as const;

export const LineHeight = {
  tight:  1.4,
  snug:   1.5,
  body:   1.6,
  relaxed: 1.7,
  loose:  1.8,
} as const;

// ── Spacing (8-pt scale) ─────────────────────────────────────────────────────

export const Spacing = {
  s2:  2,
  s4:  4,
  s6:  6,
  s8:  8,
  s12: 12,
  s14: 14,
  s16: 16,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s40: 40,
  s48: 48,
  s56: 56,
  s64: 64,
  s72: 72,
  s80: 80,
  /** Standard padding inside every card */
  cardPadding: 12,
  /** Standard horizontal screen margin */
  screenPadding: 16,
} as const;

// ── Border radius ────────────────────────────────────────────────────────────

export const Radius = {
  sm:   2,
  m:    4,
  md:   6,
  lg:   8,
  xl:   12,
  full: 999,
} as const;

// ── Elevation / Shadows ──────────────────────────────────────────────────────
// React Native shadow props (cross-platform via style).
// shadowColor comes from the active ColorPalette.shadowColor.

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number; // Android
}

/** Build shadow styles from the theme's shadow colour token */
export function makeShadows(shadowColor: string): {
  button: ShadowStyle;
  card: ShadowStyle;
  cardHeavy: ShadowStyle;
  fab: ShadowStyle;
} {
  return {
    button: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 2,
    },
    card: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    cardHeavy: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 8,
    },
    fab: {
      shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 12,
    },
  };
}

// ── Hit-target floor ─────────────────────────────────────────────────────────

/** Minimum touch-target dimension (accessibility floor). */
export const HIT_TARGET = 44;
