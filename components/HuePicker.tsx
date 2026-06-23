/**
 * HuePicker.tsx — single-row hue strip for the "Egendefinert" (custom) theme.
 *
 * The user picks ONE hue (0-360); saturation/lightness are fixed by
 * hueToCustomColors() in constants/theme.ts so every derived token stays
 * contrast-safe. The strip itself is built from plain colored View segments
 * (no native gradient dependency) with a draggable thumb on top.
 *
 * Connections:
 *   Imports → constants/theme
 *   Used by → app/settings.tsx (custom theme section)
 *   Data    → none (controlled: value/onChange only)
 */
import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { hslToHex } from '@/constants/theme';

type Props = {
  value: number;
  onChange: (hue: number) => void;
  height?: number;
};

const SEGMENTS = 36;

export default function HuePicker({ value, onChange, height = 36 }: Props) {
  const widthRef = useRef(0);

  const setFromX = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / w));
    onChange(Math.round(ratio * 360));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  const thumbLeftPct = (value / 360) * 100;

  return (
    <View style={[styles.wrap, { height }]} onLayout={onLayout} {...panResponder.panHandlers}>
      <View style={[styles.strip, { borderRadius: height / 2 }]}>
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: hslToHex(i / SEGMENTS, 0.65, 0.55) }]}
          />
        ))}
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            height: height + 8,
            width: height + 8,
            borderRadius: (height + 8) / 2,
            left: `${thumbLeftPct}%`,
            marginLeft: -(height + 8) / 2,
            marginTop: -(height + 8) / 2,
            backgroundColor: hslToHex(value / 360, 0.62, 0.5),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
  },
  strip: {
    flexDirection: 'row',
    overflow: 'hidden',
    height: '60%',
  },
  segment: {
    flex: 1,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});
