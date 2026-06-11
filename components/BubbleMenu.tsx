/**
 * BubbleMenu.tsx — spinning-wheel radial FAB for navigation.
 *
 * Floating action button on the home screen that opens into a 4-bubble arc.
 * Item 0 (add/newTask) is always at the leftmost position (−180° from FAB).
 * Items 1–7 form a spinning carousel: 3 slots in the remaining arc, drag up/down
 * to cycle through all 7. Labels resolve through `t.nav` so the menu follows
 * the user's language.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, store/useSettingsStore
 *   Used by → app/index.tsx
 *   Data    → none (presentational); reads colorTheme from useSettingsStore for theming
 *
 * Edit notes:
 *   - To add a screen, append a BASE_ITEMS entry AND add a matching key under t.nav in lib/i18n.ts.
 *   - Item 0 is always pinned at −π; only items 1–N go into the carousel.
 *   - STEP_ARC = π/6 spaces 4 items evenly across the 90° arc. Adjust if item count changes.
 *   - All labels go through useT() — no hardcoded text.
 *   - Settings is not in the menu; it lives as a persistent corner button in app/index.tsx.
 */
import React, { useMemo, useState } from 'react';
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

// Warm-to-cool gradient: creation → focus → daily tracking → social.
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

const RADIUS = 300;
const BUBBLE_SIZE = 56;
const NUM_WHEEL_ITEMS = 7;                              // items 1–7 cycle through the carousel
const STEP_ARC = Math.PI / 6;                           // 30° per slot — 4 items fill the 90° arc
const SCROLL_SENSITIVITY = RADIUS * STEP_ARC;           // ≈ 157 px of drag per item slot
const ARC_VIEW_SIZE = RADIUS + BUBBLE_SIZE / 2;         // 328 — gesture detection area

// ─── Carousel sub-component (items 1–7) ──────────────────────────────────────

type SubBubbleItemProps = {
  item: BubbleEntry;
  index: number;                      // 0-based index into items 1–7
  scrollOffset: SharedValue<number>;  // unbounded float; visual wraps via % NUM_WHEEL_ITEMS
  openProgress: SharedValue<number>;
  onPress: () => void;
  isOpen: boolean;
};

function SubBubbleItem({
  item,
  index,
  scrollOffset,
  openProgress,
  onPress,
  isOpen,
}: SubBubbleItemProps) {
  const pressAnim = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => {
    // Fractional slot position in [0, NUM_WHEEL_ITEMS)
    const raw = (index - scrollOffset.value) % NUM_WHEEL_ITEMS;
    const s   = ((raw % NUM_WHEEL_ITEMS) + NUM_WHEEL_ITEMS) % NUM_WHEEL_ITEMS;
    // Values near NUM_WHEEL_ITEMS wrap back to ~−0 (fade-in from the other side)
    const sW  = s > NUM_WHEEL_ITEMS - 0.5 ? s - NUM_WHEEL_ITEMS : s;

    if (sW < -0.5 || sW > 2.5) {
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0 }] };
    }

    // sW=0 → slot 1 (−150°), sW=1 → slot 2 (−120°), sW=2 → slot 3 (−90°)
    const angle = -Math.PI + (sW + 1) * STEP_ARC;
    const op    = openProgress.value;
    const x     = Math.cos(angle) * RADIUS * op;
    const y     = Math.sin(angle) * RADIUS * op;

    // Smooth fade over ±0.5 slot at each visible boundary
    let edgeOpacity = 1;
    if (sW < 0) edgeOpacity = (sW + 0.5) / 0.5;
    if (sW > 2) edgeOpacity = (2.5 - sW) / 0.5;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: (0.3 + 0.7 * op) * pressAnim.value },
      ],
      opacity: edgeOpacity * op,
    };
  });

  function handlePressIn() {
    pressAnim.value = withSpring(0.88, { mass: 1, damping: 15, stiffness: 150 });
  }
  function handlePressOut() {
    pressAnim.value = withSpring(1, { mass: 1, damping: 15, stiffness: 150 });
  }

  return (
    <Animated.View
      style={[styles.bubble, { backgroundColor: item.color }, animStyle]}
      pointerEvents={isOpen ? 'auto' : 'none'}
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
  const scrollOffset = useSharedValue(0);   // unbounded; items wrap via % NUM_WHEEL_ITEMS
  const startOffset  = useSharedValue(0);
  const openProgress = useSharedValue(0);
  const pressAnim0   = useSharedValue(1);   // press feedback for pinned item 0
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
    openProgress.value = withSpring(toValue, { damping: 15, stiffness: 150 });
    setOpen((v) => !v);
  }

  function navigate(item: BubbleEntry) {
    toggle();
    const action = item.onPress ?? (() => router.push(item.route as never));
    setTimeout(action, 150);
  }

  // Item 0 is pinned at −π (directly left of FAB) and never participates in the carousel.
  const item0Style = useAnimatedStyle(() => {
    const op = openProgress.value;
    return {
      transform: [
        { translateX: -RADIUS * op },
        { translateY: 0 },
        { scale: (0.3 + 0.7 * op) * pressAnim0.value },
      ],
      opacity: op,
    };
  });

  function handleItem0PressIn() {
    pressAnim0.value = withSpring(0.88, { mass: 1, damping: 15, stiffness: 150 });
  }
  function handleItem0PressOut() {
    pressAnim0.value = withSpring(1, { mass: 1, damping: 15, stiffness: 150 });
  }

  // Spin gesture: drag up → later items enter from the top slot (−90°).
  // scrollOffset is unbounded; snapping to the nearest integer keeps the spring short.
  const spinGesture = Gesture.Pan()
    .onStart(() => {
      startOffset.value = scrollOffset.value;
    })
    .onUpdate((e) => {
      scrollOffset.value = startOffset.value + (-e.translationY / SCROLL_SENSITIVITY);
    })
    .onEnd(() => {
      const snapped = Math.round(scrollOffset.value);
      scrollOffset.value = withSpring(snapped, { damping: 20, stiffness: 200 });
    });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: `${interpolate(openProgress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg`,
    }],
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
      )}

      <GestureDetector gesture={spinGesture}>
        <View style={styles.arcArea} pointerEvents="box-none">

          {/* Item 0: pinned at −π (directly left), never spins */}
          <Animated.View
            style={[styles.bubble, { backgroundColor: items[0].color }, item0Style]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            <Pressable
              style={styles.bubbleInner}
              onPress={() => navigate(items[0])}
              onPressIn={handleItem0PressIn}
              onPressOut={handleItem0PressOut}
            >
              <Ionicons name={items[0].icon} size={22} color="#fff" />
              <Text style={styles.bubbleLabel}>{items[0].label}</Text>
            </Pressable>
          </Animated.View>

          {/* Items 1–7: spinning carousel, 3 slots visible at a time */}
          {items.slice(1).map((item, i) => (
            <SubBubbleItem
              key={item.route}
              item={item}
              index={i}
              scrollOffset={scrollOffset}
              openProgress={openProgress}
              onPress={() => navigate(item)}
              isOpen={open}
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
    right: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Gesture detection area sized to cover the arc; bottom-right corner aligns with FAB center.
  arcArea: {
    position: 'absolute',
    width: ARC_VIEW_SIZE,
    height: ARC_VIEW_SIZE,
    bottom: 0,
    right: 0,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.fab,
  },
  // Bubbles anchor to the bottom-right of arcArea (= FAB center) so translateX/Y
  // move them outward from the correct origin.
  bubble: {
    position: 'absolute',
    bottom: 0,
    right: 0,
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
