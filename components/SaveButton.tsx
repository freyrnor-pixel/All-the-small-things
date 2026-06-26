/**
 * SaveButton.tsx — Inline save button that appears when an input becomes dirty.
 *
 * A small button that fades in (opacity 0→1, scale 0.92→1) over 150ms when the input
 * value changes. Positioned to the right of the input field. Used for text/number/time
 * inputs in settings.
 *
 * Connections:
 *   Imports → react-native-reanimated, constants/theme
 *   Used by → app/settings.tsx (name input, monthly date, monthly budget, reminder time)
 *   Data    → controlled via `visible`; fires `onPress` callback
 *
 * Edit notes:
 *   - Uses react-native-reanimated v4 (withTiming for opacity + scale)
 *   - Button is disabled when not visible (opacity < 1)
 *   - Accent background color (theme.orange or similar) with white text
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { AppColors, FontSize, Fonts } from '@/constants/theme';

export interface SaveButtonProps {
  visible: boolean;
  onPress: () => void;
  label?: string;
  theme?: AppColors;
}

const ANIMATION_DURATION = 150; // 150ms per spec

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SaveButton({
  visible,
  onPress,
  label = 'Lagre',
  theme,
}: SaveButtonProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
      scale.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
    } else {
      opacity.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
      scale.value = withTiming(0.92, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[
        styles.button,
        animatedStyle,
        { backgroundColor: theme?.orange ?? '#FF6B35' },
      ]}
      onPress={onPress}
      disabled={!visible}
      hitSlop={6}
    >
      <Text style={styles.text}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
