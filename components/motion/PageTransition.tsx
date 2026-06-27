/**
 * PageTransition.tsx — slide between screens with directional momentum.
 *
 * Wraps Expo Router's children to animate screen transitions. When screenKey changes,
 * the outgoing screen slides out (direction-specific) while the incoming screen
 * slides in from the opposite edge. Uses cubic-bezier easing (340ms) for a spring-like feel.
 *
 * Connections:
 *   Imports → react-native-reanimated, lib/useAppTheme
 *   Used by → app/_layout.tsx (wraps router outlet)
 *   Data    → none (pure animation wiring)
 *
 * Edit notes:
 *   - Direction: "left" = forward nav (new screen enters from right), "right" = back nav (enters from left).
 *   - screenKey must change to trigger animation (typically the current route pathname).
 *   - Respects reducedMotion: instant transition, no animation.
 *   - Cubic easing cubic-bezier(0.4, 0, 0.2, 1) matched to design system's motion.card.html.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useAccessibility } from '@/lib/useAppTheme';

const DURATION = 340;

type Direction = 'left' | 'right';

type ScreenState = {
  key: string;
  children: React.ReactNode;
  phase: 'enter' | 'entering' | 'exit' | 'stable';
};

type Props = {
  screenKey: string;
  children: React.ReactNode;
  direction?: Direction;
};

export default function PageTransition({
  screenKey,
  children,
  direction = 'left',
}: Props) {
  const { reducedMotion } = useAccessibility();
  const [screens, setScreens] = useState<ScreenState[]>([]);
  const prevKeyRef = useRef(screenKey);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (prevKeyRef.current === screenKey) {
      // Initial mount
      setScreens([{ key: screenKey, children, phase: 'stable' }]);
      return;
    }
    prevKeyRef.current = screenKey;

    // Stack: outgoing (exit) + incoming (enter)
    setScreens((prev) => {
      const outgoing =
        prev.length > 0 ? { ...prev[prev.length - 1], phase: 'exit' as const } : null;
      const incoming = { key: screenKey, children, phase: 'enter' as const };
      return outgoing ? [outgoing, incoming] : [incoming];
    });

    // Trigger enter animation after frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setScreens((prev) =>
          prev.map((s) =>
            s.phase === 'enter' ? { ...s, phase: 'entering' as const } : s
          )
        );
      });
    });

    // Cleanup after transition
    clearTimeout(timeoutRef.current);
    const delay = reducedMotion ? 0 : DURATION + 50;
    timeoutRef.current = setTimeout(() => {
      setScreens((prev) => [
        { ...prev[prev.length - 1], phase: 'stable' as const },
      ]);
    }, delay);

    return () => clearTimeout(timeoutRef.current);
  }, [screenKey, reducedMotion, children]);

  // Update children for stable screen
  useEffect(() => {
    setScreens((prev) =>
      prev.map((s) =>
        s.phase === 'stable' && s.key === screenKey
          ? { ...s, children }
          : s
      )
    );
  }, [children, screenKey]);

  return (
    <View style={styles.container}>
      {screens.map(({ key, children: sc, phase }) => (
        <ScreenWrapper
          key={key}
          phase={phase}
          direction={direction}
          duration={reducedMotion ? 0 : DURATION}
        >
          {sc}
        </ScreenWrapper>
      ))}
    </View>
  );
}

type ScreenWrapperProps = {
  phase: 'enter' | 'entering' | 'exit' | 'stable';
  direction: Direction;
  duration: number;
  children: React.ReactNode;
};

function ScreenWrapper({
  phase,
  direction,
  duration,
  children,
}: ScreenWrapperProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (phase === 'enter') {
      // Start from off-screen
      translateX.value = direction === 'left' ? 100 : -100;
    } else if (phase === 'entering') {
      // Animate to center
      translateX.value = withTiming(0, { duration });
    } else if (phase === 'exit') {
      // Animate out
      translateX.value = withTiming(direction === 'left' ? -100 : 100, { duration });
    } else if (phase === 'stable') {
      translateX.value = 0;
    }
  }, [phase, direction, duration]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value}%` }],
  }));

  const zIndex =
    phase === 'entering' || phase === 'enter' ? 10 : phase === 'exit' ? 5 : 1;

  return (
    <Animated.View
      style={[
        styles.screen,
        { zIndex },
        animStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  screen: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-start',
  },
});
