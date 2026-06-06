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

type BubbleItem = {
  label: string;
  icon: string;
  route: string;
  color: string;
};

const ITEMS: BubbleItem[] = [
  { label: 'Handleliste', icon: '🛒', route: '/shopping', color: Colors.orange },
  { label: 'Matretter', icon: '🍽', route: '/meals', color: Colors.green },
  { label: 'Helse', icon: '💚', route: '/health', color: '#7BC8A4' },
  { label: 'Skann', icon: '📷', route: '/scan', color: Colors.brownLight },
  { label: 'Innstillinger', icon: '⚙️', route: '/settings', color: Colors.gray },
];

const RADIUS = 110;

export default function BubbleMenu() {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const router = useRouter();

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
      {/* Backdrop */}
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
      )}

      {/* Bubble items */}
      {ITEMS.map((item, i) => {
        const angle = (Math.PI / (ITEMS.length - 1)) * i - Math.PI;
        const x = Math.cos(angle) * RADIUS;
        const y = Math.sin(angle) * RADIUS;

        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, x],
        });
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, y],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
        });
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });

        return (
          <Animated.View
            key={item.route}
            style={[
              styles.bubble,
              {
                backgroundColor: item.color,
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

      {/* FAB */}
      <Pressable style={styles.fab} onPress={toggle}>
        <Animated.Text style={[styles.fabIcon, { transform: [{ rotate }] }]}>
          +
        </Animated.Text>
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
    backgroundColor: Colors.orange,
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
    width: 66,
    height: 66,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  bubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  bubbleLabel: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },
});
