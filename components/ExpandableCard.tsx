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
import { Radius, Shadow, Spacing, FontSize } from '@/constants/theme';
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
  const theme = useAppTheme();

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
    <View style={[styles.card, { backgroundColor: theme.white }]}>
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
            <Animated.Text style={[styles.arrow, { color: theme.textLight, transform: [{ rotate: arrow }] }]}>
              ›
            </Animated.Text>
          </View>
        </Pressable>
        {open ? <View style={[styles.body, { borderTopColor: theme.grayLight }]}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  arrow: {
    fontSize: 20,
    lineHeight: 24,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
});
