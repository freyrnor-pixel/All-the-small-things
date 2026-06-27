/**
 * HomeHeroBackground.tsx — ambient hero backdrop for the home screen, behind TreeWatermark.
 *
 * Theme-adaptive: "Serene Mist" (light) is a soft blue-sky gradient with a
 * glowing orb halo and faint brush-flow sweeps radiating from the tree's
 * trunk; "Deep Focus" (dark) is the same structure on a navy sky with
 * pulsing rings added around the orb. Both have a sparse field of ink dots
 * that rise and fade, and a ground fade at the bottom so list content stays
 * legible. Built entirely from Views/Animated (no react-native-svg or
 * expo-linear-gradient) to avoid requiring a new native build.
 *
 * Connections:
 *   Imports → lib/useAppTheme (useIsDark)
 *   Used by → app/index.tsx, replacing ScreenBackground on the home screen
 *
 * Edit notes:
 *   - Render as the first child inside the SafeAreaView, same contract as
 *     ScreenBackground: absolutely positioned, pointerEvents="none".
 *   - Gradient bands are 3 stacked flat-color Views (not a real blend) —
 *     intentional, keeps this dependency-free.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useIsDark } from '@/lib/useAppTheme';

type Percent = `${number}%`;

type DotSpec = { size: number; left: Percent; bottom: Percent; duration: number; delay: number };

const DOTS: DotSpec[] = [
  { size: 4, left: '26%', bottom: '42%', duration: 7000, delay: 0 },
  { size: 3, left: '65%', bottom: '46%', duration: 9000, delay: 1500 },
  { size: 3, left: '18%', bottom: '52%', duration: 8000, delay: 3000 },
  { size: 4, left: '76%', bottom: '38%', duration: 7500, delay: 800 },
  { size: 2, left: '42%', bottom: '58%', duration: 10000, delay: 2200 },
  { size: 3, left: '80%', bottom: '55%', duration: 8500, delay: 4000 },
];

function RisingDot({ spec, color }: { spec: DotSpec; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: spec.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, spec.delay, spec.duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -160] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.88, 1],
    outputRange: [0, 1, 0.4, 0],
  });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: spec.size,
          height: spec.size,
          left: spec.left,
          bottom: spec.bottom,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

function PulseRing({ delay }: { delay: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, { toValue: 1, duration: 5000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, delay]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.15] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return <Animated.View style={[styles.ring, { transform: [{ scale }], opacity }]} />;
}

function FlowSweep({ rotate, width, strokeWidth, color, opacity, top }: {
  rotate: string; width: number; strokeWidth: number; color: string; opacity: number; top: Percent;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        top,
        left: '50%',
        width,
        height: strokeWidth,
        marginLeft: -width / 2,
        borderRadius: strokeWidth / 2,
        backgroundColor: color,
        opacity,
        transform: [{ rotate }],
      }}
    />
  );
}

export default function HomeHeroBackground() {
  const isDark = useIsDark();

  const palette = isDark
    ? {
        sky: ['#0d1f3e', '#112449', '#162e56'],
        orb: 'rgba(70,130,240,0.13)',
        orbBorder: 'rgba(100,160,255,0.12)',
        flowMain: '#6AAAF8',
        flowSoft: '#90C0FF',
        flowWide: '#4878D0',
        dot: '#7ab0ff',
        ground: 'rgba(11,22,46,0.85)',
      }
    : {
        sky: ['#e4f0fb', '#eef6ff', '#f6faff'],
        orb: 'rgba(215,236,255,0.55)',
        orbBorder: 'rgba(160,210,255,0.18)',
        flowMain: '#4080D0',
        flowSoft: '#6AA0E0',
        flowWide: '#90C0F0',
        dot: '#3B72D6',
        ground: 'rgba(238,246,255,0.85)',
      };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.skyBand, { backgroundColor: palette.sky[0] }]} />
      <View style={[styles.skyBand, { backgroundColor: palette.sky[1] }]} />
      <View style={[styles.skyBand, { backgroundColor: palette.sky[2] }]} />

      <View style={[styles.orb, { backgroundColor: palette.orb, borderColor: palette.orbBorder }]} />
      {isDark && (
        <>
          <PulseRing delay={0} />
          <PulseRing delay={1660} />
          <PulseRing delay={3330} />
        </>
      )}

      <FlowSweep rotate="-12deg" width={180} strokeWidth={22} color={palette.flowMain} opacity={0.28} top="62%" />
      <FlowSweep rotate="14deg" width={170} strokeWidth={22} color={palette.flowMain} opacity={0.28} top="60%" />
      <FlowSweep rotate="-6deg" width={150} strokeWidth={14} color={palette.flowSoft} opacity={0.2} top="65%" />
      <FlowSweep rotate="8deg" width={150} strokeWidth={14} color={palette.flowSoft} opacity={0.2} top="64%" />
      <FlowSweep rotate="0deg" width={260} strokeWidth={32} color={palette.flowWide} opacity={0.18} top="70%" />

      {DOTS.map((spec, i) => (
        <RisingDot key={i} spec={spec} color={palette.dot} />
      ))}

      <View style={[styles.groundFade, { backgroundColor: palette.ground }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  skyBand: { flex: 1 },
  orb: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 280,
    height: 280,
    marginLeft: -140,
    marginTop: -140,
    borderRadius: 140,
    borderWidth: 1,
  },
  ring: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 220,
    height: 220,
    marginLeft: -110,
    marginTop: -110,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(110,165,255,0.14)',
  },
  dot: {
    position: 'absolute',
    borderRadius: 50,
  },
  groundFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
});
