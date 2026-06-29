/**
 * PlanTaskCard.tsx — one task's padlock-free, accordion-gated Container in Plans.
 *
 * Plans (app/plans.tsx) renders a stack of these, one per task, instead of
 * DayTimeline's single agenda list. Wraps ExpandableCard in its new controlled mode
 * (open/onToggle owned by the screen, not internal state) so the screen can aggregate
 * dirty state across every simultaneously-open task. Closed: title = task name,
 * subtitle = time, rightAction = checkbox-circle. Open: the app/task-form.tsx-equivalent
 * field set (title/date/time/type/duration/importance/recurring/delete), ported inline
 * with every `setX(...)` replaced by `onFieldChange('field', value)` — field values and
 * dirty-tracking live in the screen's lifted `edits` map, not here, so a screen-level
 * "save all" can act on every open task at once. Same dumb-component-wraps-shared-primitive
 * divide as components/WeekListCard.tsx wrapping Container. Also renders a Steps checklist
 * (checkbox + reorder + remove + inline add) between the Recurring field and Delete —
 * unlike the rest of the card, steps persist immediately (see Edit notes). Section
 * membership (Important/General) and position within a section are NOT edited here —
 * those are set by dragging the card on app/plans.tsx itself (components/DraggableTaskRow.tsx).
 *
 * Connections:
 *   Imports → components/AppModal, components/ExpandableCard, components/DatePickerCalendar, components/IconButton, constants/theme, lib/date, lib/haptics, lib/i18n, store/useTaskStore (types only)
 *   Used by → app/plans.tsx
 *   Data    → none directly — every field/callback is owned by the parent (app/plans.tsx)
 *
 * Edit notes:
 *   - Collapsed header is title-only (no time subtitle) — every card now gets a leading
 *     AddDivider in app/plans.tsx instead, so the closed row stays minimal.
 *   - Delete is confirm-gated via confirmDelete()/showAppModal (mirrors app/habit-form.tsx's
 *     confirmDelete()) — the `onDelete` prop only fires from the modal's destructive button.
 *   - `calExpanded` is local UI state (which date-picker is showing its full calendar) —
 *     it isn't part of the task's edit fields, so it doesn't need to live in the screen's
 *     lifted state, unlike `fields`/`dirty`.
 *   - TYPE_ICON/TYPE_ACCENT/nextHourStr() are duplicated from app/task-form.tsx rather than
 *     shared — both files now carry the same small, self-contained lookups in step with
 *     each other (kept in sync by hand on edit, not extracted, since each is only a few lines).
 *   - `fieldsFromTask`/`fieldsToTaskPayload` are the only place the Task <-> form-field shape
 *     conversion happens — app/plans.tsx uses them to seed `edits` and to build the save payload.
 *   - `steps`/`onAddStep`/`onToggleStep`/`onRemoveStep`/`onReorderStep` are NOT part of the
 *     `fields`/`dirty` lifted-edit-state system above — they're immediate-persist, like
 *     app/meals.tsx's ingredient list. The parent (app/plans.tsx) calls the matching
 *     useTaskStore action directly on every tap; there's no save step for steps. Only
 *     `newStepTitle` (the transient add-row input) is local state here.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExpandableCard from '@/components/ExpandableCard';
import DatePickerCalendar from '@/components/DatePickerCalendar';
import IconButton from '@/components/IconButton';
import { showAppModal } from '@/components/AppModal';
import { Task, TaskType, Importance, Recurring, TaskStep } from '@/store/useTaskStore';
import { AppColors, Colors, FeatureColors, FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import { dateStr, dayOfWeekMon0 } from '@/lib/date';
import { tap, warning } from '@/lib/haptics';

export type TaskFormFields = {
  title: string;
  date: string;
  timeEnabled: boolean;
  time: string;
  taskType: TaskType;
  duration: string;
  recurring: Recurring;
  recurringDays: number[];
  importance: Importance;
};

function nextHourStr(): string {
  const h = (new Date().getHours() + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

export function fieldsFromTask(task: Task): TaskFormFields {
  return {
    title: task.title,
    date: task.date,
    timeEnabled: !!task.time,
    time: task.time ?? nextHourStr(),
    taskType: task.taskType,
    duration: String(task.durationMinutes ?? 30),
    recurring: task.recurring,
    recurringDays: task.recurringDays,
    importance: task.importance,
  };
}

export function fieldsToTaskPayload(fields: TaskFormFields): Omit<Task, 'id' | 'done' | 'sortOrder'> {
  return {
    title: fields.title.trim(),
    date: fields.date,
    time: fields.timeEnabled ? fields.time : undefined,
    taskType: fields.taskType,
    durationMinutes: fields.taskType === 'time-box' ? Number(fields.duration) || 30 : undefined,
    recurring: fields.recurring,
    recurringDays: fields.recurring === 'weekly' ? fields.recurringDays : [],
    importance: fields.importance,
    steps: [],
  };
}

const TYPE_ICON: Record<TaskType, keyof typeof Ionicons.glyphMap> = {
  'start-at': 'time-outline',
  'time-box': 'timer-outline',
};
const TYPE_ACCENT: Record<TaskType, string> = {
  'start-at': FeatureColors.shared,
  'time-box': FeatureColors.task,
};

type Props = {
  task: Task;
  theme: AppColors;
  open: boolean;
  onToggleOpen: () => void;
  fields: TaskFormFields;
  dirty: boolean;
  onFieldChange: <K extends keyof TaskFormFields>(field: K, value: TaskFormFields[K]) => void;
  onToggleDone: () => void;
  onSave: () => void;
  onDelete: () => void;
  steps: TaskStep[];
  onAddStep: (title: string) => void;
  onToggleStep: (id: string) => void;
  onRemoveStep: (id: string) => void;
  onReorderStep: (id: string, direction: 'up' | 'down') => void;
};

export default function PlanTaskCard({
  task,
  theme,
  open,
  onToggleOpen,
  fields,
  dirty,
  onFieldChange,
  onToggleDone,
  onSave,
  onDelete,
  steps,
  onAddStep,
  onToggleStep,
  onRemoveStep,
  onReorderStep,
}: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const [calExpanded, setCalExpanded] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const { dayLabels, months } = t;
  const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);

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
    const next = fields.recurringDays.includes(d)
      ? fields.recurringDays.filter((x) => x !== d)
      : [...fields.recurringDays, d];
    onFieldChange('recurringDays', next);
  }

  function confirmDelete() {
    warning();
    showAppModal(t.deleteConfirmTitle(task.title || t.taskTitlePlaceholder), t.deleteConfirmBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.deleteConfirmBtn, style: 'destructive', onPress: onDelete },
    ]);
  }

  function handleAddStep() {
    const title = newStepTitle.trim();
    if (!title) return;
    onAddStep(title);
    setNewStepTitle('');
  }

  return (
    <ExpandableCard
      title={task.title}
      open={open}
      onToggle={onToggleOpen}
      accentColor={theme.orange}
      rightAction={
        <View style={styles.headerActions}>
          {open ? (
            dirty ? (
              <Pressable
                onPress={onSave}
                style={[styles.savePill, { backgroundColor: theme.orange, borderColor: theme.orange }]}
              >
                <Text style={[styles.savePillText, { color: theme.white }]}>{t.save}</Text>
              </Pressable>
            ) : (
              <View
                style={[styles.savePill, { backgroundColor: theme.orange, borderColor: theme.orange, opacity: 0.5 }]}
              >
                <Text style={[styles.savePillText, { color: theme.white }]}>{t.save}</Text>
              </View>
            )
          ) : null}
          <Pressable
            style={[
              styles.check,
              { borderColor: theme.orange },
              task.done && { backgroundColor: theme.orange, borderColor: theme.orange },
            ]}
            onPress={onToggleDone}
            hitSlop={8}
          >
            {task.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </Pressable>
        </View>
      }
    >
      <View style={styles.fieldsWrap}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textLight }]}>{t.taskTitleLabel}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.white, color: theme.text }]}
            value={fields.title}
            onChangeText={(v) => onFieldChange('title', v)}
            placeholder={t.taskTitlePlaceholder}
            placeholderTextColor={theme.gray}
            returnKeyType="next"
          />
        </View>

        {/* Date — Mon–Sun chip row, with the full calendar collapsed behind a toggle */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textLight }]}>{t.dateLabel}</Text>
          <View style={styles.weekRow}>
            {weekDays.map((wd) => {
              const active = fields.date === wd.value;
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
                    onFieldChange('date', wd.value);
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
            label={calExpanded ? t.hideCalendar : t.pickOtherDate(fields.date)}
            active={calExpanded}
            style={styles.calToggleBtn}
            onPress={() => {
              tap();
              setCalExpanded((v) => !v);
            }}
          />
          {calExpanded && (
            <DatePickerCalendar
              value={fields.date}
              onChange={(d) => {
                onFieldChange('date', d);
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
                style={[styles.seg, fields.timeEnabled === isSet && [styles.segActive, { backgroundColor: theme.white }]]}
                onPress={() => {
                  tap();
                  onFieldChange('timeEnabled', isSet);
                  if (!isSet) onFieldChange('time', nextHourStr());
                }}
              >
                <Text
                  style={[
                    styles.segText,
                    { color: theme.textLight },
                    fields.timeEnabled === isSet && { color: theme.text, fontWeight: '600' },
                  ]}
                >
                  {isSet ? t.timeModeSet : t.timeModeWhenever}
                </Text>
              </Pressable>
            ))}
          </View>
          {fields.timeEnabled ? (
            <TextInput
              style={[styles.timeInput, { color: theme.text, backgroundColor: theme.offWhite }]}
              placeholder="HH:MM"
              placeholderTextColor={theme.gray}
              value={fields.time}
              onChangeText={(v) => onFieldChange('time', v)}
              keyboardType="numbers-and-punctuation"
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
              const active = fields.taskType === type;
              const accent = TYPE_ACCENT[type];
              return (
                <Pressable
                  key={type}
                  style={[styles.segType, active && [styles.segActive, { backgroundColor: theme.white }]]}
                  onPress={() => {
                    tap();
                    onFieldChange('taskType', type);
                  }}
                >
                  <Ionicons name={TYPE_ICON[type]} size={16} color={active ? accent : theme.gray} />
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
        {fields.taskType === 'time-box' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.durationLabel}</Text>
            <View style={styles.durationRow}>
              {[15, 20, 30, 45, 60, 90].map((m) => (
                <Pressable
                  key={m}
                  style={[
                    styles.durationChip,
                    { backgroundColor: theme.grayLight },
                    fields.duration === String(m) && { backgroundColor: theme.orange },
                  ]}
                  onPress={() => onFieldChange('duration', String(m))}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: theme.text },
                      fields.duration === String(m) && { color: Colors.white, fontWeight: '700' },
                    ]}
                  >
                    {m}m
                  </Text>
                </Pressable>
              ))}
              <TextInput
                style={[styles.durationInput, { backgroundColor: theme.white, color: theme.text }]}
                value={fields.duration}
                onChangeText={(v) => onFieldChange('duration', v)}
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
            <Text style={[styles.label, { color: theme.textLight }]}>{t.repeatWeekly}</Text>
            <Switch
              value={fields.recurring === 'weekly'}
              onValueChange={(v) => onFieldChange('recurring', v ? 'weekly' : 'none')}
              trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
              thumbColor={fields.recurring === 'weekly' ? theme.orange : theme.gray}
            />
          </View>
          {fields.recurring === 'weekly' && (
            <View style={styles.daysRow}>
              {dayLabels.map((label, i) => (
                <Pressable
                  key={i}
                  style={[styles.dayChip, { backgroundColor: theme.grayLight }, fields.recurringDays.includes(i) && { backgroundColor: theme.orange }]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayText, { color: theme.text }, fields.recurringDays.includes(i) && { color: Colors.white }]}>
                    {label.slice(0, 2)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Steps — immediate-persist checklist, mirrors app/meals.tsx's ingredient list */}
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
                onPress={() => onToggleStep(step.id)}
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
                  onPress={() => onReorderStep(step.id, 'up')}
                  disabled={i === 0}
                  hitSlop={8}
                  style={i === 0 && { opacity: 0.3 }}
                >
                  <Ionicons name="chevron-up" size={16} color={theme.gray} />
                </Pressable>
                <Pressable
                  onPress={() => onReorderStep(step.id, 'down')}
                  disabled={i === sortedSteps.length - 1}
                  hitSlop={8}
                  style={i === sortedSteps.length - 1 && { opacity: 0.3 }}
                >
                  <Ionicons name="chevron-down" size={16} color={theme.gray} />
                </Pressable>
                <Pressable onPress={() => onRemoveStep(step.id)} hitSlop={8}>
                  <Text style={{ fontSize: FontSize.lg, color: theme.gray }}>−</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <View style={styles.addStepRow}>
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

        <Pressable style={[styles.deleteBtn, { backgroundColor: theme.dangerLight }]} onPress={confirmDelete}>
          <Text style={[styles.deleteBtnText, { color: theme.danger }]}>{t.deleteTask}</Text>
        </Pressable>
      </View>
    </ExpandableCard>
  );
}

const baseStyles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1 },
  savePillText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  fieldsWrap: { gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '600' },
  input: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    ...Shadow.card,
  },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3, gap: 3 },
  seg: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
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
  weekChip: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', gap: 2 },
  weekChipDay: { fontSize: FontSize.xs, fontWeight: '600' },
  weekChipNum: { fontSize: FontSize.sm },
  calToggleBtn: { alignSelf: 'flex-start' },
  timeInput: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    textAlign: 'center',
    width: 90,
  },
  daysRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  dayChip: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: FontSize.xs, fontWeight: '600' },
  deleteBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
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
  addStepBtn: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
});
