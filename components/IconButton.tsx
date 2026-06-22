/**
 * IconButton.tsx — icon-only tappable control with a guaranteed 44x44 hit target.
 *
 * Used for header actions, list-row affordances, and anywhere a Button would
 * be too heavy. Always pass `accessibilityLabel` — there's no visible text.
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme, components/PressableScale
 *   Used by → any screen wanting a standalone icon action
 *   Data    → none (purely presentational)
 *
 * Edit notes:
 *   - `size` controls the icon glyph size; the touch target stays >=44px regardless.
 */
import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';

const HIT_TARGET = 44;

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
  size?: number;
  color?: string;
  background?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 22,
  color,
  background,
  disabled,
  style,
}: Props) {
  const theme = useAppTheme();

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[
        styles.base,
        { backgroundColor: background ?? 'transparent', opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? theme.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
