/**
 * health.tsx — health / symptom log
 *
 * Logs ailments with a date, 1–5 severity and notes. Shows a last-30-days
 * overview (top ailments by frequency, each with a current-week severity
 * strip) above the chronological log list.
 *
 * Connections:
 *   Imports → components/AddDivider, components/AppModal, components/BottomNav, components/ConfirmationBanner, components/ExpandableCard, components/HabitIcon, components/PressableScale, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, store/useHealthStore, store/useHabitStore
 *   Used by → Expo Router route "/health" (BottomNav tab — see lib/siteNav.ts)
 *   Data    → useHealthStore (health_logs table, incl. update()); useHabitStore (habits + habit_logs, read-only inline summary); scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); dates are YYYY-MM-DD via todayStr()/dateStr().
 *   - The date field is a free-text TextInput (no picker) — it trusts the YYYY-MM-DD string entered.
 *   - W-D: this is an emotional screen — uses useSoftTheme() for a gentler palette and
 *     PressableScale severity targets. SEVERITY_COLORS is a soft purple→blue family
 *     (NOT red/green — avoids alarm connotations); labels come from t.severityLabels.
 *   - Habits sub-section: inline today-progress rows (main profile only, childName === '') with
 *     +/- count buttons, mirroring app/habits.tsx's HabitCard fields (icon, title, kind colour,
 *     count/dailyGoal). The chevron header links to the full /habits screen; the add row pushes
 *     the shared /habit-form modal. Full streak/expand/rest-day UI stays on /habits — keep this
 *     inline view light.
 *   - Log list is per-log lifted edit state (`edits`/`openIds`), mirroring app/plans.tsx's
 *     pattern but with no durable draft buffer — a half-edited log just commits straight to
 *     useHealthStore.update() on Save, since it isn't worth a SQLite draft table. Each log
 *     renders as a controlled ExpandableCard; collapsed shows the severity badge (leadingAction)
 *     + ailment title + chevron, expanded shows the editable fields and a confirm-gated Delete.
 *   - Every log gets a leading AddDivider (handleAddLog); no floating AddFAB on this screen.
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
import { useHealthStore, HealthLog } from '@/store/useHealthStore';
import { useHabitStore } from '@/store/useHabitStore';
import HabitIcon from '@/components/HabitIcon';
import PressableScale from '@/components/PressableScale';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import Surface from '@/components/Surface';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import ExpandableCard from '@/components/ExpandableCard';
import AddDivider from '@/components/AddDivider';
import { showAppModal } from '@/components/AppModal';
import { useT } from '@/lib/i18n';
import { todayStr, getWeekDates } from '@/lib/date';
import { FontSize, Radius, Shadow, Spacing, Fonts } from '@/constants/theme';
import { useSoftTheme, useScaledStyles } from '@/lib/useAppTheme';
import { warning } from '@/lib/haptics';

// W-D: soft purple→blue severity family. Lighter (mild) → deeper (severe) without
// any red/green alarm connotations. Static — these are intentionally fixed regardless
// of the active theme so the overview chart always reads gently.
const SEVERITY_COLORS = ['#C9D4F0', '#A9B8E8', '#8C9AE0', '#7C82D6', '#6E6BC8'];

// Mirrors habits.tsx's habitColor(): build = green, break = calm blue (never red).
const HABIT_BREAK_BLUE = '#4A8EC2';

function severities() {
  return SEVERITY_COLORS.map((color, i) => ({ value: i + 1, color }));
}

type HealthEditFields = { date: string; ailment: string; severity: number; notes: string };
type HealthEditState = { fields: HealthEditFields; dirty: boolean };

function fieldsFromLog(log: HealthLog): HealthEditFields {
  return { date: log.date, ailment: log.ailment, severity: log.severity, notes: log.notes };
}

export default function HealthScreen() {
  const router = useRouter();
  const logs = useHealthStore((s) => s.logs);
  const add = useHealthStore((s) => s.add);
  const update = useHealthStore((s) => s.update);
  const remove = useHealthStore((s) => s.remove);
  const allHabits = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const incrementHabit = useHabitStore((s) => s.increment);
  const decrementHabit = useHabitStore((s) => s.decrement);
  const habits = allHabits.filter((h) => h.childName === '');

  const [edits, setEdits] = useState<Record<string, HealthEditState>>({});
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<string | null>(null);
  const t = useT();
  const theme = useSoftTheme();
  const styles = useScaledStyles(baseStyles);
  const SEVERITIES = severities();
  const severityLabel = (value: number) => t.severityLabels[value - 1] ?? '';

  const today = todayStr();
  const weekDates = getWeekDates(today);

  function ensureEdit(logId: string) {
    if (edits[logId]) return;
    const log = logs.find((l) => l.id === logId);
    if (!log) return;
    setEdits((prev) => ({ ...prev, [logId]: { fields: fieldsFromLog(log), dirty: false } }));
  }

  function toggleOpen(logId: string) {
    const wasOpen = !!openIds[logId];
    if (!wasOpen) ensureEdit(logId);
    setOpenIds((prev) => ({ ...prev, [logId]: !wasOpen }));
  }

  function handleFieldChange<K extends keyof HealthEditFields>(logId: string, field: K, value: HealthEditFields[K]) {
    setEdits((prev) => {
      const edit = prev[logId];
      if (!edit) return prev;
      return { ...prev, [logId]: { fields: { ...edit.fields, [field]: value }, dirty: true } };
    });
  }

  function handleSave(logId: string) {
    const edit = edits[logId];
    if (!edit) return;
    update(logId, edit.fields);
    setEdits((prev) => ({ ...prev, [logId]: { fields: edit.fields, dirty: false } }));
    setConfirm(t.taskSavedSimple);
  }

  function handleDelete(logId: string) {
    remove(logId);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[logId];
      return next;
    });
    setOpenIds((prev) => {
      const next = { ...prev };
      delete next[logId];
      return next;
    });
  }

  function confirmDelete(logId: string, ailment: string) {
    warning();
    showAppModal(t.deleteConfirmTitle(ailment || t.ailmentPlaceholder), t.deleteConfirmBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.deleteConfirmBtn, style: 'destructive', onPress: () => handleDelete(logId) },
    ]);
  }

  function handleAddLog() {
    const log = add({ date: todayStr(), ailment: '', severity: 2, notes: '' });
    setEdits((prev) => ({ ...prev, [log.id]: { fields: fieldsFromLog(log), dirty: false } }));
    setOpenIds((prev) => ({ ...prev, [log.id]: true }));
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
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
      <ScreenHeader title={t.healthTitle} />

      <SiteSwipeView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        {/* Overview */}
        {topAilments.length > 0 && (
          <Surface style={styles.overviewCard}>
            <View style={[styles.sectionLabelBox, { backgroundColor: theme.grayLight }]}>
              <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.last30Days}</Text>
            </View>
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

        {/* Log list */}
        <View style={[styles.sectionLabelBox, { backgroundColor: theme.grayLight }]}>
          <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.logSection}</Text>
        </View>
        {logs.length === 0 && (
          <>
            <Surface tint={theme.offWhite} style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noLogsGentle}</Text>
            </Surface>
            <AddDivider onPress={handleAddLog} />
          </>
        )}
        {logs.map((log) => {
          const sev = SEVERITIES.find((s) => s.value === log.severity);
          const fields = edits[log.id]?.fields ?? fieldsFromLog(log);
          return (
            <React.Fragment key={log.id}>
              <AddDivider onPress={handleAddLog} />
              <ExpandableCard
                title={log.ailment || t.ailmentPlaceholder}
                open={!!openIds[log.id]}
                onToggle={() => toggleOpen(log.id)}
                leadingAction={
                  <View style={[styles.severityBadge, { backgroundColor: sev?.color }]}>
                    <Text style={[styles.severityBadgeText, { color: log.severity >= 3 ? theme.white : theme.text }]}>
                      {severityLabel(log.severity)}
                    </Text>
                  </View>
                }
              >
                <View style={styles.fieldsWrap}>
                  <View style={styles.field}>
                    <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.dateLabel}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
                      value={fields.date}
                      onChangeText={(v) => handleFieldChange(log.id, 'date', v)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.ailmentLabel}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
                      value={fields.ailment}
                      onChangeText={(v) => handleFieldChange(log.id, 'ailment', v)}
                      placeholder={t.ailmentPlaceholder}
                      placeholderTextColor={theme.gray}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.severityLabel}</Text>
                    {/* W-D: 5 large, clearly-labelled tap targets (not a slider). Stored value is 1–5. */}
                    <View style={styles.severityRow}>
                      {SEVERITIES.map((s) => {
                        const active = fields.severity === s.value;
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
                            onPress={() => handleFieldChange(log.id, 'severity', s.value)}
                          >
                            <Text style={[styles.severityNum, { color: fg }]}>{s.value}</Text>
                            <Text style={[styles.severityTargetLabel, { color: fg }]} numberOfLines={1}>
                              {severityLabel(s.value)}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.notesLabel}</Text>
                    <TextInput
                      style={[styles.input, styles.notesInput, { backgroundColor: theme.offWhite, color: theme.text }]}
                      value={fields.notes}
                      onChangeText={(v) => handleFieldChange(log.id, 'notes', v)}
                      placeholder={t.notesPlaceholder}
                      placeholderTextColor={theme.gray}
                      multiline
                    />
                  </View>

                  {edits[log.id]?.dirty ? (
                    <Pressable style={[styles.saveBtn, { backgroundColor: theme.orange }]} onPress={() => handleSave(log.id)}>
                      <Text style={[styles.saveBtnText, { color: theme.white }]}>{t.save}</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={[styles.deleteBtn, { backgroundColor: theme.dangerLight }]}
                    onPress={() => confirmDelete(log.id, fields.ailment)}
                  >
                    <Text style={[styles.deleteBtnText, { color: theme.danger }]}>{t.deleteLogBtn}</Text>
                  </Pressable>
                </View>
              </ExpandableCard>
            </React.Fragment>
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
            <View style={[styles.sectionLabelBox, { backgroundColor: theme.grayLight }]}>
              <Text style={[styles.sectionLabel, { color: theme.textLight, marginBottom: 0 }]}>{t.nav.habits}</Text>
            </View>
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
                <ExpandableCard
                  key={habit.id}
                  title={habit.title}
                  leadingAction={<HabitIcon icon={habit.icon} size={20} color={accent} />}
                  onToggle={() => {}}
                  open={false}
                >
                  <View style={styles.habitCardContent}>
                    <View style={styles.habitDetailRow}>
                      <Text style={[styles.habitLabel, { color: theme.textLight }]}>{t.habitCue}</Text>
                      <Text style={[styles.habitValue, { color: theme.text }]}>
                        {habit.cue || t.notSet}
                      </Text>
                    </View>

                    {habit.notificationTimes && habit.notificationTimes.length > 0 && (
                      <View style={styles.habitDetailRow}>
                        <Text style={[styles.habitLabel, { color: theme.textLight }]}>{t.reminders}</Text>
                        <Text style={[styles.habitValue, { color: theme.text }]}>
                          {habit.notificationTimes.join(', ')}
                        </Text>
                      </View>
                    )}

                    {habit.recurrence && (
                      <View style={styles.habitDetailRow}>
                        <Text style={[styles.habitLabel, { color: theme.textLight }]}>{t.frequency}</Text>
                        <Text style={[styles.habitValue, { color: theme.text }]}>
                          {habit.recurrence}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.habitCountRow, { borderTopColor: theme.grayLight }]}>
                      <Text style={[styles.habitCount, { color: theme.textLight }]}>Today: {count}/{habit.dailyGoal}</Text>
                      <View style={styles.habitAdjustments}>
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
                    </View>
                  </View>
                </ExpandableCard>
              );
            })
          )}

          <Pressable
            onPress={() => router.push('/habit-form')}
            style={styles.addButtonIcon}
            accessibilityLabel={t.healthAddHabit}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.orange} />
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
  sectionLabelBox: { borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, alignSelf: 'flex-start' },
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
  fieldsWrap: { gap: Spacing.md },
  field: { gap: Spacing.xs },
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
  saveBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.md },
  deleteBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  deleteBtnText: { fontWeight: '700', fontSize: FontSize.md },
  emptyCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: { fontSize: FontSize.sm },
  severityBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  severityBadgeText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitCardContent: {
    gap: Spacing.md,
  },
  habitDetailRow: {
    gap: Spacing.xs,
  },
  habitLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  habitValue: {
    fontSize: FontSize.sm,
  },
  habitCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
  habitCount: { fontSize: FontSize.sm },
  habitAdjustments: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  adjBtn: {
    width: 26, height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: { fontSize: FontSize.md, lineHeight: 26 },
  adjBtnPlusText: { fontSize: FontSize.md, fontFamily: Fonts.bold, lineHeight: 26 },
  addButtonIcon: {
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
});
