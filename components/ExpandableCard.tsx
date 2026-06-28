/**
 * ExpandableCard.tsx — collapsible card with animated header chevron.
 *
 * Generic accordion container: shows a title/subtitle/badge row that toggles a
 * body section with a LayoutAnimation expand and a rotating arrow. Content,
 * labels, and optional right action are all passed in as children/props.
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme
 *   Used by → app/meals.tsx (uncontrolled), components/PlanTaskCard.tsx (controlled),
 *             app/health.tsx (controlled, per-log), components/WeekListCard.tsx (uncontrolled,
 *             "From meals" dish groups), app/shopping.tsx (uncontrolled, Monthly dish groups)
 *   Data    → driven by props; reads reducedMotion + scaled fontSize via useAccessibility()/useScaledStyles()
 *
 * Edit notes:
 *   - LayoutAnimation is enabled on Android via UIManager at module load — keep that guard if refactoring imports.
 *   - `leadingAction` renders before the title/subtitle stack inside headerLeft (same
 *     stopPropagation-wrapped Pressable pattern as `rightAction`) — e.g. Health's severity
 *     badge needs to sit leading rather than trailing, where Plans' checkbox already lives.
 *   - Surface uses getMaterialStyle() (same finish system as BubbleMenu) so the card gets a
 *     beveled border + sheen + heavier shadow instead of a flat fill — `material` defaults to
 *     the user's chosen bubbleMaterial setting (pass it explicitly to override). The outer view
 *     carries border/shadow, the inner overflow:hidden mask carries the fill + sheen (mirrors
 *     BubbleMenu's two-layer pattern).
 *   - Optional controlled mode: pass both `open` and `onToggle` to let the parent own the
 *     open/closed state (needed when a screen must aggregate state across many instances, e.g.
 *     Plans' per-task dirty tracking). Omit both and it behaves exactly as before (internal
 *     useState) — meals.tsx's uncontrolled usage is unaffected.
 *   - `rightAction` is wrapped in its own Pressable that calls `e.stopPropagation()` so taps on
 *     a checkbox/save-pill passed as rightAction don't also toggle the header (same fix as
 *     DayTimeline.tsx's nested dot-button-inside-row Pressable).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, FontSize, getMaterialStyle, MaterialName } from '@/constants/theme';
import { useAppTheme, useAccessibility, useScaledStyles } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/store/useSettingsStore';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  leadingAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  accentColor?: string;
  material?: MaterialName;
};

export default function ExpandableCard({
  title,
  subtitle,
  badge,
  children,
  leadingAction,
  rightAction,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  accentColor,
  material,
}: Props) {
  const isControlled = controlledOpen !== undefined;
  const [openState, setOpenState] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : openState;
  const rotate = useRef(new Animated.Value(open ? 1 : 0)).current;
  const mountedRef = useRef(false);
  const theme = useAppTheme();
  const settingsMaterial = useSettingsStore((s) => s.bubbleMaterial);
  const finish = material ?? settingsMaterial;
  const { reducedMotion } = useAccessibility();
  const styles = useScaledStyles(baseStyles);
  const mat = getMaterialStyle(accentColor ?? theme.orange, finish);

  function animateTo(next: boolean) {
    if (reducedMotion) {
      rotate.setValue(next ? 1 : 0);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Animated.timing(rotate, {
        toValue: next ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }

  // In controlled mode, the parent owns `open` — react to it changing externally
  // (e.g. another Container's "close all" action) instead of animating on mount.
  useEffect(() => {
    if (!isControlled) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    animateTo(open);
  }, [open, isControlled]);

  function toggle() {
    if (isControlled) {
      onToggle?.();
      return;
    }
    animateTo(!openState);
    setOpenState((v) => !v);
  }

  const arrow = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={[
        styles.card,
        {
          borderWidth: mat.borderWidth,
          borderColor: mat.borderColor,
          borderTopColor: mat.borderTopColor,
          borderBottomColor: mat.borderBottomColor,
          shadowColor: theme.shadow,
          shadowOpacity: mat.shadowOpacity,
          shadowRadius: mat.shadowRadius,
          elevation: mat.elevation,
        },
      ]}
    >
      <View style={[styles.mask, { backgroundColor: theme.white }]}>
        <View pointerEvents="none" style={[styles.sheen, { backgroundColor: mat.sheenColor }]} />
        {accentColor && <View style={[styles.accent, { backgroundColor: accentColor }]} />}
        <View style={styles.cardContent}>
          <Pressable style={styles.header} onPress={toggle}>
            <View style={styles.headerLeft}>
              {leadingAction ? (
                <Pressable onPress={(e) => e.stopPropagation()}>{leadingAction}</Pressable>
              ) : null}
              <View style={styles.headerLeftText}>
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                {subtitle ? <Text style={[styles.subtitle, { color: theme.textLight }]}>{subtitle}</Text> : null}
              </View>
            </View>
            <View style={styles.headerRight}>
              {badge ? (
                <View style={[styles.badge, { backgroundColor: theme.orangeLight }]}>
                  <Text style={[styles.badgeText, { color: theme.brown }]}>{badge}</Text>
                </View>
              ) : null}
              {rightAction ? (
                <Pressable onPress={(e) => e.stopPropagation()}>{rightAction}</Pressable>
              ) : null}
              <Animated.View style={{ transform: [{ rotate: arrow }] }}>
                <Ionicons name="chevron-down" size={16} color={theme.textLight} />
              </Animated.View>
            </View>
          </Pressable>
          {open ? <View style={[styles.body, { borderTopColor: theme.grayLight }]}>{children}</View> : null}
        </View>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    shadowOffset: { width: 0, height: 3 },
  },
  // Inner overflow:hidden layer carries fill + sheen, kept separate from `card` so its
  // border/shadow (drawn on the outer view) are never clipped — see BubbleMenu's bubbleMask.
  mask: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerLeftText: { flex: 1 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
});
