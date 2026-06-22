/**
 * Button.tsx — primary/secondary/danger/ghost action button.
 *
 * Thin wrapper around PressableScale that resolves its fill/border/text colour
 * from the active AppColors palette, so it re-skins automatically with the
 * user's colour theme and dark mode. No copy is baked in — callers pass
 * already-localized text via useT().
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme, components/PressableScale
 *   Used by → any screen wanting a standard action button
 *   Data    → none (purely presentational)
 *
 * Edit notes:
 *   - Minimum touch target is 44px tall regardless of size variant.
 *   - `loading` shows an ActivityIndicator in place of the label/icon.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZE_HEIGHT: Record<Size, number> = { sm: 44, md: 48, lg: 56 };
const SIZE_FONT: Record<Size, number> = { sm: FontSize.sm, md: FontSize.md, lg: FontSize.lg };

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  style,
}: Props) {
  const theme = useAppTheme();

  const fill =
    variant === 'primary' ? theme.orange :
    variant === 'danger' ? theme.danger :
    'transparent';

  const textColor =
    variant === 'primary' ? theme.white :
    variant === 'danger' ? theme.white :
    theme.orange;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          height: SIZE_HEIGHT[size],
          backgroundColor: fill,
          borderColor: theme.orange,
          borderWidth: variant === 'secondary' ? 2 : 0,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={SIZE_FONT[size] + 2} color={textColor} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: textColor, fontSize: SIZE_FONT[size] }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.semibold,
  },
});
