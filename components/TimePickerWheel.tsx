/**
 * TimePickerWheel.tsx — dual scrolling wheels + direct text entry for picking an HH:MM time.
 *
 * A masked "HH:MM" text input sits above two infinitely-wrapping snap-scrolling FlatList
 * wheels (hours 0–23, minutes 0–59) with a center selection band. Typing and scrolling stay
 * in sync — both paths commit through the same onChange("HH:MM") callback. Pass
 * `size="compact"` to shrink item height + fonts for layouts that need two wheels side by
 * side (e.g. work-mode From/To) instead of the full-size default.
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme
 *   Used by → app/settings.tsx, app/task-form.tsx, app/habit-form.tsx, app/onboarding/step2.tsx
 *   Data    → none (presentational); value in / onChange out; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - Selected positions are tracked in refs (curHourIdx/curMinIdx) as raw row indices into
 *     the duplicated wheel data — NOT 0–23/0–59 values, use `% HOUR_RANGE`/`% MIN_RANGE` to
 *     get the real value. Refs avoid closure staleness inside scroll handlers; keep state +
 *     refs in sync if changing.
 *   - Wraparound: each wheel renders CYCLES duplicate copies of its range (HOURS/MINUTES, built
 *     once at module scope) so scrolling feels infinite. When a scroll settles inside the
 *     outermost two cycles on either edge, we silently scrollToOffset (no animation) back to
 *     the equivalent row in the middle cycle — the displayed number doesn't change, only which
 *     physical duplicate row is showing underneath. Don't shrink CYCLES below ~7 or a fast fling
 *     can outrun the recenter and hit the real list edge (bounce instead of wrap).
 *   - `size` picks one of two pre-built StyleSheets via the buildStyles(itemH, ...) factory
 *     (different ITEM_H/PAD/fonts), rather than computing geometry inline, so both variants
 *     still flow through useScaledStyles(). ITEM_H/PAD are otherwise per-instance (derived from
 *     `size` inside the component), not module constants — getItemLayout, snapToInterval and the
 *     scrollToOffset calls all read the local ITEM_H/PAD, not a shared one.
 *   - getItemLayout's offset MUST include PAD (the contentContainerStyle paddingVertical) since
 *     that's the true rendered top of each row. A previous version omitted it, which desyncs
 *     FlatList's virtualization windowing from real layout — shows up as the centered number
 *     glitching/jumping mid-scroll, and gets worse the longer the (now wrapped) list is.
 *   - activeHourIdx/activeMinIdx update on every onScroll frame (not just on settle) and are
 *     passed via `extraData`, not just closed over by renderItem — FlatList cells don't re-render
 *     on a renderItem identity change alone, only on data/extraData changes, so without
 *     extraData the centered/bold digit would lag or never update while scrolling.
 *   - The text input is separate `text` state, not derived from curHour/curMin on every
 *     keystroke. onChangeText only commits to the wheel/parent once 4 digits are typed; a
 *     keystroke that would push hour > 23 or minute > 59 is rejected by returning early without
 *     calling setText (controlled input snaps back to the last valid string). On blur, an
 *     incomplete value reverts to the last committed time instead of being left half-typed.
 *   - Both FlatLists need nestedScrollEnabled — this component is nested inside a parent
 *     ScrollView (task-form, settings, habit-form, onboarding), and without it Android
 *     intercepts the touch for the outer scroller instead of letting the wheel scroll
 *     independently.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppColors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

const VISIBLE = 3; // must be odd

const HOUR_RANGE = 24;
const MIN_RANGE = 60;
const CYCLES = 11; // must be odd; duplicate copies of the range rendered for infinite wrap
const MID_CYCLE = Math.floor(CYCLES / 2);

const SIZES = {
  default: { itemH: 44, itemFont: FontSize.lg, itemFontActive: FontSize.xl, colonFont: FontSize.xl, colonWidth: 24 },
  compact: { itemH: 34, itemFont: FontSize.sm, itemFontActive: FontSize.md, colonFont: FontSize.lg, colonWidth: 18 },
};

interface Props {
  value: string; // HH:MM
  onChange: (value: string) => void;
  theme: AppColors;
  size?: 'default' | 'compact';
}

interface WheelRow {
  idx: number; // raw row index into the duplicated list
  value: number; // 0–23 or 0–59
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseTime(v: string): [number, number] {
  const [h, m] = v.split(':').map((s) => parseInt(s, 10));
  return [Math.max(0, Math.min(23, h || 0)), Math.max(0, Math.min(59, m || 0))];
}

function buildWheelRows(range: number): WheelRow[] {
  return Array.from({ length: range * CYCLES }, (_, i) => ({ idx: i, value: i % range }));
}

const HOURS = buildWheelRows(HOUR_RANGE);
const MINUTES = buildWheelRows(MIN_RANGE);

// Bring a settled index back near the middle once it strays into the outer two cycles on
// either edge, so the user never reaches the real start/end of the (duplicated) list.
function recenter(idx: number, range: number): number {
  const cycle = Math.floor(idx / range);
  if (cycle <= 1 || cycle >= CYCLES - 2) {
    return MID_CYCLE * range + (idx % range);
  }
  return idx;
}

export default function TimePickerWheel({ value, onChange, theme, size = 'default' }: Props) {
  const ITEM_H = SIZES[size].itemH;
  const PAD = ITEM_H * Math.floor(VISIBLE / 2);
  const styles = useScaledStyles(size === 'compact' ? compactStyles : baseStyles);
  const [initH, initM] = parseTime(value || '12:00');

  const hourRef = useRef<FlatList<WheelRow>>(null);
  const minRef = useRef<FlatList<WheelRow>>(null);

  const initHourIdx = MID_CYCLE * HOUR_RANGE + initH;
  const initMinIdx = MID_CYCLE * MIN_RANGE + initM;

  // Refs track the current raw row index without closure staleness
  const curHourIdx = useRef(initHourIdx);
  const curMinIdx = useRef(initMinIdx);

  // Local state for the centered/highlighted row — updated live while scrolling
  const [activeHourIdx, setActiveHourIdx] = useState(initHourIdx);
  const [activeMinIdx, setActiveMinIdx] = useState(initMinIdx);

  const [text, setText] = useState(`${pad(initH)}:${pad(initM)}`);

  useEffect(() => {
    const timer = setTimeout(() => {
      hourRef.current?.scrollToOffset({ offset: initHourIdx * ITEM_H, animated: false });
      minRef.current?.scrollToOffset({ offset: initMinIdx * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  function commit(h: number, m: number) {
    setText(`${pad(h)}:${pad(m)}`);
    onChange(`${pad(h)}:${pad(m)}`);
  }

  function onHourScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.max(0, Math.min(HOURS.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    setActiveHourIdx(idx);
  }

  function onMinScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.max(0, Math.min(MINUTES.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    setActiveMinIdx(idx);
  }

  function onHourEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = Math.max(0, Math.min(HOURS.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    const idx = recenter(raw, HOUR_RANGE);
    if (idx !== raw) {
      hourRef.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false });
    }
    curHourIdx.current = idx;
    setActiveHourIdx(idx);
    commit(idx % HOUR_RANGE, curMinIdx.current % MIN_RANGE);
  }

  function onMinEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = Math.max(0, Math.min(MINUTES.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    const idx = recenter(raw, MIN_RANGE);
    if (idx !== raw) {
      minRef.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false });
    }
    curMinIdx.current = idx;
    setActiveMinIdx(idx);
    commit(curHourIdx.current % HOUR_RANGE, idx % MIN_RANGE);
  }

  // Jump both wheels to a typed h:m, landing in the middle cycle (always safely away from the edges)
  function jumpTo(h: number, m: number) {
    const hIdx = MID_CYCLE * HOUR_RANGE + h;
    const mIdx = MID_CYCLE * MIN_RANGE + m;
    curHourIdx.current = hIdx;
    curMinIdx.current = mIdx;
    setActiveHourIdx(hIdx);
    setActiveMinIdx(mIdx);
    hourRef.current?.scrollToOffset({ offset: hIdx * ITEM_H, animated: false });
    minRef.current?.scrollToOffset({ offset: mIdx * ITEM_H, animated: false });
  }

  function handleChangeText(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);

    // Reject (ignore) a keystroke that would push hour/minute out of range rather than clamping,
    // so e.g. typing "9" then "9" for hours leaves "9" on screen instead of jumping to "23".
    if (hh.length === 2 && parseInt(hh, 10) > 23) return;
    if (mm.length === 2 && parseInt(mm, 10) > 59) return;

    setText(digits.length > 2 ? `${hh}:${mm}` : hh);

    if (digits.length === 4) {
      jumpTo(parseInt(hh, 10), parseInt(mm, 10));
      onChange(`${hh}:${mm}`);
    }
  }

  function handleBlur() {
    setText(`${pad(curHourIdx.current % HOUR_RANGE)}:${pad(curMinIdx.current % MIN_RANGE)}`);
  }

  return (
    <View>
      <TextInput
        style={[styles.textInput, { backgroundColor: theme.white, color: theme.text, borderColor: theme.border }]}
        value={text}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        keyboardType="number-pad"
        maxLength={5}
        placeholder="--:--"
        placeholderTextColor={theme.gray}
        selectTextOnFocus
        textAlign="center"
      />

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
            extraData={activeHourIdx}
            keyExtractor={(row) => `h${row.idx}`}
            style={styles.wheel}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_H}
            decelerationRate="fast"
            getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i + PAD, index: i })}
            contentContainerStyle={styles.listPad}
            onScroll={onHourScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onHourEnd}
            onScrollEndDrag={onHourEnd}
            nestedScrollEnabled
            renderItem={({ item }) => {
              const active = item.idx === activeHourIdx;
              return (
                <View style={styles.item}>
                  <Text style={[
                    styles.itemText,
                    { color: active ? theme.text : theme.gray },
                    active && styles.itemTextActive,
                  ]}>
                    {pad(item.value)}
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
            extraData={activeMinIdx}
            keyExtractor={(row) => `m${row.idx}`}
            style={styles.wheel}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_H}
            decelerationRate="fast"
            getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i + PAD, index: i })}
            contentContainerStyle={styles.listPad}
            onScroll={onMinScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMinEnd}
            onScrollEndDrag={onMinEnd}
            nestedScrollEnabled
            renderItem={({ item }) => {
              const active = item.idx === activeMinIdx;
              return (
                <View style={styles.item}>
                  <Text style={[
                    styles.itemText,
                    { color: active ? theme.text : theme.gray },
                    active && styles.itemTextActive,
                  ]}>
                    {pad(item.value)}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </View>
    </View>
  );
}

function buildStyles(itemH: number, itemFont: number, itemFontActive: number, colonFont: number, colonWidth: number) {
  const wheelH = itemH * VISIBLE;
  const wheelPad = itemH * Math.floor(VISIBLE / 2);
  return StyleSheet.create({
    textInput: {
      height: 44,
      borderRadius: Radius.sm,
      borderWidth: 1,
      fontSize: FontSize.lg,
      fontWeight: '600',
      marginBottom: Spacing.sm,
      letterSpacing: 1,
    },
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
      top: wheelPad,
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
    listPad: { paddingVertical: wheelPad },
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

const baseStyles = buildStyles(SIZES.default.itemH, SIZES.default.itemFont, SIZES.default.itemFontActive, SIZES.default.colonFont, SIZES.default.colonWidth);
const compactStyles = buildStyles(SIZES.compact.itemH, SIZES.compact.itemFont, SIZES.compact.itemFontActive, SIZES.compact.colonFont, SIZES.compact.colonWidth);
