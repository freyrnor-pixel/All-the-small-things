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

const FAB_MARGIN_SIDE = 48; // must match sideStyle left/right value below — kept equal to styles.container's bottom (48) so the FAB sits the same distance from the bottom edge as the side edge
const FAB_SIZE = 60;
// Orbit radius = FAB center's distance from the screen edge. At angle 0 (RH) / π (LH)
// this used to land the edge item's center exactly on the screen boundary for a clean
// compositor clip. That slot is now outside the visible window (focus moved to NW/NE,
// see windowStart/windowEnd below), so the edge-clip behavior no longer applies there —
// this formula is kept anyway since it still gives a sensible, edge-anchored orbit size.
const RADIUS_X = FAB_MARGIN_SIDE + FAB_SIZE / 2; // = 78
// RADIUS == RADIUS_X: the orbit is a true circle, not an ellipse, so bubble spacing is
// uniform all the way around (a mismatched RADIUS previously made this a tall, pointy
// ellipse instead of a round cluster).
const RADIUS = RADIUS_X; // = 78
// Adjacent bubbles sit STEP_ANGLE (45°) apart on the circle, so every pair is the same
// distance apart: 2·RADIUS·sin(STEP_ANGLE/2) ≈ 59.7px. BUBBLE_SIZE must stay under that or
// adjacent bubbles visibly overlap every time the menu is open, not just mid-drag. 50
// clears it with ~9.7px to spare.
const BUBBLE_SIZE = 50;
const STEP_ANGLE = (2 * Math.PI) / BASE_ITEMS.length; // 45° = π/4

const WHEEL_SIZE = RADIUS * 2 + BUBBLE_SIZE;

const DRAG_SENSITIVITY = 100; // px per radian — lower = lighter drag feel; final rest position is always snapped to the nearest step regardless, so this only affects feel, not precision

// Window is π (180°) wide — 4 steps. Opacity grades down with distance from the centered
// focus item: 1.0 at center, OPACITY_NEAR for the immediate neighbor on each side,
// OPACITY_FAR for the item at winStart/winEnd (the half-visible "peek" bubbles), then fades
// to 0 over the WINDOW_FADE margin beyond that. Right-handed window is shifted one step
// past straight-up so its center (the focus position) sits at NW instead of N; left-handed
// is mirrored to NE.
const WINDOW_FADE = STEP_ANGLE / 2; // ~22.5°
const OPACITY_NEAR = 0.72;
const OPACITY_FAR = 0.4;

// Clamped rotation: stops one item short of each end (item 1 / item 6 reach the focus
// slot, not item 0 / item 7) rather than the true edges. Centering a true edge item
// leaves a fully-empty adjacent slot on its far side (there's no item -1 or item 8) —
// stopping one item short still leaves one empty half-visible peek slot at each extreme,
// but not an empty full-opacity slot too. That's 5 × STEP_ANGLE = 5π/4 of total travel.
// Shifted by −STEP_ANGLE (RH) / +STEP_ANGLE (LH) from the original N-centered window so
// the same items (1 and 6) still land in the focus slot, now at its new NW/NE position.
// Right-handed clamps wheelAngle in [MIN_WHEEL, MAX_WHEEL].
const MIN_WHEEL_RH = -9 * Math.PI / 4;   // item 6 centered
const MAX_WHEEL_RH = -Math.PI;           // item 1 centered
const MIN_WHEEL_LH = -7 * Math.PI / 4;   // item 6 centered
const MAX_WHEEL_LH = -Math.PI / 2;       // item 1 centered

// Default rest pose: item 2 centered in the focus slot (now at NW/NE).
const DEFAULT_WHEEL_RH = -5 * Math.PI / 4;
const DEFAULT_WHEEL_LH = -3 * Math.PI / 4;

function windowOpacity(angle: number, winStart: number, winEnd: number): number {
  'worklet';
  // No modulo/wraparound here on purpose: wheelAngle is hard-clamped (MIN_WHEEL_*/MAX_WHEEL_*)
  // so the wheel never spins freely past item 0/7 — it's a bounded arc, not a closed circle.
  // baseAngle + wheelAngle is therefore already a well-defined, unwrapped real number, and a
  // plain difference from the window center gives the true geometric distance. Wrapping it
  // modulo 2π previously made item 0 and item 7 (opposite ends of the list) alias into each
  // other's peek slot whenever item 1 or item 6 was centered, since -405° and -45° collapse
  // to the same point mod 360° even though the wheel can never actually reach that state.
  const wF = WINDOW_FADE;
  const step = STEP_ANGLE;
  const halfWidth = (winEnd - winStart) / 2;
  const center = winStart + halfWidth;
  const d = Math.abs(angle - center);
  const outerEdge = halfWidth + wF;
  if (d >= outerEdge) return 0;
  if (d <= step) return 1 - (1 - OPACITY_NEAR) * (d / step);
  if (d <= halfWidth) return OPACITY_NEAR - (OPACITY_NEAR - OPACITY_FAR) * ((d - step) / (halfWidth - step));
  return OPACITY_FAR * (1 - (d - halfWidth) / wF);
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

  // Right-handed: window from −5π/4 to −π/4, centered at −3π/4 (NW), π wide.
  // Left-handed:  window from −3π/4 to π/4, centered at −π/4 (NE) — the left-right mirror
  // of the right-handed window (x flips sign, up/down stays the same).
  const windowStart = leftHanded ? -3 * Math.PI / 4 : -5 * Math.PI / 4;
  const windowEnd   = leftHanded ? Math.PI / 4 : -Math.PI / 4;

  const wheelAngle   = useSharedValue(leftHanded ? DEFAULT_WHEEL_LH : DEFAULT_WHEEL_RH);
  const openProgress = useSharedValue(0);
  const startAngle   = useSharedValue(0);

  useEffect(() => {
    wheelAngle.value = leftHanded ? DEFAULT_WHEEL_LH : DEFAULT_WHEEL_RH;
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

  // ζ≈0.71 — quicker pop-out with a touch of bounce, between the old too-springy
  // { damping: 20, stiffness: 400 } (ζ≈0.5) and the too-stiff overshoot-clamped version.
  const OPEN_SPRING = { damping: 20, stiffness: 200 };

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
    bottom: 48,
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
