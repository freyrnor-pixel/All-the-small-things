/**
 * BubbleMenu.tsx — spinning-wheel radial FAB for navigation.
 *
 * Floating action button on the home screen that opens into a spinnable ring of
 * bubbles. Only 3 bubbles are visible in the 90° viewing window at any time;
 * dragging the wheel spins it to reveal the rest. Labels resolve through `t.nav`
 * so the menu follows the user's language. Bubble colors follow the FeatureColors
 * warm-to-cool gradient (orange → blue).
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, store/useSettingsStore
 *   Used by → app/index.tsx
 *   Data    → none (presentational); reads colorTheme + leftHanded from useSettingsStore
 *
 * Edit notes:
 *   - To add a screen, append a BASE_ITEMS entry AND add a matching key under t.nav in lib/i18n.ts.
 *   - Wheel geometry (RADIUS / DRAG_SENSITIVITY) is tuned for 8 bubbles. STEP_ANGLE
 *     updates automatically from BASE_ITEMS.length.
 *   - Left-handed mode flips the FAB to bottom-left and shows bubbles in the upper-right arc.
 *   - All labels go through useT() — no hardcoded text.
 *   - Settings is not in the wheel; it lives as a persistent corner button in app/index.tsx.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Shadow, FeatureColors } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT, Translations } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type NavKey = keyof Translations['nav'];

type BubbleEntry = {
  icon: IoniconsName;
  label: string;
  route: string;
  color: string;
  onPress?: () => void;
};

type Props = {
  onNewTask?: () => void;
};

// Warm-to-cool gradient across the wheel: creation → focus → daily tracking → social.
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

const RADIUS = 130;
const FAB_SIZE = 60;
const BUBBLE_SIZE = 56;
const STEP_ANGLE = (2 * Math.PI) / BASE_ITEMS.length;  // 45° for 8 items

// Wheel canvas: large enough to contain the full arc in all directions.
// The FAB sits at the CENTRE of this canvas, so all translations radiate
// correctly from the FAB without any right/bottom positioning tricks.
const WHEEL_SIZE = RADIUS * 2 + BUBBLE_SIZE; // diameter + one bubble

const DRAG_SENSITIVITY = 120;      // px of drag per radian — lower = more responsive

const WINDOW_FADE = Math.PI / 4; // 45° — edge bubbles at 50% opacity, signal "drag for more"

// Returns 0–1 opacity based on signed angular distance from each window boundary.
// Works correctly for both right-handed [−π, −π/2] and left-handed [−π/2, 0] windows
// with no wrap-around discontinuity at ±π.
function windowOpacity(angle: number, winStart: number, winEnd: number): number {
  'worklet';
  const twoPi = 2 * Math.PI;
  const wF = Math.PI / 4;
  // Signed angular distance from each boundary: positive = past it, negative = before it.
  const dS = ((angle - winStart + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  const dE = ((angle - winEnd   + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (dS < -wF || dE > wF) return 0;
  if (dS <  wF) return (dS + wF) / (2 * wF); // ramp 0→1 across start fade zone
  if (dE > -wF) return (wF - dE) / (2 * wF); // ramp 1→0 across end fade zone
  return 1;
}

// ─── Per-bubble sub-component ────────────────────────────────────────────────

type BubbleItemViewProps = {
  item: BubbleEntry;
  baseAngle: number;
  wheelAngle: SharedValue<number>;
  openProgress: SharedValue<number>;
  windowStart: number;
  windowEnd: number;
  onPress: () => void;
  pointerEvents: 'auto' | 'none';
};

function BubbleItemView({
  item,
  baseAngle,
  wheelAngle,
  openProgress,
  windowStart,
  windowEnd,
  onPress,
  pointerEvents,
}: BubbleItemViewProps) {
  const pressAnim = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => {
    const currentAngle = baseAngle + wheelAngle.value;
    const op = openProgress.value;
    const x = Math.cos(currentAngle) * RADIUS * op;
    const y = Math.sin(currentAngle) * RADIUS * op;
    const scale = (0.3 + 0.7 * op) * pressAnim.value;
    const opacity = windowOpacity(currentAngle, windowStart, windowEnd) * op;
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity,
    };
  });

  function handlePressIn() {
    pressAnim.value = withTiming(0.94, { duration: 60 });
  }
  function handlePressOut() {
    pressAnim.value = withSpring(1, { damping: 40, stiffness: 500 });
  }

  return (
    <Animated.View
      style={[styles.bubble, { backgroundColor: item.color }, animStyle]}
      pointerEvents={pointerEvents}
    >
      <Pressable
        style={styles.bubbleInner}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Ionicons name={item.icon} size={22} color="#fff" />
        <Text style={styles.bubbleLabel}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BubbleMenu({ onNewTask }: Props) {
  const [open, setOpen] = useState(false);
  const { leftHanded } = useSettingsStore();

  // Right-handed: window from left (−π) to up (−π/2); item 0 starts at left edge.
  // Left-handed:  window from up (−π/2) to right (0);  item 0 starts at center (−π/4).
  const windowStart = leftHanded ? -Math.PI / 2 : -Math.PI;
  const windowEnd   = leftHanded ? 0             : -Math.PI / 2;

  const wheelAngle   = useSharedValue(-Math.PI);
  const openProgress = useSharedValue(0);
  const startAngle   = useSharedValue(0);

  // Reset wheel position to match the new window when handedness changes.
  useEffect(() => {
    wheelAngle.value = leftHanded ? -Math.PI / 4 : -Math.PI;
  }, [leftHanded]);

  const router = useRouter();
  const theme = useAppTheme();
  const t = useT();

  const items = useMemo((): BubbleEntry[] =>
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
    openProgress.value = withSpring(toValue, { damping: 25, stiffness: 320 });
    setOpen((v) => !v);
  }

  function navigate(item: BubbleEntry) {
    toggle();
    const action = item.onPress ?? (() => router.push(item.route as never));
    setTimeout(action, 150);
  }

  // Spin gesture: dragging up rotates the wheel counterclockwise, revealing items
  // further along the circle. Releases snap to the nearest item slot in ~175ms.
  const spinGesture = Gesture.Pan()
    .onStart(() => {
      startAngle.value = wheelAngle.value;
    })
    .onUpdate((e) => {
      wheelAngle.value = startAngle.value - e.translationY / DRAG_SENSITIVITY;
    })
    .onEnd((e) => {
      const projected = wheelAngle.value - (e.velocityY / DRAG_SENSITIVITY) * 0.12;
      const snapped = Math.round(projected / STEP_ANGLE) * STEP_ANGLE;
      wheelAngle.value = withSpring(snapped, { damping: 35, stiffness: 500 });
    });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: `${interpolate(openProgress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg`,
    }],
  }));

  const sideStyle = leftHanded ? { left: 24 } : { right: 24 };

  return (
    <View style={[styles.container, sideStyle]} pointerEvents="box-none">
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
      )}

      <GestureDetector gesture={spinGesture}>
        <View style={styles.wheelArea} pointerEvents={open ? 'auto' : 'none'}>
          {items.map((item, i) => (
            <BubbleItemView
              key={item.route}
              item={item}
              baseAngle={i * STEP_ANGLE}
              wheelAngle={wheelAngle}
              openProgress={openProgress}
              windowStart={windowStart}
              windowEnd={windowEnd}
              onPress={() => navigate(item)}
              pointerEvents={open ? 'auto' : 'none'}
            />
          ))}
        </View>
      </GestureDetector>

      <Pressable style={[styles.fab, { backgroundColor: theme.orange }]} onPress={toggle}>
        <Animated.View style={fabStyle}>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelArea: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    // Centre this canvas on the FAB. FAB centre = centre of the 60×60 container.
    // Canvas top-left = FAB_centre - WHEEL_SIZE/2 = 30 - (WHEEL_SIZE/2).
    left: FAB_SIZE / 2 - WHEEL_SIZE / 2,
    top: FAB_SIZE / 2 - WHEEL_SIZE / 2,
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
    // Place bubble centre at the wheelArea centre (= FAB centre).
    // left/top of the bubble = WHEEL_SIZE/2 - BUBBLE_SIZE/2 = RADIUS.
    // translateX/Y then offset it to the arc position around the FAB.
    left: RADIUS,
    top: RADIUS,
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
