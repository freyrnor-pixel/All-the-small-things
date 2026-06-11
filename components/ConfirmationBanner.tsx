/**
 * ConfirmationBanner.tsx — large, friendly, auto-dismissing confirmation toast.
 *
 * Controlled overlay: pass a `message` string to show it; it fades/slides in near
 * the top, stays for `duration` ms, then calls `onDismiss`. Used for positive
 * confirmations like "Reminder set for 09:00 on Monday ✓" or "Added to shopping ✓".
 * Honours reduce-motion (appears/disappears without sliding). Tapping it dismisses
 * early.
 *
 * Usage:
 *   const [msg, setMsg] = useState<string | null>(null);
 *   ...
 *   <ConfirmationBanner message={msg} onDismiss={() => setMsg(null)} />
 *   // call setMsg('Reminder set ✓') to show it
 *
 * Connections:
 *   Imports → react-native-reanimated, react-native-safe-area-context, constants/theme, lib/useAppTheme
 *   Used by → app/task-form, app/meals, app/shopping (save/add confirmations)
 *   Data    → reads reducedMotion via useAccessibility(); colours from useAppTheme()
 *
 * Edit notes:
 *   - Controlled: parent owns the message string and clears it in onDismiss.
 *   - Render once near the root of a screen so it overlays content (zIndex high).
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useAccessibility } from '@/lib/useAppTheme';

type Props = {
  /** The confirmation text; null/empty hides the banner. */
  message: string | null;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Default 2200. */
  duration?: number;
};

export default function ConfirmationBanner({ message, onDismiss, duration = 2200 }: Props) {
  const theme = useAppTheme();
  const { reducedMotion } = useAccessibility();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!message) return;
    progress.value = reducedMotion ? 1 : withTiming(1, { duration: 220 });
    const id = setTimeout(() => {
      if (reducedMotion) {
        runOnJS(onDismiss)();
      } else {
        progress.value = withTiming(0, { duration: 200 }, (done) => {
          if (done) runOnJS(onDismiss)();
        });
      }
    }, duration);
    return () => clearTimeout(id);
  }, [message, reducedMotion, duration]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -16 }],
  }));

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + Spacing.sm }, animStyle]}
    >
      <Pressable
        onPress={onDismiss}
        style={[styles.banner, { backgroundColor: theme.green, shadowColor: '#000' }]}
      >
        <Ionicons name="checkmark-circle" size={22} color={theme.white} />
        <Text style={[styles.text, { color: theme.white }]} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 1000,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    maxWidth: 520,
    ...Shadow.card,
  },
  text: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: Fonts.bold,
  },
});
