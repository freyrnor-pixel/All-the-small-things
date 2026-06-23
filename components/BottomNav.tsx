/**
 * BottomNav.tsx — bottom navigation bar for every site in the app.
 *
 * Box-grid of all 11 sites (wraps into 2 rows of 6 + 5), the app's only nav entry
 * point now that BubbleMenu is disabled (see app/index.tsx — BubbleMenu work is
 * deferred, see CLAUDE.md). The active tab is derived from the current route,
 * highlighted with a "pushed in" shaded box, and taps go through goToSite() so the
 * navigation stack stays shallow (back always lands on Home, not another site).
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/siteNav, lib/useAppTheme, components/PressableScale
 *   Used by → every bottom-menu site screen: app/index, app/plans, app/shopping, app/meals,
 *             app/health, app/scan, app/budget, app/shared, app/automations, app/habits, app/settings
 *   Data    → none (presentational; navigation only)
 *
 * Edit notes:
 *   - SITE_ITEMS (lib/siteNav.ts) is the single source of truth for which sites exist and
 *     their order — add new sites there, not here, so BottomNav and SiteSwipeView stay in sync.
 *   - Item width is a fixed 1/6 of the bar so 6 items fill row 1 and the remaining 5 wrap to
 *     row 2 — keep SITE_ITEMS at 11 entries or recompute this if that count changes.
 *   - BOTTOM_NAV_HEIGHT is exported so screens with their own absolutely-positioned bottom
 *     overlays (e.g. app/shopping.tsx's FAB + sticky footer) can offset above this (now taller,
 *     2-row) bar.
 *   - Active-state shading is deliberately plain (border + fill, no theme colour material) per
 *     "functional and looking ok, colour/nuance later."
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/lib/i18n';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { goToSite, SITE_ITEMS } from '@/lib/siteNav';
import PressableScale from '@/components/PressableScale';

export const BOTTOM_NAV_HEIGHT = 120;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  return (
    <View style={[styles.bar, { backgroundColor: theme.white, borderTopColor: theme.grayLight }]}>
      {SITE_ITEMS.map((item) => {
        const active = pathname === item.route;
        const color = active ? theme.orange : theme.textLight;
        return (
          <PressableScale
            key={item.key}
            scaleTo={0.92}
            style={[
              styles.item,
              active && [styles.itemActive, { backgroundColor: theme.grayLight }],
            ]}
            onPress={() => goToSite(router, pathname, item.route)}
            hitSlop={4}
          >
            <Ionicons name={active ? item.activeIcon : item.icon} size={20} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {t.nav[item.key]}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const ITEM_WIDTH = `${100 / 6}%` as const;

const baseStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingTop: Spacing.xs,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  itemActive: {
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.16)',
    borderLeftColor: 'rgba(0,0,0,0.16)',
    borderBottomColor: 'rgba(255,255,255,0.7)',
    borderRightColor: 'rgba(255,255,255,0.7)',
    marginHorizontal: 1,
  },
  label: { fontSize: FontSize.xs, fontWeight: '600' },
});
