/**
 * CompanionPet.tsx — optional cosmetic companion shown on the home screen
 *
 * Renders an 80×80 emoji-based pet in its idle state. When `celebrating` is true
 * it plays a brief scale/bounce animation (skipped when reducedMotion is on —
 * a static happy face is shown instead). The pet NEVER shows a sad, hungry, or
 * negative state under any circumstances — positive reinforcement only.
 *
 * Connections:
 *   Imports → lib/i18n, lib/useAppTheme, store/useSettingsStore
 *   Used by → app/index.tsx
 *   Data    → reads petName, petType, petColor from useSettingsStore
 *
 * Edit notes:
 *   - No DB state of its own — purely driven by settings fields.
 *   - Celebration animation: scale 1 → 1.3 → 1, duration 300 ms total.
 *   - If reducedMotion, celebration = static happy emoji, no animation.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAccessibility } from '@/lib/useAppTheme';

const PET_EMOJIS: Record<string, { idle: string; happy: string }> = {
  cat:   { idle: '🐱', happy: '😸' },
  dog:   { idle: '🐶', happy: '🐕' },
  bird:  { idle: '🐦', happy: '🦜' },
  fox:   { idle: '🦊', happy: '🦊' },
  bunny: { idle: '🐰', happy: '🐇' },
};

type Props = {
  celebrating?: boolean;
};

export default function CompanionPet({ celebrating = false }: Props) {
  const petType = useSettingsStore((s) => s.petType);
  const petName = useSettingsStore((s) => s.petName);
  const petColor = useSettingsStore((s) => s.petColor);
  const { reducedMotion } = useAccessibility();

  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!celebrating || reducedMotion) {
      scale.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [celebrating, reducedMotion]);

  const emojis = PET_EMOJIS[petType] ?? PET_EMOJIS.cat;
  const emoji = celebrating ? emojis.happy : emojis.idle;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.bubble,
          { backgroundColor: petColor + '33' }, // 20% opacity tint
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>
      {petName ? (
        <Text style={[styles.name, { color: petColor }]} numberOfLines={1}>
          {petName}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 2,
  },
  bubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 42,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
    textAlign: 'center',
  },
});
