import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore, Task, TaskType, Importance } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import HintCard from '@/components/HintCard';
import { Colors, FontSize, Radius, Shadow, Spacing, getTheme } from '@/constants/theme';

const DAY_LABELS_NO = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TaskFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.add);
  const updateTask = useTaskStore((s) => s.update);
  const removeTask = useTaskStore((s) => s.remove);
  const settings = useSettingsStore();
  const t = useT();
  const theme = getTheme(settings.colorTheme);

  const existing = id ? tasks.find((task) => task.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [time, setTime] = useState(existing?.time ?? '');
  const [taskType, setTaskType] = useState<TaskType>(existing?.taskType ?? 'start-at');
  const [duration, setDuration] = useState(String(existing?.durationMinutes ?? '30'));
  const [recurring, setRecurring] = useState(existing?.recurring ?? 'none');
  const [recurringDays, setRecurringDays] = useState<number[]>(existing?.recurringDays ?? []);
  const [importance, setImportance] = useState<Importance>(existing?.importance ?? 'regular');

  const dayLabels = settings.language === 'en' ? DAY_LABELS_EN : DAY_LABELS_NO;

  function toggleDay(d: number) {
    setRecurringDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function save() {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      date,
      time: time.trim() || undefined,
      taskType,
      durationMinutes: taskType === 'time-box' ? Number(duration) || 30 : undefined,
      done: existing?.done ?? false,
      recurring: recurring as 'none' | 'weekly',
      recurringDays: recurring === 'weekly' ? recurringDays : [],
      importance,
    };
    if (existing) {
      updateTask(existing.id, payload);
    } else {
      addTask(payload);
    }
    router.back();
  }

  function del() {
    if (existing) removeTask(existing.id);
    router.back();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
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
        >
          <HintCard text={t.hints.taskForm.text} example={t.hints.taskForm.example} />

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

          {/* Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.dateLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.white, color: theme.text }]}
              value={date}
              onChangeText={setDate}
              placeholder="2025-01-15"
              placeholderTextColor={theme.gray}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Time */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.timeLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.white, color: theme.text }]}
              value={time}
              onChangeText={setTime}
              placeholder="14:00"
              placeholderTextColor={theme.gray}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.typeLabel}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['start-at', 'time-box'] as TaskType[]).map((type) => (
                <Pressable
                  key={type}
                  style={[styles.seg, taskType === type && styles.segActive]}
                  onPress={() => setTaskType(type)}
                >
                  <Text style={[styles.segText, { color: theme.textLight }, taskType === type && { color: theme.text, fontWeight: '600' }]}>
                    {type === 'start-at' ? t.typeStartAt : t.typeTimeBox}
                  </Text>
                </Pressable>
              ))}
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
                  style={[styles.seg, importance === imp && styles.segActive]}
                  onPress={() => setImportance(imp)}
                >
                  <Text style={[styles.segText, { color: theme.textLight }, importance === imp && { color: theme.text, fontWeight: '600' }]}>
                    {imp === 'regular' ? t.importanceRegular : t.importanceEssential}
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
                      {label}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  segActive: { backgroundColor: Colors.white, ...Shadow.card },
  segText: { fontSize: FontSize.sm, textAlign: 'center' },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daysRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  dayChip: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: FontSize.xs, fontWeight: '600' },
  deleteBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  deleteBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
