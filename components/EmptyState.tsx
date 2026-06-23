/**
 * EmptyState.tsx — illustrated empty-list placeholder.
 *
 * Renders the watercolor tree logo at reduced opacity with short helper text
 * below it. Used for any list/screen that can be legitimately empty (no
 * items yet, no search results, etc.) so it reads as "nothing here yet"
 * rather than a blank, possibly-broken screen.
 *
 * Connections:
 *   Imports → assets/android-icon-monochrome.png, constants/theme, lib/useAppTheme
 *   Used by → app/shopping.tsx, app/habits.tsx
 */
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { FontSize, Fonts, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

type Props = {
  text: string;
  size?: number;
};

export default function EmptyState({ text, size = 96 }: Props) {
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  return (
    <View style={styles.wrap}>
      <Image
        source={require('@/assets/android-icon-monochrome.png')}
        style={{ width: size, height: size, opacity: 0.5, tintColor: theme.textLight }}
        resizeMode="contain"
      />
      <Text style={[styles.text, { color: theme.textLight }]}>{text}</Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  text: {
    fontSize: FontSize.md,
    fontFamily: Fonts.semibold,
    textAlign: 'center',
  },
});
