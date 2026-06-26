/**
 * SticklySaveBar.tsx — Sticky bottom save bar for day-pill groups.
 *
 * Animates up from the bottom (translateY 100%→0) over 200ms when any pill in a group
 * is toggled. Contains a label ("Dagene er ikke lagret"), an "Angre" button to revert
 * changes, and a "Lagre" button to confirm. Position is sticky within a scroll container.
 *
 * Connections:
 *   Imports → react-native-reanimated, constants/theme
 *   Used by → app/settings.tsx (work days, reset days)
 *   Data    → controlled via `visible`; fires `onSave` and `onRevert` callbacks
 *
 * Edit notes:
 *   - Uses react-native-reanimated v4 (withTiming for translateY + opacity)
 *   - Appears at bottom of scrollable content (parent handles positioning)
 *   - Label text is muted (secondary color)
 *   - "Angre" is ghost button (no background); "Lagre" is accent-filled
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { AppColors } from '@/constants/theme';

export interface StickySaveBarProps {
  visible: boolean;
  onSave: () => void;
  onRevert: () => void;
  label?: string;
  theme?: AppColors;
}

const ANIMATION_DURATION = 200; // 200ms per spec

const AnimatedView = Animated.createAnimatedComponent(View);

export function SticklySaveBar({
  visible,
  onSave,
  onRevert,
  label = 'Dagene er ikke lagret',
  theme,
}: StickySaveBarProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
      opacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
    } else {
      translateY.value = withTiming(100, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
      opacity.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <AnimatedView
      style={[
        styles.bar,
        animatedStyle,
        { backgroundColor: theme?.offWhite ?? '#F5F5F5' },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text
        style={[
          styles.label,
          { color: theme?.textLight ?? '#999999' },
        ]}
      >
        {label}
      </Text>
      <Pressable
        style={styles.ghostButton}
        onPress={onRevert}
        hitSlop={6}
      >
        <Text style={[styles.ghostText, { color: theme?.textLight ?? '#999999' }]}>
          Angre
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.primaryButton,
          { backgroundColor: theme?.orange ?? '#FF6B35' },
        ]}
        onPress={onSave}
        hitSlop={6}
      >
        <Text style={styles.primaryText}>Lagre</Text>
      </Pressable>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E0D8',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },
  ghostButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
