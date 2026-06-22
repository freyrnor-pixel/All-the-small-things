/**
 * ProgressBar.tsx — flat themed progress track (e.g. tasks-done-today, habit streak fill).
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme
 *   Used by → any screen wanting a simple 0..1 progress indicator
 *   Data    → none (controlled by `value` prop)
 *
 * Edit notes:
 *   - `value` is clamped to [0, 1]; callers compute done/total themselves.
 */
import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

type Props = {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export default function ProgressBar({ value, color, trackColor, height = 8, style }: Props) {
  const theme = useAppTheme();
  const pct = Math.max(0, Math.min(1, value));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? theme.grayLight },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? theme.orange },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
