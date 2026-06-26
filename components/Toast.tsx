/**
 * Toast.tsx — Toast notification component for save feedback.
 *
 * A small pill that animates in at the top of a scroll container with a checkmark
 * icon and message text. Auto-dismisses after 2s. Only one toast visible at a time;
 * resetting the timer if a new save fires before dismiss.
 *
 * Connections:
 *   Imports → react-native-reanimated, lib/useAppTheme
 *   Used by → app/settings.tsx (and any other screen needing save feedback)
 *   Data    → controlled via `visible` + `onDismiss`; renders `message`
 *
 * Edit notes:
 *   - Uses react-native-reanimated v4 (withTiming for opacity + translateY)
 *   - Message examples: "Lagret", "Navn lagret", "Tema lagret", "Jobb-modus på"
 *   - Appears at the top of the scroll content (parent is responsible for positioning)
 *   - Dark semi-transparent background with blur for modern feel
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { AppColors } from '@/constants/theme';

export interface ToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  theme?: AppColors;
}

const TOAST_DURATION = 2000; // 2 seconds
const ANIMATION_DURATION = 180; // 180ms enter/exit

export function Toast({ visible, message, onDismiss, theme }: ToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Animate in
      opacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });
      translateY.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.ease,
      });

      // Schedule dismiss
      timeoutRef.current = setTimeout(() => {
        opacity.value = withTiming(0, {
          duration: ANIMATION_DURATION,
          easing: Easing.ease,
        });
        translateY.value = withTiming(-8, {
          duration: ANIMATION_DURATION,
          easing: Easing.ease,
        });
        setTimeout(() => runOnJS(onDismiss)(), ANIMATION_DURATION);
      }, TOAST_DURATION);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible, message]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View
        style={[
          styles.toast,
          { backgroundColor: 'rgba(30, 30, 32, 0.88)' },
        ]}
      >
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ADE80', // green checkmark
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
