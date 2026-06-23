/**
 * BottomNav.tsx — bottom navigation bar for the app's main sections.
 *
 * Straightforward 5-tab row (Home / Shopping / Meals / Health / Habits) that stands
 * in for the disabled BubbleMenu (see app/index.tsx) as the primary nav entry point.
 * The active tab is derived from the current route and highlighted; navigation goes
 * through Expo Router.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme
 *   Used by → app/index.tsx, app/shopping.tsx, app/meals.tsx, app/health.tsx, app/habits.tsx
 *   Data    → none (presentational; navigation only)
 *
 * Edit notes:
 *   - Icons are reused from BubbleMenu's WHEEL_ITEMS (shop/habits/health/meals) for visual
 *     consistency; "home" has no bubble equivalent so home-outline/home was picked to match
 *     the same outline-vs-filled convention used for the active state elsewhere (e.g. the
 *     focus star toggle in app/index.tsx).
 *   - Labels come from t.nav (shop/habits/health/meals already existed there for the bubble
 *     menu; `home` was added alongside them).
 *   - BOTTOM_NAV_HEIGHT is exported so screens with their own absolutely-positioned bottom
 *     overlays (e.g. app/shopping.tsx's FAB + sticky footer) can offset above this bar.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/lib/i18n';
import { FontSize, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type NavItemKey = 'home' | 'shop' | 'meals' | 'health' | 'habits';

export const BOTTOM_NAV_HEIGHT = 64;

const ITEMS: { key: NavItemKey; icon: IoniconsName; activeIcon: IoniconsName; route: '/' | '/shopping' | '/meals' | '/health' | '/habits' }[] = [
  { key: 'home', icon: 'home-outline', activeIcon: 'home', route: '/' },
  { key: 'shop', icon: 'cart-outline', activeIcon: 'cart', route: '/shopping' },
  { key: 'meals', icon: 'restaurant-outline', activeIcon: 'restaurant', route: '/meals' },
  { key: 'health', icon: 'heart-outline', activeIcon: 'heart', route: '/health' },
  { key: 'habits', icon: 'leaf-outline', activeIcon: 'leaf', route: '/habits' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  return (
    <View style={[styles.bar, { backgroundColor: theme.white, borderTopColor: theme.grayLight }]}>
      {ITEMS.map((item) => {
        const active = pathname === item.route;
        const color = active ? theme.orange : theme.textLight;
        return (
          <Pressable key={item.key} style={styles.item} onPress={() => router.push(item.route)} hitSlop={6}>
            <Ionicons name={active ? item.activeIcon : item.icon} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{t.nav[item.key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  label: { fontSize: FontSize.xs, fontWeight: '600' },
});
