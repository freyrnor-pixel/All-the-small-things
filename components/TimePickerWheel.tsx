/**
 * TimePickerWheel.tsx — dual scrolling wheels for picking an HH:MM time.
 *
 * Two snap-scrolling FlatList wheels (hours 0–23, minutes 0–59) with a center
 * selection band. Emits the selected "HH:MM" string via onChange as each wheel
 * settles. Theme colors are injected via the `theme` prop. Pass `size="compact"`
 * to shrink item height + fonts for layouts that need two wheels side by side
 * (e.g. work-mode From/To) instead of the full-size default.
 *
 * Connections:
 *   Imports → constants/theme
 *   Used by → app/settings.tsx, app/task-form.tsx
 *   Data    → none (presentational); value in / onChange out; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - Selected values are tracked in refs (curHour/curMin) to avoid closure staleness inside scroll handlers; keep state + refs in sync if changing.
 *   - Geometry depends on ITEM_H and VISIBLE (must stay odd); initial scroll-to-offset runs on an 80ms timeout after mount.
 *     Slimmed from 50px/5 rows (250px tall) to 44px/3 rows (132px tall) to take up less space in scrolling forms.
 *   - `size` picks one of two pre-built StyleSheets (different ITEM_H/fonts) rather than
 *     computing geometry inline, so both variants still flow through useScaledStyles().
 *   - Both FlatLists need nestedScrollEnabled — this component is nested inside a parent ScrollView
 *     (task-form, settings), and without it Android intercepts the touch for the outer scroller instead
 *     of letting the wheel scroll independently.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppColors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

const VISIBLE = 3; // must be odd

const SIZES = {
  default: { itemH: 44, itemFont: FontSize.lg, itemFontActive: FontSize.xl, colonFont: FontSize.xl },
  compact: { itemH: 34, itemFont: FontSize.sm, itemFontActive: FontSize.md, colonFont: FontSize.lg },
};

interface Props {
  value: string; // HH:MM
  onChange: (value: string) => void;
  theme: AppColors;
  size?: 'default' | 'compact';
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseTime(v: string): [number, number] {
  const [h, m] = v.split(':').map((s) => parseInt(s, 10));
  return [Math.max(0, Math.min(23, h || 0)), Math.max(0, Math.min(59, m || 0))];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function TimePickerWheel({ value, onChange, theme, size = 'default' }: Props) {
  const ITEM_H = SIZES[size].itemH;
  const styles = useScaledStyles(size === 'compact' ? compactStyles : baseStyles);
  const [initH, initM] = parseTime(value || '12:00');

  const hourRef = useRef<FlatList>(null);
  const minRef = useRef<FlatList>(null);

  // Refs track current selected values without closure staleness
  const curHour = useRef(initH);
  const curMin = useRef(initM);

  // Local state for highlighted item rendering
  const [displayHour, setDisplayHour] = useState(initH);
  const [displayMin, setDisplayMin] = useState(initM);

  useEffect(() => {
    const timer = setTimeout(() => {
      hourRef.current?.scrollToOffset({ offset: initH * ITEM_H, animated: false });
      minRef.current?.scrollToOffset({ offset: initM * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  function onHourEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const h = Math.max(0, Math.min(23, idx));
    curHour.current = h;
    setDisplayHour(h);
    onChange(`${pad(h)}:${pad(curMin.current)}`);
  }

  function onMinEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const m = Math.max(0, Math.min(59, idx));
    curMin.current = m;
    setDisplayMin(m);
    onChange(`${pad(curHour.current)}:${pad(m)}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.white }]}>
      {/* Center selection band */}
      <View
        style={[styles.band, { backgroundColor: theme.grayLight }]}
        pointerEvents="none"
      />

      <View style={styles.wheels}>
        <FlatList
          ref={hourRef}
          data={HOURS}
          keyExtractor={(n) => `h${n}`}
          style={styles.wheel}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
          contentContainerStyle={styles.listPad}
          onMomentumScrollEnd={onHourEnd}
          onScrollEndDrag={onHourEnd}
          nestedScrollEnabled
          renderItem={({ item }) => {
            const active = item === displayHour;
            return (
              <View style={styles.item}>
                <Text style={[
                  styles.itemText,
                  { color: active ? theme.text : theme.gray },
                  active && styles.itemTextActive,
                ]}>
                  {pad(item)}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.colonWrap} pointerEvents="none">
          <Text style={[styles.colon, { color: theme.text }]}>:</Text>
        </View>

        <FlatList
          ref={minRef}
          data={MINUTES}
          keyExtractor={(n) => `m${n}`}
          style={styles.wheel}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
          contentContainerStyle={styles.listPad}
          onMomentumScrollEnd={onMinEnd}
          onScrollEndDrag={onMinEnd}
          nestedScrollEnabled
          renderItem={({ item }) => {
            const active = item === displayMin;
            return (
              <View style={styles.item}>
                <Text style={[
                  styles.itemText,
                  { color: active ? theme.text : theme.gray },
                  active && styles.itemTextActive,
                ]}>
                  {pad(item)}
                </Text>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

function buildStyles(itemH: number, itemFont: number, itemFontActive: number, colonFont: number, colonWidth: number) {
  const wheelH = itemH * VISIBLE;
  const pad = itemH * Math.floor(VISIBLE / 2);
  return StyleSheet.create({
    container: {
      borderRadius: Radius.md,
      height: wheelH,
      overflow: 'hidden',
      position: 'relative',
    },
    band: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: pad,
      height: itemH,
      zIndex: 1,
      borderRadius: Radius.sm,
      marginHorizontal: Spacing.sm,
    },
    wheels: {
      flexDirection: 'row',
      alignItems: 'center',
      height: wheelH,
      zIndex: 2,
    },
    wheel: {
      flex: 1,
      height: wheelH,
    },
    listPad: { paddingVertical: pad },
    colonWrap: {
      width: colonWidth,
      alignItems: 'center',
      justifyContent: 'center',
      height: wheelH,
    },
    colon: {
      fontSize: colonFont,
      fontWeight: '700',
      marginTop: -4,
    },
    item: {
      height: itemH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemText: {
      fontSize: itemFont,
      fontWeight: '400',
    },
    itemTextActive: {
      fontSize: itemFontActive,
      fontWeight: '700',
    },
  });
}

const baseStyles = buildStyles(SIZES.default.itemH, SIZES.default.itemFont, SIZES.default.itemFontActive, SIZES.default.colonFont, 24);
const compactStyles = buildStyles(SIZES.compact.itemH, SIZES.compact.itemFont, SIZES.compact.itemFontActive, SIZES.compact.colonFont, 18);
