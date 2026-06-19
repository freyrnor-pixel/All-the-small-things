/**
 * BubbleMenu.tsx — spinning-wheel radial FAB for navigation.
 *
 * Floating action button that opens into a spinnable circle of bubbles. Shows
 * 3 full + 2 half-visible bubbles at any time. Dragging the wheel rotates it
 * through a clamped range (5 × 45° = 5π/4), stopping when the second-from-each-
 * end item (index 1 or 6) reaches the centered "focus" slot — stopping at the
 * true edge items (0/7) would leave a fully-empty bubble slot on their far
 * side. Release snaps with a lottery-wheel feel: a short ease-out coast before
 * the spring settles. Tapping anywhere outside the bubbles (including empty
 * space inside the wheel's bounding square) closes the menu.
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
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Shadow, FeatureColors, contrastOn, getMaterialStyle, MaterialStyle } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import { useT, Translations } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';
import { tap, tug } from '@/lib/haptics';

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
  { icon: 'flash-outline',      labelKey: 'focus',   route: '/focus',     color: FeatureColors.focus },
  { icon: 'heart-outline',      labelKey: 'health',  route: '/health',    color: FeatureColors.health },
  { icon: 'restaurant-outline', labelKey: 'meals',   route: '/meals',     color: FeatureColors.meals },
  { icon: 'camera-outline',     labelKey: 'scan',    route: '/scan',      color: FeatureColors.scan },
  { icon: 'link-outline',       labelKey: 'shared',  route: '/shared',    color: FeatureColors.shared },
];

const FAB_MARGIN_SIDE = 34; // must match sideStyle left/right value below
const FAB_SIZE = 60;
// Orbit radius = FAB center's distance from the screen edge. At angle 0 (RH) / π (LH)
// this lands the edge item's center exactly on the screen boundary, so the OS compositor
// clips it to a clean static half-circle instead of letting it hang fully past the edge —
// which previously caused spring-oscillation flicker there. This value is load-bearing for
// that fix — do not change it without re-deriving the edge math below.
const RADIUS_X = FAB_MARGIN_SIDE + FAB_SIZE / 2; // = 64
// RADIUS == RADIUS_X: the orbit is a true circle, not an ellipse, so bubble spacing is
// uniform all the way around (a mismatched RADIUS previously made this a tall, pointy
// ellipse instead of a round cluster).
const RADIUS = RADIUS_X; // = 64
// Adjacent bubbles sit STEP_ANGLE (45°) apart on the circle, so every pair is the same
// distance apart: 2·RADIUS·sin(STEP_ANGLE/2) ≈ 49px. BUBBLE_SIZE must stay under that or
// adjacent bubbles visibly overlap every time the menu is open, not just mid-drag. 44
// (the platform touch-target minimum) clears it with ~5px to spare.
const BUBBLE_SIZE = 44;
const STEP_ANGLE = (2 * Math.PI) / BASE_ITEMS.length; // 45° = π/4

const WHEEL_SIZE = RADIUS * 2 + BUBBLE_SIZE;

const DRAG_SENSITIVITY = 140; // px per radian — slightly higher for the clamped range

// Window is π (180°) wide — 4 steps — so items exactly at winStart/winEnd land on the
// WINDOW_FADE boundary and render at 50% opacity (half-visible "peek" bubbles), while the
// 2 steps between them stay fully opaque: 3 full + 2 half-visible bubbles, as intended.
// Right-handed: from −π (left) sweeping up to 0 (right).
const WINDOW_FADE = STEP_ANGLE / 2; // ~22.5°

// Clamped rotation: stops one item short of each end (item 1 / item 6 reach the focus
// slot, not item 0 / item 7) rather than the true edges. Centering a true edge item
// leaves a fully-empty adjacent slot on its far side (there's no item -1 or item 8) —
// stopping one item short still leaves one empty half-visible peek slot at each extreme,
// but not an empty full-opacity slot too. That's 5 × STEP_ANGLE = 5π/4 of total travel.
// Right-handed clamps wheelAngle in [MIN_WHEEL, MAX_WHEEL].
const MIN_WHEEL_RH = -2 * Math.PI;       // item 6 centered
const MAX_WHEEL_RH = -3 * Math.PI / 4;   // item 1 centered
const MIN_WHEEL_LH = -Math.PI;           // item 6 centered
const MAX_WHEEL_LH = Math.PI / 4;        // item 1 centered

function windowOpacity(angle: number, winStart: number, winEnd: number): number {
  'worklet';
  // Single center-relative reference point — using winStart/winEnd as two independent
  // wraparound references breaks at exactly winEnd when the window is a full π wide:
  // that point is antipodal to winStart, so the dS-based early-exit fires before the
  // dE-based 50%-opacity branch is reached.
  const twoPi = 2 * Math.PI;
  const wF = WINDOW_FADE;
  const halfWidth = (winEnd - winStart) / 2;
  const center = winStart + halfWidth;
  const rel = ((angle - center + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (rel < -(halfWidth + wF) || rel > halfWidth + wF) return 0;
  if (rel < -(halfWidth - wF)) return (rel + halfWidth + wF) / (2 * wF);
  if (rel > halfWidth - wF) return (halfWidth + wF - rel) / (2 * wF);
  return 1;
}

// ─── Per-bubble sub-component ────────────────────────────────────────────────

type BubbleItemViewProps = {
  item: BubbleEntry;
  material: MaterialStyle;
  baseAngle: number;
  wheelAngle: SharedValue<number>;
  openProgress: SharedValue<number>;
  windowStart: number;
  windowEnd: number;
  onPress: () => void;
  pointerEvents: 'auto' | 'none';
};

function BubbleItemView({
  item, material, baseAngle, wheelAngle, openProgress, windowStart, windowEnd, onPress, pointerEvents,
}: BubbleItemViewProps) {
  const pressAnim = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => {
    const currentAngle = baseAngle + wheelAngle.value;
    const op = openProgress.value;
    const x = Math.cos(currentAngle) * RADIUS_X * op;
    const y = Math.sin(currentAngle) * RADIUS * op;
    const scale = (0.3 + 0.7 * op) * pressAnim.value;
    const opacity = windowOpacity(currentAngle, windowStart, windowEnd) * op;
    return { transform: [{ translateX: x }, { translateY: y }, { scale }], opacity };
  });

  function handlePressIn() { pressAnim.value = withTiming(0.94, { duration: 60 }); }
  function handlePressOut() { pressAnim.value = withSpring(1, { damping: 40, stiffness: 700 }); }

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          borderWidth: material.borderWidth,
          borderColor: material.borderColor,
          borderTopColor: material.borderTopColor,
          borderBottomColor: material.borderBottomColor,
          shadowOpacity: material.shadowOpacity,
          shadowRadius: material.shadowRadius,
          elevation: material.elevation,
        },
        animStyle,
      ]}
      pointerEvents={pointerEvents}
    >
      <View style={[styles.bubbleMask, { backgroundColor: material.backgroundColor }]}>
        <View pointerEvents="none" style={[styles.bubbleSheen, { backgroundColor: material.sheenColor }]} />
        <Pressable style={styles.bubbleInner} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <Ionicons name={item.icon} size={22} color="#fff" />
          <Text style={styles.bubbleLabel}>{item.label}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BubbleMenu({ onNewTask }: Props) {
  const [open, setOpen] = useState(false);
  const { leftHanded, bubbleMaterial } = useSettingsStore();

  // Right-handed: window from −π (left) to 0 (right), π wide.
  // Left-handed:  window from 0 (right) to π (left), mirrored.
  const windowStart = leftHanded ? 0 : -Math.PI;
  const windowEnd   = leftHanded ? Math.PI : 0;

  const wheelAngle   = useSharedValue(leftHanded ? 0 : -Math.PI);
  const openProgress = useSharedValue(0);
  const startAngle   = useSharedValue(0);

  useEffect(() => {
    wheelAngle.value = leftHanded ? 0 : -Math.PI;
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

  // Near-critically-damped (ζ≈0.93) and slower than the old { damping: 20, stiffness: 400 }
  // (ζ≈0.5, fast + bouncy). overshootClamping prevents mashing the FAB from stacking up
  // extra bounce — it hard-disallows ever passing toValue, even if a retrigger inherits
  // velocity from a still-settling prior spring.
  const OPEN_SPRING = { damping: 22, stiffness: 140, overshootClamping: true };

  function toggle() {
    tap();
    const toValue = open ? 0 : 1;
    openProgress.value = withSpring(toValue, OPEN_SPRING);
    setOpen((v) => !v);
  }

  function navigate(item: BubbleEntry) {
    tap();
    openProgress.value = withSpring(0, OPEN_SPRING);
    setOpen(false);
    const action = item.onPress ?? (() => router.push(item.route as never));
    setTimeout(action, 130);
  }

  const minWheel = leftHanded ? MIN_WHEEL_LH : MIN_WHEEL_RH;
  const maxWheel = leftHanded ? MAX_WHEEL_LH : MAX_WHEEL_RH;
  const atBoundary = useSharedValue(false);

  // Lottery-wheel feel: coast to a projected position, then spring-snap.
  // Rubber-bands 20% past the clamp boundary instead of hard-stopping, with a single
  // haptic tug on first contact with each end (atBoundary guards against repeat fires).
  const spinGesture = Gesture.Pan()
    .onStart(() => {
      startAngle.value = wheelAngle.value;
      atBoundary.value = false;
    })
    .onUpdate((e) => {
      const raw = startAngle.value - e.translationY / DRAG_SENSITIVITY;
      if (raw < minWheel) {
        wheelAngle.value = minWheel + (raw - minWheel) * 0.2;
        if (!atBoundary.value) {
          atBoundary.value = true;
          runOnJS(tug)();
        }
      } else if (raw > maxWheel) {
        wheelAngle.value = maxWheel + (raw - maxWheel) * 0.2;
        if (!atBoundary.value) {
          atBoundary.value = true;
          runOnJS(tug)();
        }
      } else {
        atBoundary.value = false;
        wheelAngle.value = raw;
      }
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

  // wheelArea spans the full orbit's bounding square — bigger than the visible bubbles —
  // so a tap landing in the empty space between/around bubbles needs its own handler;
  // it would otherwise be swallowed by this view instead of reaching the close Pressable
  // behind it. Raced against spinGesture so a drag still spins instead of closing. Taps
  // that land directly on a bubble are claimed by that bubble's own nested Pressable first.
  const closeTapGesture = Gesture.Tap().onEnd(() => {
    if (open) runOnJS(toggle)();
  });
  const wheelGesture = Gesture.Race(spinGesture, closeTapGesture);

  const sideStyle = leftHanded ? { left: FAB_MARGIN_SIDE } : { right: FAB_MARGIN_SIDE };
  const fabIconColor = contrastOn(theme.orange);
  // fabIconColor is deliberately derived from theme.orange (the semantic accent), not
  // fabMaterial.backgroundColor — materials only shade/tint that accent, never invert it,
  // so the contrast decision stays valid across every finish.
  const fabMaterial = useMemo(() => getMaterialStyle(theme.orange, bubbleMaterial), [theme.orange, bubbleMaterial]);

  return (
    <View style={[styles.container, sideStyle]} pointerEvents="box-none">
      {open && <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />}

      <GestureDetector gesture={wheelGesture}>
        <View style={styles.wheelArea} pointerEvents={open ? 'auto' : 'none'}>
          {items.map((item, i) => (
            <BubbleItemView
              key={item.route}
              item={item}
              material={getMaterialStyle(item.color, bubbleMaterial)}
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
        style={[
          styles.fab,
          {
            borderWidth: fabMaterial.borderWidth,
            borderColor: fabMaterial.borderColor,
            borderTopColor: fabMaterial.borderTopColor,
            borderBottomColor: fabMaterial.borderBottomColor,
            shadowOpacity: fabMaterial.shadowOpacity,
            shadowRadius: fabMaterial.shadowRadius,
            elevation: fabMaterial.elevation,
          },
        ]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={open ? t.close : t.nav.newTask}
        accessibilityState={{ expanded: open }}
      >
        <View style={[styles.fabMask, { backgroundColor: fabMaterial.backgroundColor }]}>
          <View pointerEvents="none" style={[styles.fabSheen, { backgroundColor: fabMaterial.sheenColor }]} />
          {open ? (
            <Ionicons name="close" size={28} color={fabIconColor} />
          ) : (
            <Image
              source={require('@/assets/android-icon-monochrome.png')}
              style={[styles.fabLogo, { tintColor: fabIconColor }]}
              resizeMode="contain"
            />
          )}
        </View>
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
  // Inner overflow:hidden layer carries the material's fill + sheen, kept separate from
  // `fab` so its border/shadow (drawn on the outer Pressable) are never clipped.
  fabMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FAB_SIZE * 0.45,
    borderTopLeftRadius: FAB_SIZE / 2,
    borderTopRightRadius: FAB_SIZE / 2,
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
  // Same mask/sheen split as the FAB — see fabMask comment.
  bubbleMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BUBBLE_SIZE * 0.45,
    borderTopLeftRadius: BUBBLE_SIZE / 2,
    borderTopRightRadius: BUBBLE_SIZE / 2,
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
