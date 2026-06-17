/**
 * BubbleMenu.tsx — spinning-wheel radial FAB for navigation.
 *
 * Floating action button that opens into a spinnable arc of bubbles. The arc
 * shows 3 full + 2 half-visible bubbles at any time (wider than the old 90°
 * window). Dragging the wheel rotates it through a clamped range (4 × 45° = π),
 * reaching all 8 items without a full 360° spin. Release snaps with a lottery-
 * wheel feel: a short ease-out coast before the spring settles.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/haptics, store/useSettingsStore
 *   Used by → app/index.tsx
 *   Data    → none (presentational); reads colorTheme + leftHanded from useSettingsStore
 *
 * Edit notes:
 *   - To add a screen, append a BASE_ITEMS entry AND add a matching key under t.nav in lib/i18n.ts.
 *   - Wheel geometry (RADIUS / DRAG_SENSITIVITY) is tuned for 8 bubbles. STEP_ANGLE updates from BASE_ITEMS.length.
 *   - Left-handed mode flips the FAB to bottom-left and shows bubbles in the upper-right arc.
 *   - All labels go through useT() — no hardcoded text.
 *   - Closed-state FAB shows the tree logo (assets/android-icon-monochrome.png), tinted via
 *     contrastOn(theme.orange) so it stays readable against any theme's accent color, including
 *     arbitrary custom-theme colors — don't replace this with a hardcoded white/dark tint.
 *   - Open-state FAB renders Ionicons "close" (an already-correct ×) with no rotation transform —
 *     a prior version rotated it 45° (a leftover trick for morphing a "+" glyph into an "×"), which
 *     instead turns this × back into a "+". Don't reintroduce that rotation.
 *   - HIGH MERGE-CONFLICT RISK: this file has a documented history of parallel claude/* branches
 *     independently rewriting it (two competing redesigns were merged via 96891b4 and 9b02162,
 *     and a careless merge would have let the older variant silently win). When merging or
 *     rebasing branches that touch this file, diff the FULL file against the target branch by
 *     hand — do not trust automatic conflict resolution or accept "ours"/"theirs" wholesale.
 *     Confirm the resulting BASE_ITEMS, wheel geometry, and rendering logic actually match the
 *     most recently intended design before pushing.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
  withSequence,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Shadow, FeatureColors, contrastOn } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT, Translations } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';
import { tap } from '@/lib/haptics';

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

const BASE_ITEMS: { icon: IoniconsName; labelKey: NavKey; route: string; color: string }[] = [
  { icon: 'add-outline',        labelKey: 'newTask', route: '/task-form', color: FeatureColors.task },
  { icon: 'cart-outline',       labelKey: 'shop',    route: '/shopping',  color: FeatureColors.shop },
  { icon: 'leaf-outline',       labelKey: 'habits',  route: '/habits',    color: FeatureColors.habits },
  { icon: 'flash-outline',      labelKey: 'focus',   route: '/focus',     color: '#E8934A' },
  { icon: 'heart-outline',      labelKey: 'health',  route: '/health',    color: FeatureColors.health },
  { icon: 'restaurant-outline', labelKey: 'meals',   route: '/meals',     color: FeatureColors.meals },
  { icon: 'camera-outline',     labelKey: 'scan',    route: '/scan',      color: FeatureColors.scan },
  { icon: 'link-outline',       labelKey: 'shared',  route: '/shared',    color: FeatureColors.shared },
];

const RADIUS = 130;
const FAB_SIZE = 60;
const BUBBLE_SIZE = 56;
const STEP_ANGLE = (2 * Math.PI) / BASE_ITEMS.length; // 45° = π/4

const WHEEL_SIZE = RADIUS * 2 + BUBBLE_SIZE;

const DRAG_SENSITIVITY = 140; // px per radian — slightly higher for the clamped range

// Window shows 3 full + 2 half-visible bubbles = 3π/4 (135°) wide.
// Right-handed: from −π (left) sweeping up to −π/4 (upper-right).
// The WINDOW_FADE zone = half a step on each edge → items at the boundary are 50% visible.
const WINDOW_FADE = STEP_ANGLE / 2; // ~22.5°

// Clamped rotation: 4 × STEP_ANGLE = π (180°) total travel, enough to reach all 8 items.
// Right-handed clamps wheelAngle in [MIN_WHEEL, MAX_WHEEL].
const MIN_WHEEL_RH = -2 * Math.PI;
const MAX_WHEEL_RH = -Math.PI;
const MIN_WHEEL_LH = 0;
const MAX_WHEEL_LH = Math.PI;

function windowOpacity(angle: number, winStart: number, winEnd: number): number {
  'worklet';
  const twoPi = 2 * Math.PI;
  const wF = WINDOW_FADE;
  const dS = ((angle - winStart + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  const dE = ((angle - winEnd   + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (dS < -wF || dE > wF) return 0;
  if (dS <  wF) return (dS + wF) / (2 * wF);
  if (dE > -wF) return (wF - dE) / (2 * wF);
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
  item, baseAngle, wheelAngle, openProgress, windowStart, windowEnd, onPress, pointerEvents,
}: BubbleItemViewProps) {
  const pressAnim = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => {
    const currentAngle = baseAngle + wheelAngle.value;
    const op = openProgress.value;
    const x = Math.cos(currentAngle) * RADIUS * op;
    const y = Math.sin(currentAngle) * RADIUS * op;
    const scale = (0.3 + 0.7 * op) * pressAnim.value;
    const opacity = windowOpacity(currentAngle, windowStart, windowEnd) * op;
    return { transform: [{ translateX: x }, { translateY: y }, { scale }], opacity };
  });

  function handlePressIn() { pressAnim.value = withTiming(0.94, { duration: 60 }); }
  function handlePressOut() { pressAnim.value = withSpring(1, { damping: 40, stiffness: 700 }); }

  return (
    <Animated.View style={[styles.bubble, { backgroundColor: item.color }, animStyle]} pointerEvents={pointerEvents}>
      <Pressable style={styles.bubbleInner} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
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

  // Right-handed: window from −π (left) to −π/4 (upper-right), 3π/4 wide.
  // Left-handed:  window from π/4 (upper-left) to π (right), mirrored.
  const windowStart = leftHanded ? Math.PI / 4 : -Math.PI;
  const windowEnd   = leftHanded ? Math.PI      : -Math.PI / 4;

  const wheelAngle   = useSharedValue(leftHanded ? Math.PI / 4 : -Math.PI);
  const openProgress = useSharedValue(0);
  const startAngle   = useSharedValue(0);

  useEffect(() => {
    wheelAngle.value = leftHanded ? Math.PI / 4 : -Math.PI;
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
    tap();
    const toValue = open ? 0 : 1;
    // Snappy open/close
    openProgress.value = withSpring(toValue, { damping: 20, stiffness: 400 });
    setOpen((v) => !v);
  }

  function navigate(item: BubbleEntry) {
    tap();
    openProgress.value = withSpring(0, { damping: 20, stiffness: 400 });
    setOpen(false);
    const action = item.onPress ?? (() => router.push(item.route as never));
    setTimeout(action, 130);
  }

  const minWheel = leftHanded ? MIN_WHEEL_LH : MIN_WHEEL_RH;
  const maxWheel = leftHanded ? MAX_WHEEL_LH : MAX_WHEEL_RH;

  // Lottery-wheel feel: coast to a projected position, then spring-snap.
  const spinGesture = Gesture.Pan()
    .onStart(() => { startAngle.value = wheelAngle.value; })
    .onUpdate((e) => {
      const raw = startAngle.value - e.translationY / DRAG_SENSITIVITY;
      wheelAngle.value = Math.max(minWheel, Math.min(maxWheel, raw));
    })
    .onEnd((e) => {
      const velocity = leftHanded ? e.velocityY : -e.velocityY;
      const coast = wheelAngle.value + (velocity / DRAG_SENSITIVITY) * 0.10;
      const clamped = Math.max(minWheel, Math.min(maxWheel, coast));
      const snapped = Math.max(minWheel, Math.min(maxWheel,
        Math.round(clamped / STEP_ANGLE) * STEP_ANGLE));

      // Coast briefly (lottery spin inertia), then spring to nearest slot.
      wheelAngle.value = withSequence(
        withTiming(clamped, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withSpring(snapped, { damping: 28, stiffness: 600 })
      );
    });

  const sideStyle = leftHanded ? { left: 24 } : { right: 24 };
  const fabIconColor = contrastOn(theme.orange);

  return (
    <View style={[styles.container, sideStyle]} pointerEvents="box-none">
      {open && <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />}

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

      <Pressable
        style={[styles.fab, { backgroundColor: theme.orange }]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={open ? t.close : t.nav.newTask}
        accessibilityState={{ expanded: open }}
      >
        {open ? (
          <Ionicons name="close" size={28} color={fabIconColor} />
        ) : (
          <Image
            source={require('@/assets/android-icon-monochrome.png')}
            style={[styles.fabLogo, { tintColor: fabIconColor }]}
            resizeMode="contain"
          />
        )}
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
  fabLogo: {
    width: 30,
    height: 30,
  },
  bubble: {
    position: 'absolute',
    left: RADIUS,
    top: RADIUS,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.cardHeavy,
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
