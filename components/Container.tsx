/**
 * Container.tsx — padlock-gated card that always renders its children.
 *
 * Replaces the old AddItemSheet bottom-sheet editing model: content (shopping list rows,
 * inventory rows, etc.) lives inline inside a Container at all times — there's no
 * collapse/expand here, unlike ExpandableCard. The header-right padlock toggles
 * locked/unlocked; callers are responsible for dimming/disabling their own add/remove/edit
 * affordances when `locked` is true (the checkmark-circle equivalent should stay
 * interactive regardless — locking only gates add/remove/edit, never the "done" action).
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme
 *   Used by → app/shopping.tsx
 *   Data    → none (driven entirely by props)
 *
 * Edit notes:
 *   - Visual chrome (card shell, getMaterialStyle() finish, two-layer border+mask
 *     pattern) is borrowed from ExpandableCard.tsx — keep the two in sync if the shared
 *     look changes, they're deliberately not consolidated since their open/closed vs.
 *     locked/unlocked semantics differ.
 *   - No precedent lock-affordance existed in this repo before this component — unlocked
 *     uses `accentColor` (defaults to theme.orange), locked uses theme.textLight.
 *   - `title` accepts a node (not just a string) so callers can swap in an inline-rename
 *     TextInput in place of the label — a string renders inside the usual styled <Text>,
 *     anything else renders as-is (un-wrapped, since RN can't nest arbitrary components
 *     inside <Text>). shopping.tsx's WeekListCard is the first consumer of this.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, FontSize, getMaterialStyle, MaterialName } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { useSettingsStore } from '@/store/useSettingsStore';

type Props = {
  title: React.ReactNode;
  subtitle?: string;
  locked: boolean;
  onToggleLock: () => void;
  rightAction?: React.ReactNode;
  accentColor?: string;
  material?: MaterialName;
  children: React.ReactNode;
};

export default function Container({
  title,
  subtitle,
  locked,
  onToggleLock,
  rightAction,
  accentColor,
  material,
  children,
}: Props) {
  const theme = useAppTheme();
  const settingsMaterial = useSettingsStore((s) => s.bubbleMaterial);
  const finish = material ?? settingsMaterial;
  const styles = useScaledStyles(baseStyles);
  const mat = getMaterialStyle(accentColor ?? theme.orange, finish);
  const lockColor = locked ? theme.textLight : (accentColor ?? theme.orange);

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
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {typeof title === 'string' ? (
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              ) : (
                title
              )}
              {subtitle ? <Text style={[styles.subtitle, { color: theme.textLight }]}>{subtitle}</Text> : null}
            </View>
            <View style={styles.headerRight}>
              {rightAction}
              <Pressable
                onPress={onToggleLock}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={locked ? 'Unlock' : 'Lock'}
              >
                <Ionicons name={locked ? 'lock-closed' : 'lock-open'} size={20} color={lockColor} />
              </Pressable>
            </View>
          </View>
          <View style={[styles.body, { borderTopColor: theme.grayLight }]}>{children}</View>
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
    paddingBottom: Spacing.sm,
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
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
});
