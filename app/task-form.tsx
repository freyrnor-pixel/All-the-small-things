/**
 * task-form.tsx — add / edit a task
 *
 * Modal form for creating or editing a single task: title, date, time (defaults to
 * a specific time, with a "Whenever" segment to mean "sometime that day" instead),
 * type (start-at / time-box with duration), importance, steps, and weekly recurrence.
 * Presence of an `id` route param switches it into edit mode (with a confirm-gated
 * delete action).
 *
 * Connections:
 *   Imports → components/AppModal, components/ConfirmationBanner, components/DatePickerCalendar, components/TimePickerWheel, constants/theme, lib/date, lib/haptics, lib/i18n, lib/useAppTheme, react-native-safe-area-context, store/useTaskStore
 *   Used by → Expo Router route "/task-form" (presented as a modal — see app/_layout.tsx); pushed
 *             from app/index.tsx (plain new-task "+"), app/plans.tsx (task rows), and
 *             app/notes.tsx (a note's "plans" quick-action, via the `title` param below)
 *   Data    → useTaskStore (tasks table) via add/update/remove; task_steps via addStep/toggleStep/
 *             removeStep/reorderStep (gated on an existing task, immediate-persist like
 *             components/PlanTaskCard.tsx's steps); scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); date defaults to todayStr() (YYYY-MM-DD).
 *   - Edit vs. add is keyed off the `id` param resolved against the store; save()/performDelete()
 *     then router.back().
 *   - Optional `title` route param prefills a new (non-edit) task's title — ignored once
 *     `id` resolves to an existing task, so editing never silently overwrites a saved title.
 *   - recurringDays is only persisted when recurring === 'weekly' (cleared to [] otherwise).
 *   - Field order is essentials-first (Title → Date → Time → Type → Duration → Importance → Repeat → Steps).
 *     Importance/General section membership and ordering are otherwise set by drag on app/plans.tsx —
 *     this form only offers the regular/essential toggle, no manual sort position.
 *   - On save a ConfirmationBanner is shown, then navigation is briefly delayed (~900ms) so it's visible.
 *     start-at vs time-box is colour/icon-coded via FeatureColors (consistent with TaskItem).
 *   - Date field is a Mon–Sun chip row (current calendar week) for one-tap picking; the full
 *     DatePickerCalendar is collapsed behind an icon toggle for dates outside the current week.
 *     Picking a chip sets the date and collapses the calendar if it was open.
 *   - Delete is confirm-gated via confirmDelete()/showAppModal (mirrors components/PlanTaskCard.tsx's
 *     confirmDelete()) — performDelete() only fires from the modal's destructive button.
 */
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore, TaskType, Importance } from '@/store/useTaskStore';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import { todayStr, dateStr, dayOfWeekMon0 } from '@/lib/date';
import { tap, warning } from '@/lib/haptics';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import DatePickerCalendar from '@/components/DatePickerCalendar';
import IconButton from '@/components/IconButton';
import TimePickerWheel from '@/components/TimePickerWheel';
import { showAppModal } from '@/components/AppModal';
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
  const { id, title: titleParam } = useLocalSearchParams<{ id?: string; title?: string }>();
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.add);
  const updateTask = useTaskStore((s) => s.update);
  const removeTask = useTaskStore((s) => s.remove);
  const addStep = useTaskStore((s) => s.addStep);
  const toggleStep = useTaskStore((s) => s.toggleStep);
  const removeStep = useTaskStore((s) => s.removeStep);
  const reorderStep = useTaskStore((s) => s.reorderStep);
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const existing = id ? tasks.find((task) => task.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? titleParam ?? '');
  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [timeEnabled, setTimeEnabled] = useState(existing ? !!existing.time : true);
  const [time, setTime] = useState(existing?.time ?? nextHourStr());
  const [taskType, setTaskType] = useState<TaskType>(existing?.taskType ?? 'start-at');
  const [duration, setDuration] = useState(String(existing?.durationMinutes ?? '30'));
  const [recurring, setRecurring] = useState(existing?.recurring ?? 'none');
  const [recurringDays, setRecurringDays] = useState<number[]>(existing?.recurringDays ?? []);
  const [importance, setImportance] = useState<Importance>(existing?.importance ?? 'regular');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [calExpanded, setCalExpanded] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const { bottom: bottomInset } = useSafeAreaInsets();

  const { dayLabels, months } = t;
  const sortedSteps = [...(existing?.steps ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

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
      sortOrder: existing?.sortOrder ?? 0,
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

  function performDelete() {
    if (existing) removeTask(existing.id);
    router.back();
  }

  function confirmDelete() {
    warning();
    showAppModal(t.deleteConfirmTitle(title || t.taskTitlePlaceholder), t.deleteConfirmBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.deleteConfirmBtn, style: 'destructive', onPress: performDelete },
    ]);
  }

  function handleAddStep() {
    const stepTitle = newStepTitle.trim();
    if (!stepTitle || !existing) return;
    addStep(existing.id, stepTitle);
    setNewStepTitle('');
  }

  return (
    <SafeAreaView style={styles.safe}>
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
            <IconButton
              icon="calendar-outline"
              label={calExpanded ? t.hideCalendar : t.pickOtherDate(date)}
              active={calExpanded}
              style={styles.calToggleBtn}
              onPress={() => {
                tap();
                setCalExpanded((v) => !v);
              }}
            />
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

          {/* Time + Type — grouped in one card */}
          <View style={[styles.timeTypeGroup, { backgroundColor: theme.white, ...Shadow.card }]}>
            {/* Time field */}
            <View>
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
                <>
                  <Pressable
                    style={[styles.timeRow, { backgroundColor: theme.offWhite }]}
                    onPress={() => { tap(); setTimePickerOpen(true); }}
                  >
                    <Ionicons name="time-outline" size={16} color={theme.textLight} />
                    <Text style={[styles.timeRowText, { color: theme.text }]}>{time}</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.gray} />
                  </Pressable>

                  <Modal
                    visible={timePickerOpen}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setTimePickerOpen(false)}
                  >
                    <Pressable
                      style={styles.timeSheetBackdrop}
                      onPress={() => setTimePickerOpen(false)}
                    />
                    <View style={[styles.timeSheet, { backgroundColor: theme.white, paddingBottom: Math.max(Spacing.xl, bottomInset + Spacing.md) }]}>
                      <View style={[styles.timeSheetHandle, { backgroundColor: theme.grayLight }]} />
                      <Text style={[styles.timeSheetTitle, { color: theme.text }]}>{t.timeLabel}</Text>
                      <TimePickerWheel value={time} onChange={setTime} theme={theme} />
                      <Pressable
                        style={[styles.timeSheetDone, { backgroundColor: theme.orange }]}
                        onPress={() => setTimePickerOpen(false)}
                      >
                        <Text style={[styles.timeSheetDoneText, { color: theme.white }]}>{t.save}</Text>
                      </Pressable>
                    </View>
                  </Modal>
                </>
              ) : (
                <Text style={[styles.wheneverHint, { color: theme.textLight }]}>{t.wheneverHint}</Text>
              )}
            </View>

            {/* Type field */}
            <View>
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

          {/* Recurring */}
          <View style={styles.field}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.textLight }]}>{t.repeatWeekly}</Text>
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

          {/* Steps — immediate-persist checklist, mirrors components/PlanTaskCard.tsx's */}
          {existing && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textLight }]}>{t.stepsLabel}</Text>
              {sortedSteps.map((step, i) => (
                <View
                  key={step.id}
                  style={[
                    styles.stepRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.grayLight },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.stepCheck,
                      { borderColor: theme.orange },
                      step.done && { backgroundColor: theme.orange, borderColor: theme.orange },
                    ]}
                    onPress={() => toggleStep(step.id)}
                    hitSlop={8}
                  >
                    {step.done && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                  </Pressable>
                  <Text
                    style={[
                      styles.stepText,
                      { color: theme.text },
                      step.done && [styles.stepTextDone, { color: theme.textLight }],
                    ]}
                  >
                    {step.title}
                  </Text>
                  <View style={styles.stepActions}>
                    <Pressable
                      onPress={() => reorderStep(step.id, 'up')}
                      disabled={i === 0}
                      hitSlop={8}
                      style={i === 0 && { opacity: 0.3 }}
                    >
                      <Ionicons name="chevron-up" size={16} color={theme.gray} />
                    </Pressable>
                    <Pressable
                      onPress={() => reorderStep(step.id, 'down')}
                      disabled={i === sortedSteps.length - 1}
                      hitSlop={8}
                      style={i === sortedSteps.length - 1 && { opacity: 0.3 }}
                    >
                      <Ionicons name="chevron-down" size={16} color={theme.gray} />
                    </Pressable>
                    <Pressable onPress={() => removeStep(step.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
              <View style={[
                styles.addStepRow,
                sortedSteps.length > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.grayLight },
              ]}>
                <TextInput
                  style={[styles.addStepInput, { backgroundColor: theme.white, color: theme.text }]}
                  value={newStepTitle}
                  onChangeText={setNewStepTitle}
                  placeholder={t.stepPlaceholder}
                  placeholderTextColor={theme.gray}
                  returnKeyType="done"
                  onSubmitEditing={handleAddStep}
                />
                <Pressable style={[styles.addStepBtn, { backgroundColor: theme.orange }]} onPress={handleAddStep}>
                  <Text style={{ color: theme.white, fontSize: FontSize.lg, fontFamily: Fonts.bold }}>+</Text>
                </Pressable>
              </View>
            </View>
          )}

          {existing && (
            <Pressable style={[styles.deleteBtn, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]} onPress={confirmDelete}>
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
  headerTitle: { fontSize: FontSize.xl, fontFamily: Fonts.bold },
  cancel: { fontSize: FontSize.md },
  save: { fontSize: FontSize.md, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  field: { gap: Spacing.xs, paddingVertical: Spacing.sm },
  timeTypeGroup: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md },
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
  switchLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
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
  calToggleBtn: { alignSelf: 'flex-start' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  timeRowText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.semibold,
    minWidth: 48,
  },
  timeSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  timeSheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.fab,
  },
  timeSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
  },
  timeSheetTitle: {
    fontSize: FontSize.md,
    fontFamily: Fonts.semibold,
    textAlign: 'center',
  },
  timeSheetDone: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  timeSheetDoneText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bold,
  },
  daysRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  dayChip: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: FontSize.xs, fontWeight: '600' },
  deleteBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 1.5,
  },
  deleteBtnText: { fontWeight: '700', fontSize: FontSize.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs },
  stepCheck: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, fontSize: FontSize.sm, fontFamily: Fonts.medium },
  stepTextDone: { textDecorationLine: 'line-through' },
  stepActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addStepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  addStepInput: { flex: 1, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.sm },
  addStepBtn: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
});
