/**
 * BubbleMenu.tsx — radial FAB that fans out navigation bubbles.
 *
 * Floating action button on the home screen that animates open into an arc of
 * bubbles linking to the app's main screens. Labels resolve through `t.nav` so
 * the menu follows the user's language. Bubble colors follow the FeatureColors
 * warm-to-cool gradient (orange → blue across the arc).
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, store/useSettingsStore
 *   Used by → app/index.tsx
 *   Data    → none (presentational); reads colorTheme from useSettingsStore for theming
 *
 * Edit notes:
 *   - To add a screen, append a BASE_ITEMS entry AND add a matching key under t.nav in lib/i18n.ts.
 *   - RADIUS is 300 so 8 bubbles fit across the 90° arc (-π to -π/2). END_ANGLE must stay at -π/2 (straight up) — going past it pushes bubbles off the right edge since the FAB is near the screen edge.
 *   - All labels go through useT() — no hardcoded text.
 *   - Settings is not in the arc; it lives as a persistent corner button in app/index.tsx.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Shadow, FeatureColors } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT, Translations } from '@/lib/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type NavKey = keyof Translations['nav'];

type BubbleItem = {
  icon: IoniconsName;
  label: string;
  route: string;
  color: string;
  onPress?: () => void;
};

type Props = {
  onNewTask?: () => void;
};

// Warm-to-cool gradient across the arc: creation → focus → daily tracking → social.
const BASE_ITEMS: { icon: IoniconsName; labelKey: NavKey; route: string; color: string }[] = [
  { icon: 'add-outline',        labelKey: 'newTask', route: '/task-form', color: FeatureColors.task },
  { icon: 'flash-outline',      labelKey: 'focus',   route: '/focus',     color: '#E8934A' },
  { icon: 'camera-outline',     labelKey: 'scan',    route: '/scan',      color: FeatureColors.scan },
  { icon: 'leaf-outline',       labelKey: 'habits',  route: '/habits',    color: FeatureColors.habits },
  { icon: 'heart-outline',      labelKey: 'health',  route: '/health',    color: FeatureColors.health },
  { icon: 'restaurant-outline', labelKey: 'meals',   route: '/meals',     color: FeatureColors.meals },
  { icon: 'cart-outline',       labelKey: 'shop',    route: '/shopping',  color: FeatureColors.shop },
  { icon: 'link-outline',       labelKey: 'shared',  route: '/shared',    color: FeatureColors.shared },
];

// Radius bumped to 300 to space 8 bubbles across the same 90° arc without overlap.
// END_ANGLE stays at -π/2 (straight up); going past that into positive-x pushes bubbles
// off the right edge because the FAB is already near the screen edge.
const RADIUS = 300;
const BUBBLE_SIZE = 56;
const START_ANGLE = -Math.PI;      // pointing left
const END_ANGLE = -Math.PI / 2;    // pointing straight up

export default function BubbleMenu({ onNewTask }: Props) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  // pressAnims length matches BASE_ITEMS — one per bubble.
  const pressAnims = useRef(BASE_ITEMS.map(() => new Animated.Value(1))).current;
  const router = useRouter();
  const theme = useAppTheme();
  const t = useT();

  const items = useMemo((): BubbleItem[] =>
    BASE_ITEMS.map((item) => ({
      icon: item.icon,
      label: t.nav[item.labelKey],
      route: item.route,
      color: item.color,
      onPress: item.route === '/task-form' && onNewTask ? onNewTask : undefined,
    })),
    [onNewTask, t]
  );

  function toggle() {
    const toValue = open ? 0 : 1;
    Animated.parallel([
      Animated.spring(anim, { toValue, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(rotation, { toValue, duration: 200, useNativeDriver: true }),
    ]).start();
    setOpen((v) => !v);
  }

  function navigate(item: BubbleItem) {
    toggle();
    const action = item.onPress ?? (() => router.push(item.route as never));
    setTimeout(action, 150);
  }

  function pressIn(i: number) {
    Animated.spring(pressAnims[i], {
      toValue: 0.88, useNativeDriver: true, tension: 150, friction: 8,
    }).start();
  }

  function pressOut(i: number) {
    Animated.spring(pressAnims[i], {
      toValue: 1, useNativeDriver: true, tension: 150, friction: 8,
    }).start();
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

      {items.map((item, i) => {
        const angle = START_ANGLE + (END_ANGLE - START_ANGLE) * (i / (BASE_ITEMS.length - 1));
        const x = Math.cos(angle) * RADIUS;
        const y = Math.sin(angle) * RADIUS;

        const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, x] });
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, y] });
        const opacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
        const fanScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
        const combinedScale = Animated.multiply(fanScale, pressAnims[i]);

        return (
          <Animated.View
            key={item.route}
            style={[
              styles.bubble,
              {
                backgroundColor: item.color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale: combinedScale }],
              },
            ]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            <Pressable
              style={styles.bubbleInner}
              onPress={() => navigate(item)}
              onPressIn={() => pressIn(i)}
              onPressOut={() => pressOut(i)}
            >
              <Ionicons name={item.icon} size={22} color="#fff" />
              <Text style={styles.bubbleLabel}>{item.label}</Text>
            </Pressable>
          </Animated.View>
        );
      })}

      <Pressable style={[styles.fab, { backgroundColor: theme.orange }]} onPress={toggle}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="add" size={28} color="#fff" />
        </Animated.View>
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
    gap: 2,
  },
  bubbleLabel: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '700',
    textAlign: 'center',
  },
});
