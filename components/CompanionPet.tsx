/**
 * CompanionPet.tsx — optional cosmetic companion shown on the home screen
 *
 * Renders the pet inside a themed habitat (bed, kennel, nest, den, or burrow)
 * that matches the chosen animal type. When `celebrating` is true it plays a
 * brief scale/bounce animation (skipped when reducedMotion is on — a static
 * happy face is shown instead). The pet NEVER shows a sad, hungry, or negative
 * state under any circumstances — positive reinforcement only.
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
 *   - Habitat shape/colours are fixed per pet type; petColor tints the border.
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

// Each entry describes the natural habitat the pet sits in.
// radius controls how round/square the container looks.
// floor is the small decorative emoji shown as the "ground" at the bottom.
const PET_HABITATS: Record<string, {
  bg: string;
  radius: number;
  floor: string;
  floorBg: string;
}> = {
  cat:   { bg: '#FFF4EE', radius: 32, floor: '🛋️', floorBg: '#FFE4D0' },
  dog:   { bg: '#FFFBF5', radius: 10, floor: '🏡', floorBg: '#FFE8C2' },
  bird:  { bg: '#EDFBF2', radius: 18, floor: '🪺', floorBg: '#C8EDCF' },
  fox:   { bg: '#FEF8F0', radius: 22, floor: '🍂', floorBg: '#FCDCB0' },
  bunny: { bg: '#FFF4FA', radius: 36, floor: '🌸', floorBg: '#F9D4EA' },
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
  const habitat = PET_HABITATS[petType] ?? PET_HABITATS.cat;
  const emoji = celebrating ? emojis.happy : emojis.idle;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.habitat,
          {
            backgroundColor: habitat.bg,
            borderRadius: habitat.radius,
            borderColor: petColor,
          },
        ]}
      >
        <Animated.Text style={[styles.emoji, { transform: [{ scale }] }]}>
          {emoji}
        </Animated.Text>
        {/* Floor strip — habitat context */}
        <View style={[styles.floor, { backgroundColor: habitat.floorBg }]}>
          <Text style={styles.floorEmoji}>{habitat.floor}</Text>
        </View>
      </View>
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
    gap: 4,
  },
  habitat: {
    width: 78,
    height: 86,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 4,
    paddingBottom: 0,
  },
  emoji: {
    fontSize: 38,
    lineHeight: 46,
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorEmoji: {
    fontSize: 15,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 84,
    textAlign: 'center',
  },
});
