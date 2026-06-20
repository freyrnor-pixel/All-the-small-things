/**
 * BubbleMenu.tsx — spinning-wheel radial FAB for navigation.
 *
 * Floating action button that opens into a spinnable circle of bubbles. Shows
 * 3 full + 2 half-visible bubbles at any time. Dragging the wheel rotates it
 * through a clamped range ((BASE_ITEMS.length - 3) × STEP_ANGLE), stopping when
 * the second-from-each-end item (index 1 or BASE_ITEMS.length - 2) reaches the
 * centered "focus" slot — stopping at the true edge items (0 / last) would leave
 * a fully-empty bubble slot on their far side. Release snaps with a lottery-wheel
 * feel: a short ease-out coast before the spring settles. Tapping anywhere
 * outside the bubbles (including empty space inside the wheel's bounding square)
 * closes the menu.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/haptics, lib/useAppTheme, store/useSettingsStore
 *   Used by → app/index.tsx
 *   Data    → none (presentational); reads colorTheme + leftHanded + bubbleSize/bubbleSpacing/
 *             bubbleSpringIntensity/bubbleAnimSpeed (debug overlay tuning) from useSettingsStore,
 *             reducedMotion via useAccessibility()
 *
 * Edit notes:
 *   - To add a screen, append a BASE_ITEMS entry AND add a matching key under t.nav in lib/i18n.ts.
 *   - Wheel geometry (radius/bubbleSize) is derived per-render from settings (default 78/50,
 *     clamped — see clamp() calls in BubbleMenu) instead of fixed module consts, so the debug
 *     overlay's "Bubble Wheel" tab can tune it live. DRAG_SENSITIVITY stays a fixed module
 *     const. STEP_ANGLE updates from BASE_ITEMS.length.
 *   - Left-handed mode flips the FAB to bottom-left and shows bubbles in the upper-right arc.
 *   - All labels go through useT() — no hardcoded text.
 *   - FAB always shows the tree logo (assets/android-icon-monochrome.png), open or closed — no
 *     "×" close glyph; tapping the same tree icon toggles the wheel either way. Tinted via
 *     contrastOn(fabMaterial.contrastBase) so it stays readable against any theme's accent color
 *     AND any material finish (glass/metal/rock/paper tint the accent before this reads it) —
 *     don't replace this with a hardcoded white/dark tint. On press, the tint flashes to the
 *     opposite contrastOn() output (fabWaveColor) and eases back — this needs Animated.Image
 *     (not a plain Image) since tintColor is driven by an animated style.
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
  interpolateColor,
  Easing,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Radius, Shadow, FeatureColors, contrastOn, getMaterialStyle, tintToTheme, MaterialStyle } from '@/constants/theme';
import { useAppTheme, useAccessibility } from '@/lib/useAppTheme';
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
  { icon: 'bulb-outline',       labelKey: 'capture', route: '/capture',   color: FeatureColors.capture },
];

const FAB_MARGIN_SIDE = 48; // must match sideStyle left/right value below — kept equal to styles.container's bottom (48) so the FAB sits the same distance from the bottom edge as the side edge
const FAB_SIZE = 60;
// Default orbit radius/bubble size — match the debug overlay's "Bubble Wheel" defaults
// (bubbleSpacing=78, bubbleSize=50) so a fresh install with no settings row looks identical
// to before these became tunable. The orbit is always a true circle (one radius, not an
// ellipse) so bubble spacing is uniform all the way around the wheel.
const DEFAULT_RADIUS = 78;
const DEFAULT_BUBBLE_SIZE = 50;
// Adjacent bubbles sit STEP_ANGLE (45°) apart on the circle, so every pair is the same
// distance apart: 2·radius·sin(STEP_ANGLE/2). bubbleSize must stay under that or adjacent
// bubbles visibly overlap every time the menu is open, not just mid-drag — clamped to
// 30–70 (size) / 60–110 (spacing) in BubbleMenu below so this invariant always holds
// (worst case 30 size vs 60 spacing: 2·60·sin(22.5°) ≈ 45.9px > 30px).
const STEP_ANGLE = (2 * Math.PI) / BASE_ITEMS.length; // 45° = π/4

const DRAG_SENSITIVITY = 100; // px per radian — lower = lighter drag feel; final rest position is always snapped to the nearest step regardless, so this only affects feel, not precision

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Window is always 4 × STEP_ANGLE wide (4 steps — at the original 45° step that's π,
// i.e. 180°, but it scales with however many BASE_ITEMS there are). Opacity grades down with distance
// from the centered focus item: 1.0 at center, OPACITY_NEAR for the immediate neighbor on
// each side, OPACITY_FAR for the item at winStart/winEnd (the half-visible "peek" bubbles),
// then fades to 0 over the WINDOW_FADE margin beyond that. Right-handed window is shifted
// one step past straight-up so its center (the focus position) sits at NW instead of N;
// left-handed is mirrored to NE.
const WINDOW_FADE = STEP_ANGLE / 2; // half a step
const OPACITY_NEAR = 0.72;
const OPACITY_FAR = 0.4;

// Clamped rotation: stops one item short of each end (item 1 / item LAST_IDX-1 reach the
// focus slot, not item 0 / item LAST_IDX) rather than the true edges. Centering a true
// edge item leaves a fully-empty adjacent slot on its far side (there's no item -1 or
// item LAST_IDX+1) — stopping one item short still leaves one empty half-visible peek slot
// at each extreme, but not an empty full-opacity slot too. Expressed generally (in terms of
// STEP_ANGLE/BASE_ITEMS.length, not the old fixed 8-item/45° assumption) so the wheel stays
// correct however many bubbles BASE_ITEMS holds. Shifted by −STEP_ANGLE (RH) / +STEP_ANGLE
// (LH) from the original N-centered window so the same items (1 and LAST_IDX-1) still land
// in the focus slot, now at its new NW/NE position. Right-handed clamps wheelAngle in
// [MIN_WHEEL, MAX_WHEEL]. At the original 8-item step (STEP_ANGLE=π/4) these formulas reduce
// to exactly the old hardcoded values (-9π/4/-π RH, -7π/4/-π/2 LH, -5π/4/-3π/4 default).
const LAST_IDX = BASE_ITEMS.length - 1;
const WINDOW_CENTER_RH = -3 * Math.PI / 4; // NW
const WINDOW_CENTER_LH = -Math.PI / 4;     // NE
const MIN_WHEEL_RH = WINDOW_CENTER_RH - (LAST_IDX - 1) * STEP_ANGLE; // item LAST_IDX-1 centered
const MAX_WHEEL_RH = WINDOW_CENTER_RH - STEP_ANGLE;                  // item 1 centered
const MIN_WHEEL_LH = WINDOW_CENTER_LH - (LAST_IDX - 1) * STEP_ANGLE; // item LAST_IDX-1 centered
const MAX_WHEEL_LH = WINDOW_CENTER_LH - STEP_ANGLE;                  // item 1 centered

// Default rest pose: item 2 centered in the focus slot (now at NW/NE).
const DEFAULT_WHEEL_RH = WINDOW_CENTER_RH - 2 * STEP_ANGLE;
const DEFAULT_WHEEL_LH = WINDOW_CENTER_LH - 2 * STEP_ANGLE;

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
  radius: number;
  bubbleSize: number;
  pressDuration: number;
};

function BubbleItemView({
  item, material, baseAngle, wheelAngle, openProgress, windowStart, windowEnd, onPress, pointerEvents,
  radius, bubbleSize, pressDuration,
}: BubbleItemViewProps) {
  const pressAnim = useSharedValue(1);
  const { reducedMotion } = useAccessibility();

  const animStyle = useAnimatedStyle(() => {
    const currentAngle = baseAngle + wheelAngle.value;
    const op = openProgress.value;
    const x = Math.cos(currentAngle) * radius * op;
    const y = Math.sin(currentAngle) * radius * op;
    const scale = (0.3 + 0.7 * op) * pressAnim.value;
    const opacity = windowOpacity(currentAngle, windowStart, windowEnd) * op;
    return { transform: [{ translateX: x }, { translateY: y }, { scale }], opacity };
  });

  function handlePressIn() { if (!reducedMotion) pressAnim.value = withTiming(0.94, { duration: pressDuration }); }
  function handlePressOut() { if (!reducedMotion) pressAnim.value = withSpring(1, { damping: 40, stiffness: 700 }); }

  return (
    <Animated.View
      style={[
        styles.bubble,
        { left: radius, top: radius, width: bubbleSize, height: bubbleSize },
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
        {/* Stacked, decreasing-opacity layers fake a smooth highlight falloff instead of one
            flat-edged sheen rectangle — stays OTA-safe (no native gradient module). */}
        <View pointerEvents="none" style={[styles.bubbleSheenOuter, { height: bubbleSize * 0.55, borderTopLeftRadius: bubbleSize / 2, borderTopRightRadius: bubbleSize / 2, backgroundColor: material.sheenColor, opacity: 0.35 }]} />
        <View pointerEvents="none" style={[styles.bubbleSheenMid, { height: bubbleSize * 0.38, borderTopLeftRadius: bubbleSize / 2, borderTopRightRadius: bubbleSize / 2, backgroundColor: material.sheenColor, opacity: 0.55 }]} />
        <View pointerEvents="none" style={[styles.bubbleSheenInner, { height: bubbleSize * 0.2, borderTopLeftRadius: bubbleSize / 2, borderTopRightRadius: bubbleSize / 2, backgroundColor: material.sheenColor, opacity: 1 }]} />
        <Pressable style={styles.bubbleInner} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <Ionicons name={item.icon} size={22} color={contrastOn(material.contrastBase)} />
          <Text style={[styles.bubbleLabel, { color: contrastOn(material.contrastBase) }]}>{item.label}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BubbleMenu({ onNewTask }: Props) {
  const [open, setOpen] = useState(false);
  const {
    leftHanded, bubbleMaterial,
    bubbleSize, bubbleSpacing, bubbleSpringIntensity, bubbleAnimSpeed,
  } = useSettingsStore();

  // Debug-overlay-tunable wheel geometry, clamped so adjacent bubbles can never overlap
  // (see the STEP_ANGLE comment above) even if a stored value is out of the UI's own range.
  const radius = clamp(bubbleSpacing ?? DEFAULT_RADIUS, 60, 110);
  const bSize = clamp(bubbleSize ?? DEFAULT_BUBBLE_SIZE, 30, 70);
  const wheelSize = radius * 2 + bSize;

  // springScale/animScale: 50 is the neutral midpoint reproducing today's exact feel
  // (springScale=1, animScale=1). Clamped well past the UI's own range as a defensive floor/
  // ceiling so durations can never collapse to 0ms or balloon into a multi-second stall.
  const springScale = clamp((bubbleSpringIntensity ?? 50) / 50, 0.25, 4);
  const animScale = clamp((bubbleAnimSpeed ?? 50) / 50, 0.3, 3);
  const pressDuration = clamp(60 / animScale, 30, 600);
  const coastDuration = clamp(180 / animScale, 30, 600);
  const waveInDuration = clamp(90 / animScale, 30, 600);
  const waveOutDuration = clamp(280 / animScale, 30, 600);
  const navigateDelay = clamp(130 / animScale, 30, 600);
  const snapStiffness = clamp(600 * springScale, 150, 2400);

  // Window is always 4×STEP_ANGLE wide (2 full neighbor steps either side of the focus
  // slot), centered at WINDOW_CENTER_RH (NW) for right-handed or WINDOW_CENTER_LH (NE) for
  // left-handed — the left-right mirror of the right-handed window (x flips sign, up/down
  // stays the same). At the original 8-item/45° step this reduces to exactly −5π/4..−π/4
  // (RH) / −3π/4..π/4 (LH), unchanged from before.
  const windowCenter = leftHanded ? WINDOW_CENTER_LH : WINDOW_CENTER_RH;
  const windowStart = windowCenter - 2 * STEP_ANGLE;
  const windowEnd   = windowCenter + 2 * STEP_ANGLE;

  const wheelAngle   = useSharedValue(leftHanded ? DEFAULT_WHEEL_LH : DEFAULT_WHEEL_RH);
  const openProgress = useSharedValue(0);
  const startAngle   = useSharedValue(0);

  useEffect(() => {
    wheelAngle.value = leftHanded ? DEFAULT_WHEEL_LH : DEFAULT_WHEEL_RH;
  }, [leftHanded]);

  const router = useRouter();
  const theme = useAppTheme();
  const t = useT();
  const { reducedMotion } = useAccessibility();

  // Feature colors are leaned toward the active theme's accent here — without this,
  // satellite bubbles show the exact same fixed hues no matter which color theme is
  // selected, which is what made them read as disconnected from "the rest of the app".
  // Only the FAB itself (theme.orange) was theme-aware before this.
  const items = useMemo((): BubbleEntry[] =>
    BASE_ITEMS.map((item) => ({
      icon: item.icon,
      label: t.nav[item.labelKey],
      route: item.route,
      color: tintToTheme(item.color, theme.orange),
      onPress: item.route === '/task-form' && onNewTask ? onNewTask : undefined,
    })),
    [onNewTask, t, theme.orange]
  );

  // ζ≈0.9 at the default springScale=1 — fast expansion that settles into place almost
  // immediately, with only a faint hint of bounce rather than a visible overshoot/wobble.
  // Both stiffness and damping scale with springScale so the debug overlay's "spring
  // intensity" slider still has a consistent feel (and the damping ratio stays the same)
  // across its whole range, instead of damping staying fixed while only stiffness moved.
  const openStiffness = clamp(350 * springScale, 80, 1400);
  const OPEN_SPRING = { damping: 1.8 * Math.sqrt(openStiffness), stiffness: openStiffness };

  function toggle() {
    tap();
    const toValue = open ? 0 : 1;
    openProgress.value = reducedMotion ? toValue : withSpring(toValue, OPEN_SPRING);
    backdropDim.value = reducedMotion ? toValue : withTiming(toValue, { duration: clamp(220 / animScale, 60, 600), easing: Easing.out(Easing.quad) });
    setOpen((v) => !v);
  }

  function navigate(item: BubbleEntry) {
    tap();
    openProgress.value = reducedMotion ? 0 : withSpring(0, OPEN_SPRING);
    backdropDim.value = reducedMotion ? 0 : withTiming(0, { duration: clamp(220 / animScale, 60, 600), easing: Easing.out(Easing.quad) });
    setOpen(false);
    const action = item.onPress ?? (() => router.push(item.route as never));
    setTimeout(action, reducedMotion ? 0 : navigateDelay);
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

      if (reducedMotion) {
        wheelAngle.value = snapped;
        return;
      }
      // Coast briefly (lottery spin inertia), then spring to nearest slot. Duration/stiffness
      // scale with the debug overlay's animation-speed/spring-intensity settings.
      wheelAngle.value = withSequence(
        withTiming(clamped, { duration: coastDuration, easing: Easing.out(Easing.cubic) }),
        withSpring(snapped, { damping: 28, stiffness: snapStiffness })
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
  const fabMaterial = useMemo(() => getMaterialStyle(theme.orange, bubbleMaterial), [theme.orange, bubbleMaterial]);
  // fabMaterial.contrastBase (not theme.orange directly) since materials now tint the
  // accent toward their own finish hue — glass/metal/rock/paper can each shift the
  // resolved background enough to flip which contrastOn() output actually reads clearly.
  const fabIconColor = contrastOn(fabMaterial.contrastBase);

  // Driven by its own withTiming, not openProgress directly — openProgress is a spring
  // that's still settling (coasting/snapping back) well after the wheel visually looks
  // "open", so tying the dim to it made the backdrop flicker/shift with every bubble
  // wobble instead of just gradually darkening on open and lightening on close.
  const backdropDim = useSharedValue(0);
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropDim.value * 0.35,
  }));

  // Press feedback for the tree logo: a quick tint flash to the opposite contrastOn()
  // output (always readable, no new color constants needed) that eases back to fabIconColor.
  const pressWave = useSharedValue(0);
  const fabWaveColor = fabIconColor === '#FFFFFF' ? '#1E293B' : '#FFFFFF';
  const fabIconAnimStyle = useAnimatedStyle(() => ({
    tintColor: interpolateColor(pressWave.value, [0, 1], [fabIconColor, fabWaveColor]),
  }));
  function handleFabPressIn() {
    pressWave.value = withSequence(withTiming(1, { duration: waveInDuration }), withTiming(0, { duration: waveOutDuration }));
  }

  return (
    <>
      {/* Soft dim behind the open wheel so it reads as floating above the screen rather than
          abruptly occluding it. Driven by the same openProgress as the bubbles' own fade.
          Rendered as a sibling (not inside styles.container, which is sized to its own
          bottom-corner content, not the full screen) so absoluteFill actually covers the screen. */}
      <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
      <View style={[styles.container, sideStyle]} pointerEvents="box-none">
      {open && <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />}

      <GestureDetector gesture={wheelGesture}>
        <View
          style={[styles.wheelArea, { width: wheelSize, height: wheelSize, left: FAB_SIZE / 2 - wheelSize / 2, top: FAB_SIZE / 2 - wheelSize / 2 }]}
          pointerEvents={open ? 'auto' : 'none'}
        >
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
              radius={radius}
              bubbleSize={bSize}
              pressDuration={pressDuration}
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
        onPressIn={handleFabPressIn}
        accessibilityRole="button"
        accessibilityLabel={open ? t.close : t.nav.newTask}
        accessibilityState={{ expanded: open }}
      >
        <View style={[styles.fabMask, { backgroundColor: fabMaterial.backgroundColor }]}>
          <View pointerEvents="none" style={[styles.fabSheenOuter, { backgroundColor: fabMaterial.sheenColor, opacity: 0.35 }]} />
          <View pointerEvents="none" style={[styles.fabSheenMid, { backgroundColor: fabMaterial.sheenColor, opacity: 0.55 }]} />
          <View pointerEvents="none" style={[styles.fabSheenInner, { backgroundColor: fabMaterial.sheenColor, opacity: 1 }]} />
          <Animated.Image
            source={require('@/assets/android-icon-monochrome.png')}
            style={[styles.fabLogo, fabIconAnimStyle]}
            resizeMode="contain"
          />
        </View>
      </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  container: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelArea: {
    // width/height/left/top are set inline per-render (depend on the tunable wheel
    // radius/bubbleSize — see BubbleMenu's `wheelSize`).
    position: 'absolute',
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
  fabSheenOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FAB_SIZE * 0.55,
    borderTopLeftRadius: FAB_SIZE / 2,
    borderTopRightRadius: FAB_SIZE / 2,
  },
  fabSheenMid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FAB_SIZE * 0.38,
    borderTopLeftRadius: FAB_SIZE / 2,
    borderTopRightRadius: FAB_SIZE / 2,
  },
  fabSheenInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FAB_SIZE * 0.2,
    borderTopLeftRadius: FAB_SIZE / 2,
    borderTopRightRadius: FAB_SIZE / 2,
  },
  fabLogo: {
    width: 46,
    height: 46,
  },
  bubble: {
    // left/top/width/height are set inline per-render (depend on the tunable wheel
    // radius/bubbleSize — see BubbleItemView's `radius`/`bubbleSize` props).
    position: 'absolute',
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
  // height/borderTopLeftRadius/borderTopRightRadius for all 3 sheen layers are set inline
  // per-render (depend on the tunable bubbleSize — see BubbleItemView's JSX).
  bubbleSheenOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bubbleSheenMid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bubbleSheenInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
