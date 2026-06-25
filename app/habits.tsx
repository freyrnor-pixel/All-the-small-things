/**
 * habits.tsx — habit tracker
 *
 * Tracks build/break habits with daily-goal counters and three views (today /
 * week grid / month grid). Today view groups habits into Building and Breaking
 * sections; tapping a card expands the cue→craving→response→reward steps plus a
 * week strip. Long-press (or the per-habit edit) opens the habit form.
 *
 * Connections:
 *   Imports → components/AppModal, components/BottomNav, components/HintCard, components/CompletionGlow, components/HabitIcon, components/ScreenBackground, components/ScreenHeader, components/SiteSwipeView, constants/theme, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, store/useHabitStore, store/useSettingsStore
 *   Used by → Expo Router route "/habits"
 *   Data    → useHabitStore (habits + habit_logs tables) via increment/decrement; colour theme + language from useSettingsStore
 *
 * Edit notes:
 *   - Several sub-components (ProgressDots, StreakBadge, WeekStrip, HabitCard, WeekView, MonthView, HabitsScreen) share one module-level baseStyles object — each calls useScaledStyles(baseStyles) itself for text-size scaling.
 *   - All visible strings go through useT(); per-day keys are YYYY-MM-DD via todayStr()/dateStr() (week starts Monday).
 *   - increment/decrement key off (habitId, today) into habit_logs; counts are clamped against dailyGoal for ratio/colour.
 *   - Edit navigates to the /habit-form modal; the empty-section CTAs pre-seed the `kind` param.
 *   - No-shame: past days with 0 progress show an empty circle in theme.neutral — no red/✗ indicators.
 *   - Missed days silently reset the streak; no separate "missed" counter displayed (Proposal 5).
 *   - W-D: emotional screen — uses useSoftTheme(). habitColor() resolves build=green / break=blue
 *     (NEVER red). computeStreak() derives the current streak locally from logs (no store getter
 *     exists). Completed cards lock into a satisfied fill + success() haptic + CompletionGlow.
 *   - Rest day (AP-03c): each expanded HabitCard has a "Resting today" toggle (markRestDay) for
 *     today only — framed gently, never "skipped". computeStreak() treats a rest day as met, so
 *     resting never breaks the streak. WeekStrip shows past rest days as a solid theme.neutral dot,
 *     distinct from both a met day (build/break colour) and a missed one (empty/transparent).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHabitStore, Habit, HabitKind, HabitLog } from '@/store/useHabitStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import HintCard from '@/components/HintCard';
import CompletionGlow from '@/components/CompletionGlow';
import HabitIcon from '@/components/HabitIcon';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import { showAppModal } from '@/components/AppModal';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { Ionicons } from '@expo/vector-icons';
import { success, warning, heavy, selection } from '@/lib/haptics';
import { todayStr, dateStr, getWeekDates, getMonthDates } from '@/lib/date';
import { AppColors, Colors, FontSize, Radius, Shadow, Spacing, Fonts } from '@/constants/theme';
import { useSoftTheme, useAccessibility, useScaledStyles } from '@/lib/useAppTheme';

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Week/month date helpers live in lib/date (getWeekDates, getMonthDates).

// W-D: build = warm/green, break = cool/blue. NEVER red — breaking a habit is not failure.
// Break uses a calm blue so it reads as a different (cool) family from build's green.
const BREAK_BLUE = '#4A8EC2';
const BREAK_BLUE_LIGHT = '#D4E6F4';

function habitColor(kind: HabitKind, theme: AppColors): string {
  return kind === 'break' ? BREAK_BLUE : theme.green;
}

function progressColor(ratio: number, kind: HabitKind, theme: AppColors): string {
  if (ratio >= 1) return habitColor(kind, theme);
  if (ratio > 0) return theme.orange;
  // No-shame: zero progress uses neutral regardless of habit kind — no red punishment colour.
  return theme.neutral;
}

/**
 * Current streak: consecutive met days (count ≥ dailyGoal, or marked as a rest day)
 * ending today (or, if today isn't met yet, ending yesterday so an in-progress day
 * never breaks the display). Rest days count as met — that's the point of resting
 * without losing the streak. No store getter exists, so this is derived locally
 * from the loaded log window.
 */
function computeStreak(habitId: string, goal: number, today: string, logs: HabitLog[]): number {
  if (goal <= 0) return 0;
  // Index this habit's logs by date once, instead of re-scanning all logs for
  // each of the (up to 35) days walked below.
  const byDate = new Map<string, HabitLog>();
  for (const l of logs) if (l.habitId === habitId) byDate.set(l.logDate, l);
  const metOn = (date: string) => {
    const log = byDate.get(date);
    if (!log) return false;
    return log.restDay || log.count >= goal;
  };
  let streak = 0;
  const cursor = new Date(today + 'T12:00:00');
  // If today isn't met, start counting from yesterday (today still in progress).
  if (!metOn(today)) cursor.setDate(cursor.getDate() - 1);
  // Walk backwards over the loaded window (load() keeps ~35 days of logs).
  for (let i = 0; i < 35; i++) {
    if (metOn(dateStr(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const DAY_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_ABBR_NO = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

function ProgressDots({ count, goal, kind, theme }: { count: number; goal: number; kind: HabitKind; theme: AppColors }) {
  const styles = useScaledStyles(baseStyles);
  const dots = Math.min(goal, 8);
  const filled = Math.min(count, dots);
  return (
    <View style={styles.dots}>
      {Array.from({ length: dots }, (_, i) => {
        const isDone = i < filled;
        const color = progressColor(filled / dots, kind, theme);
        return (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: color, backgroundColor: isDone ? color : 'transparent' },
            ]}
          />
        );
      })}
    </View>
  );
}

// W-D: prominent streak — a bold number plus a short row of mini dots (one per recent
// streak day, capped) so the dopamine hook reads at a glance.
function StreakBadge({ streak, color, theme }: { streak: number; color: string; theme: AppColors }) {
  const t = useT();
  const styles = useScaledStyles(baseStyles);
  const dots = Math.min(streak, 7);
  return (
    <View style={styles.streakWrap}>
      <View style={styles.streakHead}>
        <Text style={[styles.streakNum, { color }]}>{streak}</Text>
        <Text style={[styles.streakLabel, { color: theme.textLight }]}>{t.habits.streakLabel}</Text>
      </View>
      {streak > 0 && (
        <View style={styles.streakDots}>
          {Array.from({ length: dots }, (_, i) => (
            <View key={i} style={[styles.streakDot, { backgroundColor: color }]} />
          ))}
        </View>
      )}
    </View>
  );
}

function WeekStrip({
  habitId, today, goal, kind, lang, theme,
}: {
  habitId: string; today: string; goal: number; kind: HabitKind; lang: string; theme: AppColors;
}) {
  const logs = useHabitStore((s) => s.logs);
  const weekDates = useMemo(() => getWeekDates(today), [today]);
  const abbr = lang === 'no' ? DAY_ABBR_NO : DAY_ABBR;
  const styles = useScaledStyles(baseStyles);

  return (
    <View style={styles.weekStrip}>
      {weekDates.map((date, i) => {
        const log = logs.find((l) => l.habitId === habitId && l.logDate === date);
        const count = log?.count ?? 0;
        const ratio = goal > 0 ? Math.min(count / goal, 1) : 0;
        const isFuture = date > today;
        const isRest = !!log?.restDay;
        // Past zero-progress days: neutral border, transparent fill (empty circle — no shame).
        // Rest days get a solid neutral fill — visually distinct from both "met" and "missed".
        const color = isFuture ? theme.grayLight : isRest ? theme.neutral : progressColor(ratio, kind, theme);
        const filled = !isFuture && (isRest || ratio > 0);
        const isToday = date === today;
        return (
          <View key={date} style={styles.dayCol}>
            <Text style={[styles.dayAbbr, { color: theme.textLight }, isToday && { color: theme.orange, fontWeight: '700' }]}>{abbr[i]}</Text>
            <View
              style={[
                styles.weekDot,
                { borderColor: color, backgroundColor: filled ? color : 'transparent' },
                isToday && styles.weekDotToday,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function HabitCard({
  habit, today, onEdit, lang, theme,
}: {
  habit: Habit; today: string; onEdit: (id: string) => void; lang: string; theme: AppColors;
}) {
  const [expanded, setExpanded] = useState(false);
  const logs = useHabitStore((s) => s.logs);
  const increment = useHabitStore((s) => s.increment);
  const decrement = useHabitStore((s) => s.decrement);
  const markRestDay = useHabitStore((s) => s.markRestDay);
  const t = useT();
  const { reducedMotion } = useAccessibility();
  const styles = useScaledStyles(baseStyles);

  const log = logs.find((l) => l.habitId === habit.id && l.logDate === today);
  const count = log?.count ?? 0;
  const isRestToday = log?.restDay ?? false;
  const ratio = habit.dailyGoal > 0 ? Math.min(count / habit.dailyGoal, 1) : 0;
  const isDone = ratio >= 1;

  const accent = habitColor(habit.kind, theme);
  const doneFill = habit.kind === 'break' ? BREAK_BLUE_LIGHT : theme.greenLight;
  const streak = useMemo(
    () => computeStreak(habit.id, habit.dailyGoal, today, logs),
    [habit.id, habit.dailyGoal, today, logs],
  );

  // Fire a success haptic + completion glow on the rising edge of "done today".
  const prevDone = useRef(isDone);
  const [glow, setGlow] = useState(0);
  useEffect(() => {
    if (isDone && !prevDone.current) {
      success();
      setGlow((g) => g + 1);
    }
    prevDone.current = isDone;
  }, [isDone]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isDone && !reducedMotion) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ])
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => { pulseRef.current?.stop(); };
  }, [isDone, reducedMotion]);

  const borderColor = progressColor(ratio, habit.kind, theme);
  const stepLabels = [t.habitCue, t.habitCraving, t.habitResponse, t.habitReward];
  const stepValues = [habit.cue, habit.craving, habit.response, habit.reward];

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      onLongPress={() => onEdit(habit.id)}
    >
      <View
        style={[
          styles.habitCard,
          { borderLeftColor: borderColor, backgroundColor: theme.white },
          // W-D: completing locks the card into a satisfied fill — build (green) / break (blue).
          isDone && { backgroundColor: doneFill, borderLeftColor: accent },
        ]}
      >
        {/* W-D: success bloom on the rising edge of completion (build/break-tinted). */}
        <CompletionGlow trigger={glow} color={accent} />

        {/* Header row */}
        <View style={styles.cardHeader}>
          <Animated.View style={[styles.habitIcon, { transform: [{ scale: pulseAnim }] }]}>
            {isDone
              ? <Ionicons name="checkmark" size={22} color={accent} />
              : <HabitIcon icon={habit.icon} size={22} color={accent} />}
          </Animated.View>
          <View style={styles.habitTitleWrap}>
            <Text style={[styles.habitTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
            {/* Streak stays prominent (the dopamine hook); when done, a "done today" pill joins it. */}
            <View style={styles.titleMetaRow}>
              <StreakBadge streak={streak} color={accent} theme={theme} />
              {isDone && (
                <View style={[styles.donePill, { backgroundColor: accent }]}>
                  <Text style={styles.donePillText}>{t.habits.doneToday}</Text>
                </View>
              )}
            </View>
          </View>
          <ProgressDots count={count} goal={habit.dailyGoal} kind={habit.kind} theme={theme} />
          <Pressable
            style={[styles.adjBtn, { backgroundColor: theme.grayLight }]}
            onPress={() => decrement(habit.id, today)}
            hitSlop={8}
          >
            <Text style={[styles.adjBtnText, { color: theme.textLight }]}>−</Text>
          </Pressable>
          <Pressable
            style={[styles.adjBtn, styles.adjBtnPlus, { backgroundColor: borderColor }]}
            onPress={() => increment(habit.id, today)}
            hitSlop={8}
          >
            <Text style={styles.adjBtnPlusText}>+</Text>
          </Pressable>
        </View>

        {/* Expanded */}
        {expanded && (
          <View style={styles.expanded}>
            {stepLabels.map((label, i) =>
              stepValues[i] ? (
                <View key={i} style={styles.stepRow}>
                  <Text style={[styles.stepLabel, { color: theme.textLight }]}>{label}</Text>
                  <Text style={[styles.stepArrow, { color: theme.textLight }]}>→</Text>
                  <Text style={[styles.stepValue, { color: theme.text }]}>{stepValues[i]}</Text>
                </View>
              ) : null
            )}
            <View style={[styles.weekStripWrap, { borderTopColor: theme.grayLight }]}>
              <WeekStrip
                habitId={habit.id}
                today={today}
                goal={habit.dailyGoal}
                kind={habit.kind}
                lang={lang}
                theme={theme}
              />
            </View>
            <Pressable
              style={[
                styles.restDayBtn,
                { borderColor: theme.grayLight },
                isRestToday && { backgroundColor: theme.neutral, borderColor: theme.neutral },
              ]}
              onPress={() => {
                selection();
                markRestDay(habit.id, today);
              }}
            >
              <Ionicons name="moon" size={14} color={isRestToday ? theme.white : theme.textLight} />
              <Text style={[styles.restDayText, { color: isRestToday ? theme.white : theme.textLight }]}>
                {isRestToday ? t.habits.restingToday : t.habits.restDay}
              </Text>
            </Pressable>
            {isRestToday && (
              <Text style={[styles.restDayHint, { color: theme.textLight }]}>{t.habits.restDayHint}</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Week overview ───────────────────────────────────────────────────────────

function WeekView({
  habits, today, lang, theme,
}: {
  habits: Habit[]; today: string; lang: string; theme: AppColors;
}) {
  const logs = useHabitStore((s) => s.logs);
  const weekDates = useMemo(() => getWeekDates(today), [today]);
  const abbr = lang === 'no' ? DAY_ABBR_NO : DAY_ABBR;
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  if (habits.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <EmptyState text={t.noHabitsYet} />
      </View>
    );
  }

  return (
    <View style={styles.weekGrid}>
      {/* Header */}
      <View style={styles.weekGridRow}>
        <View style={styles.weekGridLabel} />
        {weekDates.map((date, i) => (
          <View key={date} style={styles.weekGridCell}>
            <Text style={[styles.weekGridDayAbbr, { color: theme.textLight }, date === today && { color: theme.orange, fontWeight: '700' }]}>
              {abbr[i]}
            </Text>
            <Text style={[styles.weekGridDate, { color: theme.textLight }, date === today && { fontWeight: '700' }]}>
              {date.slice(8)}
            </Text>
          </View>
        ))}
      </View>

      {habits.map((habit) => (
        <View key={habit.id} style={styles.weekGridRow}>
          <View style={styles.weekGridLabel}>
            <HabitIcon icon={habit.icon} size={16} color={theme.textLight} />

            <Text style={[styles.weekGridTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
          </View>
          {weekDates.map((date) => {
            const log = logs.find((l) => l.habitId === habit.id && l.logDate === date);
            const ratio = habit.dailyGoal > 0 ? Math.min((log?.count ?? 0) / habit.dailyGoal, 1) : 0;
            const isFuture = date > today;
            const color = isFuture ? theme.grayLight : progressColor(ratio, habit.kind, theme);
            const filled = !isFuture && ratio > 0;
            return (
              <View key={date} style={styles.weekGridCell}>
                <View style={[
                  styles.weekGridDot,
                  { backgroundColor: filled ? color : 'transparent', borderColor: isFuture ? theme.grayLight : color },
                ]} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Month overview ───────────────────────────────────────────────────────────

function MonthView({
  habits, today, theme,
}: {
  habits: Habit[]; today: string; theme: AppColors;
}) {
  const logs = useHabitStore((s) => s.logs);
  const t = useT();
  const styles = useScaledStyles(baseStyles);
  const [offset, setOffset] = useState(0); // 0 = current month, -1 = last month

  const { year, month, label, dates } = useMemo(() => {
    const base = new Date(today + 'T12:00:00');
    base.setMonth(base.getMonth() + offset);
    const y = base.getFullYear();
    const m = base.getMonth() + 1;
    return {
      year: y,
      month: m,
      label: `${String(m).padStart(2, '0')} / ${y}`,
      dates: getMonthDates(y, m),
    };
  }, [today, offset]);

  // load() only keeps the last 35 days of logs (streak window) — navigating to an
  // earlier month would silently show empty dots regardless of actual history, so
  // cap ‹ at the month containing the start of that window.
  const minOffset = useMemo(() => {
    const cutoff = new Date(today + 'T12:00:00');
    cutoff.setDate(cutoff.getDate() - 35);
    const base = new Date(today + 'T12:00:00');
    return (cutoff.getFullYear() - base.getFullYear()) * 12 + (cutoff.getMonth() - base.getMonth());
  }, [today]);

  if (habits.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <EmptyState text={t.noHabitsYet} />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.monthNav}>
        <Pressable
          onPress={() => setOffset((o) => Math.max(minOffset, o - 1))}
          style={[styles.monthNavBtn, offset <= minOffset && { opacity: 0.3 }]}
          disabled={offset <= minOffset}
        >
          <Text style={[styles.monthNavText, { color: theme.orange }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.text }]}>{label}</Text>
        <Pressable
          onPress={() => setOffset((o) => Math.min(0, o + 1))}
          style={[styles.monthNavBtn, offset >= 0 && { opacity: 0.3 }]}
          disabled={offset >= 0}
        >
          <Text style={[styles.monthNavText, { color: theme.orange }]}>›</Text>
        </Pressable>
      </View>

      {habits.map((habit) => (
        <View key={habit.id} style={[styles.monthRow, { borderBottomColor: theme.grayLight }]}>
          <View style={styles.monthRowLabel}>
            <HabitIcon icon={habit.icon} size={14} color={theme.textLight} />

            <Text style={[styles.monthRowTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.monthDots}>
              {dates.map((date) => {
                const log = logs.find((l) => l.habitId === habit.id && l.logDate === date);
                const ratio = habit.dailyGoal > 0 ? Math.min((log?.count ?? 0) / habit.dailyGoal, 1) : 0;
                const isFuture = date > today;
                // Past zero-progress: empty circle in neutral — no shame.
                const color = isFuture ? theme.grayLight : progressColor(ratio, habit.kind, theme);
                const filled = !isFuture && ratio > 0;
                return (
                  <View key={date} style={styles.monthDotWrap}>
                    <Text style={[styles.monthDotDate, { color: theme.textLight }]}>{date.slice(8)}</Text>
                    <View style={[
                      styles.monthDot,
                      { borderColor: color, backgroundColor: filled ? color : 'transparent' },
                    ]} />
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ViewTab = 'today' | 'week' | 'month';

export default function HabitsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<ViewTab>('today');
  const [selectedProfile, setSelectedProfile] = useState<string>(''); // '' = me/parent
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const today = todayStr();

  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const lang = useSettingsStore((s) => s.language);
  const childProfiles = useSettingsStore((s) => s.childProfiles);
  const updateSettings = useSettingsStore((s) => s.update);
  const theme = useSoftTheme();
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  const profileHabits = habits.filter((h) => h.childName === selectedProfile);

  const buildHabits = profileHabits.filter((h) => h.kind === 'build');
  const breakHabits = profileHabits.filter((h) => h.kind === 'break');
  // 'neutral' habits aren't rendered as cards in the Today view (no Building/Breaking
  // section for them), so exclude them here too — otherwise the summary chip's
  // denominator outgrows the number of visible cards and 100% becomes unreachable.
  const visibleHabits = profileHabits.filter((h) => h.kind !== 'neutral');

  const metCount = visibleHabits.filter((h) => {
    const log = logs.find((l) => l.habitId === h.id && l.logDate === today);
    return (log?.count ?? 0) >= h.dailyGoal;
  }).length;

  const onEdit = useCallback((id: string) => {
    router.push({ pathname: '/habit-form', params: { id } });
  }, [router]);

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'today', label: t.habitToday },
    { key: 'week', label: t.habitWeekView },
    { key: 'month', label: t.habitMonthView },
  ];

  function addChild() {
    const name = newChildName.trim();
    if (!name) return;
    updateSettings({ childProfiles: [...childProfiles, name] });
    setNewChildName('');
    setAddingChild(false);
  }

  function removeChild(name: string) {
    warning();
    showAppModal(t.habitRemoveChild(name), t.habitRemoveChildBody, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.resetConfirmBtn, style: 'destructive',
        onPress: () => {
          heavy();
          updateSettings({ childProfiles: childProfiles.filter((c) => c !== name) });
          if (selectedProfile === name) setSelectedProfile('');
        },
      },
    ]);
  }

  const showProfiles = childProfiles.length > 0 || addingChild;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ScreenHeader
        title={t.habitsTitle}
        onBack={() => router.back()}
        right={
          <Pressable
            style={[styles.addBtn, { backgroundColor: theme.orange }]}
            onPress={() => router.push({
              pathname: '/habit-form',
              params: selectedProfile ? { childName: selectedProfile } : {},
            })}
          >
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        }
      />

      {/* Profile selector */}
      {showProfiles && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileRow}
        >
          {(['', ...childProfiles] as string[]).map((name) => {
            const isActive = selectedProfile === name;
            return (
              <Pressable
                key={name || '__me__'}
                style={[
                  styles.profileChip,
                  { backgroundColor: isActive ? theme.orange : theme.grayLight },
                ]}
                onPress={() => setSelectedProfile(name)}
                onLongPress={() => name && removeChild(name)}
              >
                <Text style={[styles.profileChipText, { color: isActive ? '#fff' : theme.text }]}>
                  {name || t.habitForMe}
                </Text>
              </Pressable>
            );
          })}
          {addingChild ? (
            <View style={[styles.profileChip, styles.addChildRow, { backgroundColor: theme.white }]}>
              <TextInput
                style={[styles.addChildInput, { color: theme.text }]}
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder={t.habitAddChildPlaceholder}
                placeholderTextColor={theme.gray}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addChild}
              />
              <Pressable onPress={addChild}>
                <Text style={[styles.addChildConfirm, { color: theme.orange }]}>✓</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.profileChip, { backgroundColor: theme.grayLight, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.gray }]}
              onPress={() => setAddingChild(true)}
            >
              <Text style={[styles.profileChipText, { color: theme.textLight }]}>{t.habitAddChild}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
      {!showProfiles && (
        <Pressable
          style={styles.addChildBtn}
          onPress={() => setAddingChild(true)}
        >
          <Text style={[styles.addChildBtnText, { color: theme.textLight }]}>{t.habitAddChild}</Text>
        </Pressable>
      )}

      {/* View tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.grayLight }]}>
        {tabs.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && { backgroundColor: theme.white, ...Shadow.card }]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, { color: theme.textLight }, tab === key && { color: theme.text }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SiteSwipeView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HintCard text={t.hints.habits.text} example={t.hints.habits.example} />

        {tab === 'today' && (
          <>
            {visibleHabits.length > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: theme.white }]}>
                <Text style={[styles.summaryChipText, { color: metCount === visibleHabits.length ? theme.green : theme.textLight }]}>
                  {metCount} / {visibleHabits.length} {t.habitSummaryLabel}
                </Text>
              </View>
            )}

            {/* Building section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.habitBuilding}</Text>
              {buildHabits.length === 0 ? (
                <Pressable
                  style={[styles.dashedAdd, { borderColor: theme.grayLight }]}
                  onPress={() => router.push({ pathname: '/habit-form', params: { kind: 'build', ...(selectedProfile ? { childName: selectedProfile } : {}) } })}
                >
                  <Text style={[styles.dashedAddText, { color: theme.textLight }]}>{t.noHabitsInSection}</Text>
                </Pressable>
              ) : (
                buildHabits.map((h) => (
                  <HabitCard key={h.id} habit={h} today={today} onEdit={onEdit} lang={lang} theme={theme} />
                ))
              )}
            </View>

            {/* Breaking section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.habitBreaking}</Text>
              {breakHabits.length === 0 ? (
                <Pressable
                  style={[styles.dashedAdd, { borderColor: theme.grayLight }]}
                  onPress={() => router.push({ pathname: '/habit-form', params: { kind: 'break', ...(selectedProfile ? { childName: selectedProfile } : {}) } })}
                >
                  <Text style={[styles.dashedAddText, { color: theme.textLight }]}>{t.noHabitsInSection}</Text>
                </Pressable>
              ) : (
                breakHabits.map((h) => (
                  <HabitCard key={h.id} habit={h} today={today} onEdit={onEdit} lang={lang} theme={theme} />
                ))
              )}
            </View>
          </>
        )}

        {tab === 'week' && <WeekView habits={profileHabits} today={today} lang={lang} theme={theme} />}
        {tab === 'month' && <MonthView habits={profileHabits} today={today} theme={theme} />}

        <View style={{ height: 120 }} />
      </ScrollView>
      </SiteSwipeView>

      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '300', lineHeight: 36 },
  profileRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  profileChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  profileChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  addChildRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  addChildInput: { fontSize: FontSize.sm, minWidth: 80 },
  addChildConfirm: { fontSize: FontSize.lg, fontWeight: '700' },
  addChildBtn: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  addChildBtnText: { fontSize: FontSize.xs, fontWeight: '500' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.sm,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  tabText: { fontSize: FontSize.sm, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
  summaryChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'center',
    ...Shadow.card,
  },
  summaryChipText: { fontSize: FontSize.sm, fontWeight: '700' },
  dashedAdd: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  dashedAddText: { fontSize: FontSize.sm, fontWeight: '500' },

  // Habit card
  habitCard: {
    borderRadius: Radius.md,
    borderLeftWidth: 5,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: 'relative', // anchor for CompletionGlow's absolute fill
    overflow: 'hidden',   // keep the glow within the rounded corners
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  habitIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  habitTitleWrap: { flex: 1 },
  habitTitle: { fontSize: FontSize.md, fontWeight: '600' },
  doneLabel: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 1 },
  // W-D: streak indicator (prominent number + mini dots) + done pill.
  titleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2, flexWrap: 'wrap' },
  streakWrap: { gap: 2 },
  streakHead: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  streakNum: { fontSize: FontSize.lg, fontFamily: Fonts.extrabold, fontWeight: '800' },
  streakLabel: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  streakDots: { flexDirection: 'row', gap: 3 },
  streakDot: { width: 6, height: 6, borderRadius: Radius.full },
  donePill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  donePillText: { fontSize: FontSize.xs, color: Colors.white, fontFamily: Fonts.bold, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: {
    width: 9, height: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  adjBtn: {
    width: 30, height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: { fontSize: FontSize.lg, lineHeight: 30 },
  adjBtnPlus: {},
  adjBtnPlusText: { fontSize: FontSize.lg, color: Colors.white, fontWeight: '700', lineHeight: 30 },

  // Expanded content
  expanded: { marginTop: Spacing.sm, gap: Spacing.xs },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  stepLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    width: 70,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 1,
  },
  stepArrow: { fontSize: FontSize.xs, paddingTop: 1 },
  stepValue: { flex: 1, fontSize: FontSize.sm, lineHeight: 19 },
  weekStripWrap: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  restDayBtn: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  restDayText: { fontSize: FontSize.xs, fontWeight: '600' },
  restDayHint: { fontSize: FontSize.xs, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  dayCol: { alignItems: 'center', gap: 3 },
  dayAbbr: { fontSize: 9, fontWeight: '600' },
  dayAbbrToday: { fontWeight: '700' },
  weekDot: {
    width: 12, height: 12, borderRadius: Radius.full, borderWidth: 1.5,
  },
  weekDotToday: { borderWidth: 2 },

  // Week grid view
  weekGrid: { gap: 2 },
  weekGridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  weekGridLabel: {
    width: 110, flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: Spacing.xs,
  },
  weekGridTitle: { flex: 1, fontSize: FontSize.xs, fontWeight: '500' },
  weekGridCell: { flex: 1, alignItems: 'center', gap: 2 },
  weekGridDayAbbr: { fontSize: 9 },
  weekGridDate: { fontSize: 9 },
  weekGridDot: {
    width: 14, height: 14, borderRadius: Radius.full, borderWidth: 1.5,
  },

  // Month view
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  monthNavBtn: { padding: Spacing.sm },
  monthNavText: { fontSize: FontSize.xl, fontWeight: '700' },
  monthLabel: { fontSize: FontSize.md, fontWeight: '700' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  monthRowLabel: { width: 90, flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthRowTitle: { flex: 1, fontSize: FontSize.xs, fontWeight: '500' },
  monthDots: { flexDirection: 'row', gap: 3, paddingHorizontal: Spacing.xs },
  monthDotWrap: { alignItems: 'center', gap: 2 },
  monthDotDate: { fontSize: 7 },
  monthDot: { width: 8, height: 8, borderRadius: Radius.full, borderWidth: 1 },
});
