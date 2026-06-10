import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHabitStore, Habit, HabitKind } from '@/store/useHabitStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import HintCard from '@/components/HintCard';
import { todayStr, dateStr } from '@/lib/date';
import { AppColors, Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(today: string): string[] {
  const d = new Date(today + 'T12:00:00');
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return dateStr(day);
  });
}

function getMonthDates(year: number, month: number): string[] {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });
}

function progressColor(ratio: number, kind: HabitKind, theme: AppColors): string {
  if (ratio >= 1) return theme.green;
  if (ratio > 0) return theme.orange;
  return kind === 'break' ? theme.danger : theme.gray;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const DAY_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_ABBR_NO = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

function ProgressDots({ count, goal, kind, theme }: { count: number; goal: number; kind: HabitKind; theme: AppColors }) {
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

function WeekStrip({
  habitId, today, goal, kind, lang, theme,
}: {
  habitId: string; today: string; goal: number; kind: HabitKind; lang: string; theme: AppColors;
}) {
  const logs = useHabitStore((s) => s.logs);
  const weekDates = useMemo(() => getWeekDates(today), [today]);
  const abbr = lang === 'no' ? DAY_ABBR_NO : DAY_ABBR;

  return (
    <View style={styles.weekStrip}>
      {weekDates.map((date, i) => {
        const log = logs.find((l) => l.habitId === habitId && l.logDate === date);
        const count = log?.count ?? 0;
        const ratio = goal > 0 ? Math.min(count / goal, 1) : 0;
        const isFuture = date > today;
        const color = isFuture ? theme.grayLight : progressColor(ratio, kind, theme);
        const filled = !isFuture && ratio > 0;
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
  const t = useT();

  const log = logs.find((l) => l.habitId === habit.id && l.logDate === today);
  const count = log?.count ?? 0;
  const ratio = habit.dailyGoal > 0 ? Math.min(count / habit.dailyGoal, 1) : 0;
  const isDone = ratio >= 1;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isDone) {
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
  }, [isDone]);

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
          isDone && { backgroundColor: theme.greenLight },
        ]}
      >
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Animated.Text style={[styles.habitIcon, { transform: [{ scale: pulseAnim }] }]}>
            {habit.icon}
          </Animated.Text>
          <View style={styles.habitTitleWrap}>
            <Text style={[styles.habitTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
            {isDone && (
              <Text style={[styles.doneLabel, { color: theme.green }]}>
                {habit.kind === 'build' ? t.habitGoalMet : t.habitBroken}
              </Text>
            )}
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

  if (habits.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{t.noHabitsYet}</Text>
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
            <Text style={styles.weekGridIcon}>{habit.icon}</Text>
            <Text style={[styles.weekGridTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
          </View>
          {weekDates.map((date) => {
            const log = logs.find((l) => l.habitId === habit.id && l.logDate === date);
            const ratio = habit.dailyGoal > 0 ? Math.min((log?.count ?? 0) / habit.dailyGoal, 1) : 0;
            const isFuture = date > today;
            const color = isFuture ? theme.grayLight : progressColor(ratio, habit.kind, theme);
            return (
              <View key={date} style={styles.weekGridCell}>
                <View style={[
                  styles.weekGridDot,
                  { backgroundColor: isFuture ? 'transparent' : color, borderColor: color },
                  isFuture && { borderColor: '#E8E2DA' },
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

  if (habits.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{t.noHabitsYet}</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.monthNav}>
        <Pressable onPress={() => setOffset((o) => o - 1)} style={styles.monthNavBtn}>
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
            <Text style={styles.monthRowIcon}>{habit.icon}</Text>
            <Text style={[styles.monthRowTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.monthDots}>
              {dates.map((date) => {
                const log = logs.find((l) => l.habitId === habit.id && l.logDate === date);
                const ratio = habit.dailyGoal > 0 ? Math.min((log?.count ?? 0) / habit.dailyGoal, 1) : 0;
                const isFuture = date > today;
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
  const today = todayStr();

  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const lang = useSettingsStore((s) => s.language);
  const theme = useAppTheme();
  const t = useT();

  const buildHabits = habits.filter((h) => h.kind === 'build');
  const breakHabits = habits.filter((h) => h.kind === 'break');

  const metCount = habits.filter((h) => {
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.habitsTitle}</Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: theme.orange }]}
          onPress={() => router.push('/habit-form')}
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HintCard text={t.hints.habits.text} example={t.hints.habits.example} />

        {tab === 'today' && (
          <>
            {habits.length > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: theme.white }]}>
                <Text style={[styles.summaryChipText, { color: metCount === habits.length ? theme.green : theme.textLight }]}>
                  {metCount} / {habits.length} {t.habitSummaryLabel}
                </Text>
              </View>
            )}

            {/* Building section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.habitBuilding}</Text>
              {buildHabits.length === 0 ? (
                <Pressable
                  style={[styles.dashedAdd, { borderColor: theme.grayLight }]}
                  onPress={() => router.push({ pathname: '/habit-form', params: { kind: 'build' } })}
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
                  onPress={() => router.push({ pathname: '/habit-form', params: { kind: 'break' } })}
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

        {tab === 'week' && <WeekView habits={habits} today={today} lang={lang} theme={theme} />}
        {tab === 'month' && <MonthView habits={habits} today={today} theme={theme} />}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  habitIcon: { fontSize: 22, lineHeight: 26 },
  habitTitleWrap: { flex: 1 },
  habitTitle: { fontSize: FontSize.md, fontWeight: '600' },
  doneLabel: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 1 },
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
  weekGridIcon: { fontSize: 16 },
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
  monthRowIcon: { fontSize: 14 },
  monthRowTitle: { flex: 1, fontSize: FontSize.xs, fontWeight: '500' },
  monthDots: { flexDirection: 'row', gap: 3, paddingHorizontal: Spacing.xs },
  monthDotWrap: { alignItems: 'center', gap: 2 },
  monthDotDate: { fontSize: 7 },
  monthDot: { width: 8, height: 8, borderRadius: Radius.full, borderWidth: 1 },
});
