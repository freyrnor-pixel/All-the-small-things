/**
 * UnFocus — IconButton
 *
 * 44×44 px touch target with a single Ionicon. Optional soft tinted background.
 * Scales 0.93× on press (haptic feedback is handled by the caller via expo-haptics).
 *
 * Usage:
 *   <IconButton icon="star-outline" onPress={toggleFocus} />
 *   <IconButton icon="checkmark" tint={colors.successSoft} color={colors.success} onPress={done} />
 */

import React, { useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/components/ThemeProvider';
import { Radius, HIT_TARGET } from '@/constants/theme';

interface IconButtonProps {
  icon:      keyof typeof Ionicons.glyphMap;
  label:     string;                 // accessibility label
  size?:     number;                 // icon size px, default 22
  color?:    string;                 // icon colour, defaults to colors.textBody
  tint?:     string;                 // background tint, default surfaceChip
  active?:   boolean;                // if true, use primarySoft bg + primary color
  disabled?: boolean;
  onPress?:  () => void;
}

export function IconButton({
  icon,
  label,
  size     = 22,
  color,
  tint,
  active   = false,
  disabled = false,
  onPress,
}: IconButtonProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();

  const bg    = active ? colors.primarySoft : (tint ?? colors.surfaceChip);
  const icCol = active ? colors.primary    : (color ?? colors.textBody);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={!disabled ? onPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Ionicons name={icon} size={size} color={icCol} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width:          HIT_TARGET,
    height:         HIT_TARGET,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
