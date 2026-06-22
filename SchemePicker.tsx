/**
 * UnFocus — SchemePicker
 *
 * Five colour-scheme swatches. Each is a 54×54 circle with the scheme's own
 * gradient-wave colour, a thematic Ionicon, and a label below.
 * Selected swatch: 3px primary border + scale 1.07 + heavy shadow.
 *
 * Shared between Onboarding and Settings screens.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/components/ThemeProvider';
import { SCHEMES, SchemeName } from '@/constants/colors';
import { FontFamily, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

const SCHEME_META: Array<{
  key:   SchemeName;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'default', label: 'Default',     icon: 'water-outline'  },
  { key: 'tech',    label: 'Tech',        icon: 'flash-outline'  },
  { key: 'nature',  label: 'Nature',      icon: 'leaf-outline'   },
  { key: 'fluffy',  label: 'Fluffy pink', icon: 'flower-outline' },
  { key: 'gothic',  label: 'Gothic',      icon: 'moon-outline'   },
];

interface SchemePickerProps {
  value:    SchemeName;
  onChange: (s: SchemeName) => void;
}

export function SchemePicker({ value, onChange }: SchemePickerProps) {
  const { colors, shadows } = useTheme();

  return (
    <View style={styles.row}>
      {SCHEME_META.map(s => {
        const active   = s.key === value;
        const palette  = SCHEMES[s.key].light;
        // wave gradient for this scheme's swatch
        const wave: [string, string, string, string] = [
          palette.featureTask,
          palette.featureHealth,
          palette.featureShared,
          palette.featureCapture,
        ];

        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            style={styles.item}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${s.label} colour scheme`}
          >
            <View style={[
              styles.dotWrap,
              active && {
                borderColor:  colors.primary,
                borderWidth:  3,
                transform:    [{ scale: 1.07 }],
                ...shadows.cardHeavy,
              },
              !active && {
                borderColor: colors.borderCard,
                borderWidth: 2,
                ...shadows.button,
              },
            ]}>
              <LinearGradient
                colors={wave}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dot}
              >
                <Ionicons name={s.icon} size={24} color={palette.bubbleInk} />
              </LinearGradient>
            </View>
            <Text style={[styles.label, { color: colors.textBody }]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.s12,
  },
  item: {
    alignItems: 'center',
    gap: Spacing.s6,
  },
  dotWrap: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  dot: {
    width: 54,
    height: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.bold,
    fontSize:   10,
    includeFontPadding: false,
  },
});
