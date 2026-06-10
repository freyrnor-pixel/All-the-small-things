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
 *   - Uses static Colors (not the per-user theme); restyle here if dark-mode support is needed.
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
import { Colors, Radius, Shadow, Spacing, FontSize } from '@/constants/theme';

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
};

export default function ExpandableCard({
  title,
  subtitle,
  badge,
  children,
  rightAction,
  defaultOpen = false,
  accentColor,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const rotate = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

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
    <View style={styles.card}>
      {accentColor && <View style={[styles.accent, { backgroundColor: accentColor }]} />}
      <View style={styles.cardContent}>
        <Pressable style={styles.header} onPress={toggle}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.headerRight}>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
            {rightAction}
            <Animated.Text style={[styles.arrow, { transform: [{ rotate: arrow }] }]}>
              ›
            </Animated.Text>
          </View>
        </Pressable>
        {open ? <View style={styles.body}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Shadow.card,
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
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.orangeLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: Colors.brown,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 20,
    color: Colors.textLight,
    lineHeight: 24,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.grayLight,
  },
});
