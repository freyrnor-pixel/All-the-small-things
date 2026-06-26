/**
 * task-form.tsx — add / edit a task
 *
 * Modal form for creating or editing a single task: title, date, time (defaults to
 * a specific time, with a "Whenever" segment to mean "sometime that day" instead),
 * type (start-at / time-box with duration), importance, priority, and weekly recurrence.
 * Presence of an `id` route param switches it into edit mode (with a delete action).
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, components/DatePickerCalendar, components/ScreenBackground, components/TimePickerWheel, constants/theme, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, store/useTaskStore
 *   Used by → Expo Router route "/task-form" (presented as a modal — see app/_layout.tsx)
 *   Data    → useTaskStore (tasks table) via add/update/remove; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); date defaults to todayStr() (YYYY-MM-DD).
 *   - Edit vs. add is keyed off the `id` param resolved against the store; save()/del() then router.back().
 *   - recurringDays is only persisted when recurring === 'weekly' (cleared to [] otherwise).
 *   - Field order is essentials-first (Title → Date → Time → Type → Duration → Importance → Priority → Repeat).
 *   - On save a ConfirmationBanner is shown, then navigation is briefly delayed (~900ms) so it's visible.
 *     start-at vs time-box is colour/icon-coded via FeatureColors (consistent with TaskItem).
 *   - Date field is a Mon–Sun chip row (current calendar week) for one-tap picking; the full
 *     DatePickerCalendar is collapsed behind a toggle for dates outside the current week.
 *     Picking a chip sets the date and collapses the calendar if it was open.
 */
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore, TaskType, Importance, Priority } from '@/store/useTaskStore';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import { todayStr, dateStr, dayOfWeekMon0 } from '@/lib/date';
import { tap } from '@/lib/haptics';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import DatePickerCalendar from '@/components/DatePickerCalendar';
import TimePickerWheel from '@/components/TimePickerWheel';
import ScreenBackground from '@/components/ScreenBackground';
import { Colors, FeatureColors, FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';

function nextHourStr(): string {
  const h = (new Date().getHours() + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

// Icon per task type — keeps start-at vs time-box scannable (consistent with TaskItem).
const TYPE_ICON: Record<TaskType, keyof typeof Ionicons.glyphMap> = {
  'start-at': 'time-outline',
  'time-box': 'timer-outline',
};
// Colour accent per task type (drawn from FeatureColors so it reads as the app's palette).
const TYPE_ACCENT: Record<TaskType, string> = {
  'start-at': FeatureColors.shared,
  'time-box': FeatureColors.task,
};

export default function TaskFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.add);
  const updateTask = useTaskStore((s) => s.update);
  const removeTask = useTaskStore((s) => s.remove);
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const existing = id ? tasks.find((task) => task.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [timeEnabled, setTimeEnabled] = useState(existing ? !!existing.time : true);
  const [time, setTime] = useState(existing?.time ?? nextHourStr());
  const [taskType, setTaskType] = useState<TaskType>(existing?.taskType ?? 'start-at');
  const [duration, setDuration] = useState(String(existing?.durationMinutes ?? '30'));
  const [recurring, setRecurring] = useState(existing?.recurring ?? 'none');
  const [recurringDays, setRecurringDays] = useState<number[]>(existing?.recurringDays ?? []);
  const [importance, setImportance] = useState<Importance>(existing?.importance ?? 'regular');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [calExpanded, setCalExpanded] = useState(false);

  const { dayLabels, months } = t;

  // Mon–Sun of the current calendar week, for one-tap date selection.
  const weekDays = useMemo(() => {
    const today = new Date();
    const mon0 = dayOfWeekMon0(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - mon0 + i);
      return { value: dateStr(d), dayIdx: i, dayNum: d.getDate() };
    });
  }, []);

  function toggleDay(d: number) {
    setRecurringDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  /** Build the localized "Reminder set …" / "Saved ✓" confirmation from the saved values. */
  function confirmationMessage(savedDate: string, savedTime: string | undefined): string {
    if (!savedTime) return t.taskSavedSimple;
    if (savedDate === todayStr()) return t.taskSavedReminderToday(savedTime);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (savedDate === dateStr(tomorrow)) {
      return t.taskSavedReminder(savedTime, t.tomorrow);
    }
    // new Date(YYYY-MM-DD).getDay(): 0=Sun → convert to Mon-0 to index dayFull.
    const mon0 = dayOfWeekMon0(new Date(savedDate + 'T12:00:00'));
    return t.taskSavedReminder(savedTime, t.dayFull[mon0]);
  }

  function save() {
    if (!title.trim()) return;
    const savedTime = timeEnabled ? time : undefined;
    const payload = {
      title: title.trim(),
      date,
      time: savedTime,
      taskType,
      durationMinutes: taskType === 'time-box' ? Number(duration) || 30 : undefined,
      done: existing?.done ?? false,
      recurring: recurring as 'none' | 'weekly',
      recurringDays: recurring === 'weekly' ? recurringDays : [],
      importance,
      priority,
    };
    if (existing) {
      updateTask(existing.id, payload);
    } else {
      addTask(payload);
    }
    setConfirm(confirmationMessage(date, savedTime));
    // Let the banner land before leaving the form.
    setTimeout(() => router.back(), 900);
  }

  function del() {
    if (existing) removeTask(existing.id);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.textLight }]}>{t.cancel}</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {existing ? t.editTask : t.newTask}
        </Text>
        <Pressable onPress={save}>
          <Text style={[styles.save, { color: theme.orange }]}>{t.save}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.taskTitleLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.white, color: theme.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t.taskTitlePlaceholder}
              placeholderTextColor={theme.gray}
              autoFocus={!existing}
              returnKeyType="next"
            />
          </View>

          {/* Date — Mon–Sun chip row, with the full calendar collapsed behind a toggle */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.dateLabel}</Text>
            <View style={styles.weekRow}>
              {weekDays.map((wd) => {
                const active = date === wd.value;
                return (
                  <Pressable
                    key={wd.value}
                    style={[
                      styles.weekChip,
                      { backgroundColor: theme.grayLight },
                      active && { backgroundColor: theme.orange },
                    ]}
                    onPress={() => {
                      tap();
                      setDate(wd.value);
                      setCalExpanded(false);
                    }}
                  >
                    <Text style={[styles.weekChipDay, { color: theme.textLight }, active && { color: Colors.white }]}>
                      {dayLabels[wd.dayIdx].slice(0, 2)}
                    </Text>
                    <Text style={[styles.weekChipNum, { color: theme.text }, active && { color: Colors.white, fontWeight: '700' }]}>
                      {wd.dayNum}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={styles.calToggleBtn}
              onPress={() => {
                tap();
                setCalExpanded((v) => !v);
              }}
            >
              <Text style={[styles.calToggleText, { color: theme.orange }]}>
                {calExpanded ? t.hideCalendar : t.pickOtherDate(date)}
              </Text>
            </Pressable>
            {calExpanded && (
              <DatePickerCalendar
                value={date}
                onChange={(d) => {
                  setDate(d);
                  setCalExpanded(false);
                }}
                theme={theme}
                dayLabels={dayLabels}
                monthLabels={months}
                calendarLabels={t.calendar}
              />
            )}
          </View>

          {/* Time — set time (default) vs. whenever on the day */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.timeLabel}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {[true, false].map((isSet) => (
                <Pressable
                  key={String(isSet)}
                  style={[styles.seg, timeEnabled === isSet && [styles.segActive, { backgroundColor: theme.white }]]}
                  onPress={() => {
                    tap();
                    setTimeEnabled(isSet);
                    if (!isSet) setTime(nextHourStr());
                  }}
                >
                  <Text
                    style={[
                      styles.segText,
                      { color: theme.textLight },
                      timeEnabled === isSet && { color: theme.text, fontWeight: '600' },
                    ]}
                  >
                    {isSet ? t.timeModeSet : t.timeModeWhenever}
                  </Text>
                </Pressable>
              ))}
            </View>
            {timeEnabled ? (
              <TimePickerWheel
                value={time}
                onChange={setTime}
                theme={theme}
              />
            ) : (
              <Text style={[styles.wheneverHint, { color: theme.textLight }]}>{t.wheneverHint}</Text>
            )}
          </View>

          {/* Type — icon + colour accent so start-at vs time-box is scannable */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.typeLabel}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['start-at', 'time-box'] as TaskType[]).map((type) => {
                const active = taskType === type;
                const accent = TYPE_ACCENT[type];
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.segType,
                      active && [styles.segActive, { backgroundColor: theme.white }],
                    ]}
                    onPress={() => {
                      tap();
                      setTaskType(type);
                    }}
                  >
                    <Ionicons
                      name={TYPE_ICON[type]}
                      size={16}
                      color={active ? accent : theme.gray}
                    />
                    <Text
                      style={[
                        styles.segText,
                        { color: theme.textLight },
                        active && { color: theme.text, fontFamily: Fonts.semibold },
                      ]}
                    >
                      {type === 'start-at' ? t.typeStartAt : t.typeTimeBox}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Duration */}
          {taskType === 'time-box' && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textLight }]}>{t.durationLabel}</Text>
              <View style={styles.durationRow}>
                {[15, 20, 30, 45, 60, 90].map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.durationChip, { backgroundColor: theme.grayLight }, duration === String(m) && { backgroundColor: theme.orange }]}
                    onPress={() => setDuration(String(m))}
                  >
                    <Text style={[styles.durationText, { color: theme.text }, duration === String(m) && { color: Colors.white, fontWeight: '700' }]}>
                      {m}m
                    </Text>
                  </Pressable>
                ))}
                <TextInput
                  style={[styles.durationInput, { backgroundColor: theme.white, color: theme.text }]}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  placeholder="min"
                  placeholderTextColor={theme.gray}
                />
              </View>
            </View>
          )}

          {/* Importance */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.importanceLabel}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['regular', 'essential'] as Importance[]).map((imp) => (
                <Pressable
                  key={imp}
                  style={[styles.seg, importance === imp && [styles.segActive, { backgroundColor: theme.white }]]}
                  onPress={() => setImportance(imp)}
                >
                  <Text style={[styles.segText, { color: theme.textLight }, importance === imp && { color: theme.text, fontWeight: '600' }]}>
                    {imp === 'regular' ? t.importanceRegular : t.importanceEssential}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Priority — "must-do on a low-energy day" maps to high */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.priorityLabel}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.seg, priority === p && [styles.segActive, { backgroundColor: theme.white }]]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.segText, { color: theme.textLight }, priority === p && { color: theme.text, fontWeight: '600' }]}>
                    {p === 'high' ? t.priorityHigh : p === 'medium' ? t.priorityMedium : t.priorityLow}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recurring */}
          <View style={styles.field}>
            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: theme.textLight }]}>{t.repeatWeekly}</Text>
              <Switch
                value={recurring === 'weekly'}
                onValueChange={(v) => setRecurring(v ? 'weekly' : 'none')}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={recurring === 'weekly' ? theme.orange : theme.gray}
              />
            </View>
            {recurring === 'weekly' && (
              <View style={styles.daysRow}>
                {dayLabels.map((label, i) => (
                  <Pressable
                    key={i}
                    style={[styles.dayChip, { backgroundColor: theme.grayLight }, recurringDays.includes(i) && { backgroundColor: theme.orange }]}
                    onPress={() => toggleDay(i)}
                  >
                    <Text style={[styles.dayText, { color: theme.text }, recurringDays.includes(i) && { color: Colors.white }]}>
                      {label.slice(0, 2)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {existing && (
            <Pressable style={[styles.deleteBtn, { backgroundColor: theme.dangerLight }]} onPress={del}>
              <Text style={[styles.deleteBtnText, { color: theme.danger }]}>{t.deleteTask}</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save confirmation toast (W-B) — overlays content near the top. */}
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '600' },
  cancel: { fontSize: FontSize.md },
  save: { fontSize: FontSize.md, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '600' },
  input: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    ...Shadow.card,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  seg: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  // Type segment: icon + label inline so start-at / time-box is scannable.
  segType: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: { ...Shadow.card },
  segText: { fontSize: FontSize.sm, textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wheneverHint: { fontSize: FontSize.sm, marginTop: Spacing.xs },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
  durationChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  durationText: { fontSize: FontSize.sm },
  durationInput: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    width: 60,
    textAlign: 'center',
    ...Shadow.card,
  },
  weekRow: { flexDirection: 'row', gap: Spacing.xs, justifyContent: 'space-between' },
  weekChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: 2,
  },
  weekChipDay: { fontSize: FontSize.xs, fontWeight: '600' },
  weekChipNum: { fontSize: FontSize.sm },
  calToggleBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.xs },
  calToggleText: { fontSize: FontSize.sm, fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  dayChip: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: FontSize.xs, fontWeight: '600' },
  deleteBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  deleteBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
