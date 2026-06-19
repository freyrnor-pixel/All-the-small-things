/**
 * Surface.tsx — material-aware card surface, the general-purpose sibling of
 * BubbleMenu's bubble/FAB rendering.
 *
 * Wraps children in the same two-layer pattern (outer view carries border +
 * shadow, inner overflow:hidden mask carries fill + sheen) so any card can
 * pick up the user's chosen glass/metal/rock/paper/plain finish instead of a
 * flat fill — this is what makes "backgrounds and the material things are
 * made of" actually track the Settings → Material choice outside the bubble
 * menu. Drop-in replacement for `<View style={[styles.card, {backgroundColor:
 * theme.white}]}>` — pass the same `style` (radius/margin/padding all still
 * work; padding is automatically moved to the inner content so the sheen
 * still spans the full card).
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme, store/useSettingsStore
 *   Used by → app screens that render a "card" surface (see grep for `<Surface`)
 *   Data    → reads bubbleMaterial from useSettingsStore when `material` prop is omitted
 *
 * Edit notes:
 *   - `style` is split: padding keys move to the inner content view (so the
 *     sheen overlay isn't pushed inward), everything else (margin, width,
 *     flex, borderRadius...) stays on the outer shadow-casting view. Any
 *     backgroundColor, border colors/width, or shadow/elevation in `style`
 *     is intentionally dropped — those are owned by the material, not the caller.
 *   - shadowColor comes from the active theme's `shadow` token (not a fixed
 *     black), so depth itself shifts hue with the colour theme.
 *   - Pass `tint` for a non-default base (e.g. theme.offWhite for empty
 *     states, or an accent colour for a coloured card) — material shading is
 *     computed from this base.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { getMaterialStyle, MaterialName, Radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/store/useSettingsStore';

type Props = {
  material?: MaterialName;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

const PADDING_KEYS = new Set([
  'padding', 'paddingHorizontal', 'paddingVertical',
  'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingStart', 'paddingEnd',
]);

// Owned by the material, not the caller — silently dropped from any passed-in style.
const OWNED_KEYS = new Set([
  'backgroundColor', 'borderWidth', 'borderColor', 'borderTopColor', 'borderBottomColor',
  'borderLeftColor', 'borderRightColor', 'borderStyle',
  'shadowColor', 'shadowOpacity', 'shadowRadius', 'shadowOffset', 'elevation',
]);

export default function Surface({ material, tint, style, children }: Props) {
  const theme = useAppTheme();
  const settingsMaterial = useSettingsStore((s) => s.bubbleMaterial);
  const finish = material ?? settingsMaterial;
  const base = tint ?? theme.white;
  const mat = getMaterialStyle(base, finish);

  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const padding: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    if (PADDING_KEYS.has(key)) padding[key] = flat[key];
    else if (!OWNED_KEYS.has(key)) outer[key] = flat[key];
  }
  const radius = (flat.borderRadius as number | undefined) ?? Radius.md;

  return (
    <View
      style={[
        outer,
        {
          borderRadius: radius,
          borderWidth: mat.borderWidth,
          borderColor: mat.borderColor,
          borderTopColor: mat.borderTopColor,
          borderBottomColor: mat.borderBottomColor,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: mat.shadowOpacity,
          shadowRadius: mat.shadowRadius,
          elevation: mat.elevation,
        },
      ]}
    >
      <View style={[styles.mask, { borderRadius: radius, backgroundColor: mat.backgroundColor }]}>
        <View pointerEvents="none" style={[styles.sheenOuter, { backgroundColor: mat.sheenColor, opacity: 0.3, borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
        <View pointerEvents="none" style={[styles.sheenInner, { backgroundColor: mat.sheenColor, opacity: 0.55, borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
        <View style={padding}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mask: { overflow: 'hidden' },
  sheenOuter: { position: 'absolute', top: 0, left: 0, right: 0, height: 30 },
  sheenInner: { position: 'absolute', top: 0, left: 0, right: 0, height: 14 },
});
