/**
 * GradientSwatch.tsx — fake radial/conic "gradient" circles built from concentric Views.
 *
 * No native gradient dependency is installed (expo-linear-gradient / react-native-svg),
 * so radial and conic gradients are approximated the same way ScreenBackground.tsx fakes
 * blur: several overlapping circles of decreasing size and shifting opacity/tint layered
 * on top of each other.
 *
 * Connections:
 *   Imports → constants/theme
 *   Used by → app/settings.tsx (colour-theme swatches + custom hue picker)
 *   Data    → none (pure rendering, colors passed in as props)
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { mix } from '@/constants/theme';

type RadialProps = {
  color: string;
  size: number;
};

/** Light-center → saturated-edge radial fake, e.g. for a single accent color theme swatch. */
export function RadialSwatch({ color, size }: RadialProps) {
  const rings = [
    { scale: 1, c: color },
    { scale: 0.75, c: mix(color, '#FFFFFF', 0.25) },
    { scale: 0.5, c: mix(color, '#FFFFFF', 0.5) },
    { scale: 0.25, c: mix(color, '#FFFFFF', 0.75) },
  ];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      {rings.map((r, i) => {
        const s = size * r.scale;
        return (
          <View
            key={i}
            style={[
              styles.ring,
              {
                width: s,
                height: s,
                borderRadius: s / 2,
                backgroundColor: r.c,
                top: (size - s) / 2,
                left: (size - s) / 2,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

type ConicProps = {
  size: number;
  /** Color stops sampled around the wheel, evenly spaced (e.g. 12-24 hue steps). */
  colors: string[];
};

/** Conic/rainbow-wheel fake — a ring of thin wedge-like Views rotated around the center. */
export function ConicSwatch({ size, colors }: ConicProps) {
  const n = colors.length;
  const wedgeWidth = (Math.PI * size) / n + 1;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      {colors.map((c, i) => {
        const angle = (360 / n) * i;
        return (
          <View
            key={i}
            style={[
              styles.wedge,
              {
                width: wedgeWidth,
                height: size / 2,
                backgroundColor: c,
                left: size / 2 - wedgeWidth / 2,
                top: 0,
                transform: [{ translateY: size / 2 }, { rotate: `${angle}deg` }, { translateY: -size / 2 }],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.core,
          {
            width: size * 0.35,
            height: size * 0.35,
            borderRadius: (size * 0.35) / 2,
            top: size * 0.325,
            left: size * 0.325,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
  },
  wedge: {
    position: 'absolute',
  },
  core: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    opacity: 0.15,
  },
});
