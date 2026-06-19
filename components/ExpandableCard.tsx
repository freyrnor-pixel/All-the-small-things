/**
 * ExpandableCard.tsx — collapsible card with animated header chevron.
 *
 * Generic accordion container: shows a title/subtitle/badge row that toggles a
 * body section with a LayoutAnimation expand and a rotating arrow. Content,
 * labels, and optional right action are all passed in as children/props.
 *
 * Connections:
 *   Imports → constants/theme
 *   Used by → app/meals.tsx
 *   Data    → none (presentational); fully driven by props
 *
 * Edit notes:
 *   - LayoutAnimation is enabled on Android via UIManager at module load — keep that guard if refactoring imports.
 *   - Surface uses getMaterialStyle() (same finish system as BubbleMenu) so the card gets a
 *     beveled border + sheen + heavier shadow instead of a flat fill — pass `material` to
 *     override the default 'paper' finish. The outer view carries border/shadow, the inner
 *     overflow:hidden mask carries the fill + sheen (mirrors BubbleMenu's two-layer pattern).
 */
import React, { useRef, useState } from 'react';
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
import { useAppTheme } from '@/lib/useAppTheme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
  material?: MaterialName;
};

export default function ExpandableCard({
  title,
  subtitle,
  badge,
  children,
  rightAction,
  defaultOpen = false,
  accentColor,
  material = 'paper',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const rotate = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const theme = useAppTheme();
  const mat = getMaterialStyle(accentColor ?? theme.orange, material);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotate, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setOpen((v) => !v);
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
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: theme.textLight }]}>{subtitle}</Text> : null}
            </View>
            <View style={styles.headerRight}>
              {badge ? (
                <View style={[styles.badge, { backgroundColor: theme.orangeLight }]}>
                  <Text style={[styles.badgeText, { color: theme.brown }]}>{badge}</Text>
                </View>
              ) : null}
              {rightAction}
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

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
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
  headerLeft: { flex: 1 },
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
