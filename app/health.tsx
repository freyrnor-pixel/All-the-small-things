/**
 * health.tsx — health / symptom log
 *
 * Logs ailments with a date, 1–5 severity and notes. Shows a last-30-days
 * overview (top ailments by frequency, each with a current-week severity
 * strip) above the chronological log list.
 *
 * Connections:
 *   Imports → components/BottomNav, components/ConfirmationBanner, components/HintCard, components/HabitIcon, components/PressableScale, components/ScreenBackground, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useHealthStore, store/useHabitStore
 *   Used by → Expo Router route "/health"
 *   Data    → useHealthStore (health_logs table); useHabitStore (habits + habit_logs, read-only inline summary); scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); dates are YYYY-MM-DD via todayStr()/dateStr().
 *   - The date field is a free-text TextInput (no picker) — it trusts the YYYY-MM-DD string entered.
 *   - save() shows a ConfirmationBanner so there's always positive proof the entry was logged.
 *   - W-D: this is an emotional screen — uses useSoftTheme() for a gentler palette and
 *     PressableScale severity targets. SEVERITY_COLORS is a soft purple→blue family
 *     (NOT red/green — avoids alarm connotations); labels come from t.severityLabels.
 *   - Habits sub-section: inline today-progress rows (main profile only, childName === '') with
 *     +/- count buttons, mirroring app/habits.tsx's HabitCard fields (icon, title, kind colour,
 *     count/dailyGoal). The chevron header links to the full /habits screen; the add row pushes
 *     the shared /habit-form modal. Full streak/expand/rest-day UI stays on /habits — keep this
 *     inline view light.
 *   - Design system pass: removed static Colors.* fallbacks from baseStyles (theme.* was
 *     already applied inline everywhere except saveBtnText/adjBtnPlusText, now fixed);
 *     fontWeight string literals replaced with Fonts.* tokens; dropped unused back/title
 *     styles (superseded by ScreenHeader).
 */
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHealthStore } from '@/store/useHealthStore';
import { useHabitStore } from '@/store/useHabitStore';
import HintCard from '@/components/HintCard';
import HabitIcon from '@/components/HabitIcon';
import PressableScale from '@/components/PressableScale';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { useT } from '@/lib/i18n';
import { todayStr, getWeekDates } from '@/lib/date';
import { FontSize, Radius, Shadow, Spacing, Fonts } from '@/constants/theme';
import { useSoftTheme, useScaledStyles } from '@/lib/useAppTheme';

// W-D: soft purple→blue severity family. Lighter (mild) → deeper (severe) without
// any red/green alarm connotations. Static — these are intentionally fixed regardless
// of the active theme so the overview chart always reads gently.
const SEVERITY_COLORS = ['#C9D4F0', '#A9B8E8', '#8C9AE0', '#7C82D6', '#6E6BC8'];

// Mirrors habits.tsx's habitColor(): build = green, break = calm blue (never red).
const HABIT_BREAK_BLUE = '#4A8EC2';

function severities() {
  return SEVERITY_COLORS.map((color, i) => ({ value: i + 1, color }));
}

export default function HealthScreen() {
  const router = useRouter();
  const logs = useHealthStore((s) => s.logs);
  const add = useHealthStore((s) => s.add);
  const remove = useHealthStore((s) => s.remove);
  const allHabits = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const incrementHabit = useHabitStore((s) => s.increment);
  const decrementHabit = useHabitStore((s) => s.decrement);
  const habits = allHabits.filter((h) => h.childName === '');

  const [adding, setAdding] = useState(false);
  const [ailment, setAilment] = useState('');
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState(2);
  const [date, setDate] = useState(todayStr());
  const [confirm, setConfirm] = useState<string | null>(null);
  const t = useT();
  const theme = useSoftTheme();
  const styles = useScaledStyles(baseStyles);
  const SEVERITIES = severities();
  const severityLabel = (value: number) => t.severityLabels[value - 1] ?? '';

  const today = todayStr();
  const weekDates = getWeekDates(today);

  function save() {
    if (!ailment.trim()) return;
    add({ date, ailment: ailment.trim(), severity, notes: notes.trim() });
    setAilment('');
    setNotes('');
    setSeverity(2);
    setDate(todayStr());
    setAdding(false);
    setConfirm(t.taskSavedSimple);
  }

  // Top ailments over the last 30 days + a per-(ailment,date) max-severity index,
  // both derived in a single pass over the logs (was recomputed — and re-scanned
  // per day×ailment cell — on every render).
  const { topAilments, severityAt } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const counts: Record<string, number> = {};
    const sevByKey = new Map<string, number>(); // `${ailment}|${date}` -> max severity
    for (const l of logs) {
      if (new Date(l.date) >= cutoff) {
        counts[l.ailment] = (counts[l.ailment] ?? 0) + 1;
      }
      const key = `${l.ailment}|${l.date}`;
      const prev = sevByKey.get(key);
      sevByKey.set(key, prev === undefined ? l.severity : Math.max(prev, l.severity));
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const severityAt = (ailment: string, d: string): number | null =>
      sevByKey.get(`${ailment}|${d}`) ?? null;
    return { topAilments: top, severityAt };
  }, [logs]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
      <ScreenHeader title={t.healthTitle} onBack={() => router.back()} />

      <SiteSwipeView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        <HintCard text={t.hints.health.text} example={t.hints.health.example} />
        {/* Overview */}
        {topAilments.length > 0 && (
          <Surface style={styles.overviewCard}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.last30Days}</Text>
            {topAilments.map(([name, count]) => {
              const weekSeverities = weekDates.map((d) => severityAt(name, d));
              return (
                <View key={name} style={styles.overviewAilment}>
                  <View style={styles.overviewRow}>
                    <Text style={[styles.overviewName, { color: theme.text }]}>{name}</Text>
                    <View style={[styles.overviewBar, { backgroundColor: theme.grayLight }]}>
                      <View
                        style={[
                          styles.overviewFill,
                          // W-D: soft purple→blue bar instead of orange (matches the gentle severity family).
                          { backgroundColor: SEVERITY_COLORS[2], width: `${Math.min((count / (topAilments[0]?.[1] ?? 1)) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.overviewCount, { color: theme.textLight }]}>{count}×</Text>
                  </View>
                  <View style={styles.ailmentWeekStrip}>
                    {weekDates.map((d, i) => {
                      const sev = weekSeverities[i];
                      const sevColor = sev ? (SEVERITIES.find((s) => s.value === sev)?.color ?? theme.grayLight) : 'transparent';
                      const isFuture = d > today;
                      return (
                        <View key={d} style={styles.ailmentDotCol}>
                          <Text style={[styles.ailmentDayAbbr, { color: theme.textLight }]}>{t.dayLabels[i][0]}</Text>
                          <View style={[
                            styles.ailmentDot,
                            {
                              backgroundColor: sev ? sevColor : 'transparent',
                              borderColor: isFuture ? theme.grayLight : (sev ? sevColor : theme.grayLight),
                              opacity: isFuture ? 0.3 : 1,
                            },
                          ]} />
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Surface>
        )}

        {/* Add form */}
        {adding ? (
          <Surface style={styles.addCard}>
            <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.dateLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={[styles.formLabel, { color: theme.textLight, marginTop: Spacing.sm }]}>{t.ailmentLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={ailment}
              onChangeText={setAilment}
              placeholder={t.ailmentPlaceholder}
              placeholderTextColor={theme.gray}
              autoFocus
            />
            <Text style={[styles.formLabel, { color: theme.textLight, marginTop: Spacing.sm }]}>{t.severityLabel}</Text>
            {/* W-D: 5 large, clearly-labelled tap targets (not a slider). Stored value is 1–5. */}
            <View style={styles.severityRow}>
              {SEVERITIES.map((s) => {
                const active = severity === s.value;
                // Lighter severities (1–2) read better with dark text; deeper ones with white.
                const fg = s.value >= 3 ? theme.white : theme.text;
                return (
                  <PressableScale
                    key={s.value}
                    style={[
                      styles.severityTarget,
                      { backgroundColor: s.color },
                      active && [styles.severityActive, { borderColor: theme.text }],
                    ]}
                    onPress={() => setSeverity(s.value)}
                  >
                    <Text style={[styles.severityNum, { color: fg }]}>{s.value}</Text>
                    <Text style={[styles.severityTargetLabel, { color: fg }]} numberOfLines={1}>
                      {severityLabel(s.value)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={[styles.formLabel, { color: theme.textLight, marginTop: Spacing.sm }]}>{t.notesLabel}</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t.notesPlaceholder}
              placeholderTextColor={theme.gray}
              multiline
            />
            <View style={styles.addActions}>
              <Pressable onPress={() => setAdding(false)}>
                <Text style={[styles.cancelText, { color: theme.textLight }]}>{t.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: theme.orange }]} onPress={save}>
                <Text style={[styles.saveBtnText, { color: theme.white }]}>{t.save}</Text>
              </Pressable>
            </View>
          </Surface>
        ) : (
          <Pressable style={styles.addTrigger} onPress={() => setAdding(true)}>
            <Text style={[styles.addTriggerText, { color: theme.orange }]}>{t.logSymptomTrigger}</Text>
          </Pressable>
        )}

        {/* W-D: low-weight, affirming self-care note below the log form. */}
        <Text style={[styles.selfCareNote, { color: theme.textLight }]}>{t.healthSelfCareNote}</Text>

        {/* Log list */}
        <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.logSection}</Text>
        {logs.length === 0 && (
          <Surface tint={theme.offWhite} style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noLogsGentle}</Text>
          </Surface>
        )}
        {logs.map((log) => {
          const sev = SEVERITIES.find((s) => s.value === log.severity);
          return (
            <View key={log.id} style={[styles.logCard, { backgroundColor: theme.white, borderLeftColor: sev?.color ?? theme.grayLight }]}>
              <View style={styles.logTop}>
                <View>
                  <Text style={[styles.logAilment, { color: theme.text }]}>{log.ailment}</Text>
                  <Text style={[styles.logDate, { color: theme.textLight }]}>{log.date}</Text>
                </View>
                <View style={styles.logRight}>
                  <View style={[styles.severityBadge, { backgroundColor: sev?.color }]}>
                    <Text style={[styles.severityBadgeText, { color: log.severity >= 3 ? theme.white : theme.text }]}>{severityLabel(log.severity)}</Text>
                  </View>
                  <Pressable onPress={() => remove(log.id)} hitSlop={8}>
                    <Text style={[styles.removeText, { color: theme.gray }]}>×</Text>
                  </Pressable>
                </View>
              </View>
              {log.notes ? <Text style={[styles.logNotes, { color: theme.textLight }]}>{log.notes}</Text> : null}
            </View>
          );
        })}

        {/* Habits */}
        <View style={styles.section}>
          <Pressable
            onPress={() => router.push('/habits')}
            accessibilityRole="button"
            accessibilityLabel={t.healthSeeAllHabits}
            style={styles.sectionHeader}
          >
            <Text style={[styles.sectionLabel, { color: theme.textLight, marginBottom: 0 }]}>{t.nav.habits}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
          </Pressable>

          {habits.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noHabitsYet}</Text>
          ) : (
            habits.map((habit) => {
              const log = habitLogs.find((l) => l.habitId === habit.id && l.logDate === today);
              const count = log?.count ?? 0;
              const accent = habit.kind === 'break' ? HABIT_BREAK_BLUE : theme.green;
              return (
                <View key={habit.id} style={styles.habitRow}>
                  <HabitIcon icon={habit.icon} size={20} color={accent} />
                  <Text style={[styles.habitName, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
                  <Text style={[styles.habitCount, { color: theme.textLight }]}>{count}/{habit.dailyGoal}</Text>
                  <Pressable
                    style={[styles.adjBtn, { backgroundColor: theme.grayLight }]}
                    onPress={() => decrementHabit(habit.id, today)}
                    hitSlop={8}
                  >
                    <Text style={[styles.adjBtnText, { color: theme.textLight }]}>−</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.adjBtn, { backgroundColor: accent }]}
                    onPress={() => incrementHabit(habit.id, today)}
                    hitSlop={8}
                  >
                    <Text style={[styles.adjBtnPlusText, { color: theme.white }]}>+</Text>
                  </Pressable>
                </View>
              );
            })
          )}

          <Pressable
            onPress={() => router.push('/habit-form')}
            style={styles.addButton}
            accessibilityLabel={t.healthAddHabit}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.orange} />
            <Text style={[styles.addButtonText, { color: theme.orange }]}>{t.healthAddHabit}</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  overviewCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  sectionLabel: { fontSize: FontSize.sm, fontFamily: Fonts.semibold, marginBottom: Spacing.xs },
  overviewAilment: { marginTop: Spacing.sm },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ailmentWeekStrip: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 5,
    paddingLeft: 2,
  },
  ailmentDotCol: { alignItems: 'center', gap: 2 },
  ailmentDayAbbr: { fontSize: 7, fontFamily: Fonts.semibold },
  ailmentDot: { width: 9, height: 9, borderRadius: Radius.full, borderWidth: 1.5 },
  overviewName: { fontSize: FontSize.sm, width: 100 },
  overviewBar: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  overviewFill: { height: 8, borderRadius: Radius.full },
  overviewCount: { fontSize: FontSize.xs, width: 28, textAlign: 'right' },
  addTrigger: {
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addTriggerText: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  addCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  formLabel: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  input: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    marginTop: 4,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  severityRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // W-D: large, clearly-labelled severity tap targets (replaces small pills / slider).
  severityTarget: {
    flex: 1,
    minHeight: 60,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    gap: 2,
  },
  severityActive: { borderWidth: 2 },
  severityNum: { fontSize: FontSize.lg, fontFamily: Fonts.bold },
  severityTargetLabel: { fontSize: 11, fontFamily: Fonts.semibold, textAlign: 'center' },
  selfCareNote: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.xs,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelText: { fontSize: FontSize.md },
  saveBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.md },
  emptyCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: { fontSize: FontSize.sm },
  logCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    ...Shadow.card,
  },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logAilment: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  logDate: { fontSize: FontSize.xs, marginTop: 2 },
  logRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  severityBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  severityBadgeText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  removeText: { fontSize: 20 },
  logNotes: { fontSize: FontSize.sm, marginTop: Spacing.sm },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  habitName: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  habitCount: { fontSize: FontSize.xs },
  adjBtn: {
    width: 26, height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: { fontSize: FontSize.md, lineHeight: 26 },
  adjBtnPlusText: { fontSize: FontSize.md, fontFamily: Fonts.bold, lineHeight: 26 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  addButtonText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
});
