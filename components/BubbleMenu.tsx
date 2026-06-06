import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Shadow, FontSize } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getTheme } from '@/constants/theme';

type BubbleItem = {
  icon: string;
  label: string;
  route: string;
  color: string;
};

const ITEMS: BubbleItem[] = [
  { icon: '➕', label: 'Ny opp.', route: '/task-form', color: '#F4A261' },
  { icon: '🛒', label: 'Handle', route: '/shopping', color: '#E8895A' },
  { icon: '🍽', label: 'Mat', route: '/meals', color: '#6BAA75' },
  { icon: '💚', label: 'Helse', route: '/health', color: '#7BC8A4' },
  { icon: '📷', label: 'Skann', route: '/scan', color: '#C49A6C' },
  { icon: '⚙️', label: 'Sett.', route: '/settings', color: '#9E9E9E' },
];

// Bubbles fan from pointing-left to pointing-straight-up (upper-left quadrant).
// All bubbles are in the upper-left relative to the FAB, so none go off-screen
// when the FAB is in the lower-right corner.
const RADIUS = 180;
const BUBBLE_SIZE = 56;
const START_ANGLE = -Math.PI;      // pointing left
const END_ANGLE = -Math.PI / 2;    // pointing straight up

export default function BubbleMenu() {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const theme = getTheme(colorTheme);

  function toggle() {
    const toValue = open ? 0 : 1;
    Animated.parallel([
      Animated.spring(anim, { toValue, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(rotation, { toValue, duration: 200, useNativeDriver: true }),
    ]).start();
    setOpen((v) => !v);
  }

  function navigate(route: string) {
    toggle();
    setTimeout(() => router.push(route as never), 150);
  }

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
      )}

      {ITEMS.map((item, i) => {
        const angle = START_ANGLE + (END_ANGLE - START_ANGLE) * (i / (ITEMS.length - 1));
        const x = Math.cos(angle) * RADIUS;
        const y = Math.sin(angle) * RADIUS;

        const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, x] });
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, y] });
        const opacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
        const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

        return (
          <Animated.View
            key={item.route}
            style={[
              styles.bubble,
              {
                backgroundColor: i === 0 ? theme.orange : item.color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            <Pressable style={styles.bubbleInner} onPress={() => navigate(item.route)}>
              <Text style={styles.bubbleIcon}>{item.icon}</Text>
              <Text style={styles.bubbleLabel}>{item.label}</Text>
            </Pressable>
          </Animated.View>
        );
      })}

      <Pressable style={[styles.fab, { backgroundColor: theme.orange }]} onPress={toggle}>
        <Animated.Text style={[styles.fabIcon, { transform: [{ rotate }] }]}>+</Animated.Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.fab,
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.white,
    lineHeight: 36,
    fontWeight: '300',
  },
  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  bubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  bubbleIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  bubbleLabel: {
    fontSize: 9,
    color: Colors.white,
    fontWeight: '700',
    textAlign: 'center',
  },
});
