import React, { useEffect, useState } from 'react';
import {
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
import { useTaskStore, Task, TaskType } from '@/store/useTaskStore';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const DAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

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

  const existing = id ? tasks.find((t) => t.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [time, setTime] = useState(existing?.time ?? '');
  const [taskType, setTaskType] = useState<TaskType>(existing?.taskType ?? 'start-at');
  const [duration, setDuration] = useState(String(existing?.durationMinutes ?? '30'));
  const [recurring, setRecurring] = useState(existing?.recurring ?? 'none');
  const [recurringDays, setRecurringDays] = useState<number[]>(existing?.recurringDays ?? []);

  function toggleDay(d: number) {
    setRecurringDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Avbryt</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{existing ? 'Rediger' : 'Ny oppgave'}</Text>
        <Pressable onPress={save}>
          <Text style={styles.save}>Lagre</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Oppgave</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Hva skal gjøres?"
            placeholderTextColor={Colors.gray}
            autoFocus={!existing}
            returnKeyType="next"
          />
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Dato (ÅÅÅÅ-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2025-01-15"
            placeholderTextColor={Colors.gray}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Time */}
        <View style={styles.field}>
          <Text style={styles.label}>Tidspunkt (HH:MM) – valgfritt</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="14:00"
            placeholderTextColor={Colors.gray}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.segmented}>
            <Pressable
              style={[styles.seg, taskType === 'start-at' && styles.segActive]}
              onPress={() => setTaskType('start-at')}
            >
              <Text style={[styles.segText, taskType === 'start-at' && styles.segActiveText]}>
                Start på dette tidspunktet
              </Text>
            </Pressable>
            <Pressable
              style={[styles.seg, taskType === 'time-box' && styles.segActive]}
              onPress={() => setTaskType('time-box')}
            >
              <Text style={[styles.segText, taskType === 'time-box' && styles.segActiveText]}>
                Fra da til da (timer)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Duration (timebox only) */}
        {taskType === 'time-box' && (
          <View style={styles.field}>
            <Text style={styles.label}>Varighet (minutter)</Text>
            <View style={styles.durationRow}>
              {[15, 20, 30, 45, 60, 90].map((m) => (
                <Pressable
                  key={m}
                  style={[styles.durationChip, duration === String(m) && styles.durationChipActive]}
                  onPress={() => setDuration(String(m))}
                >
                  <Text
                    style={[styles.durationText, duration === String(m) && styles.durationTextActive]}
                  >
                    {m}m
                  </Text>
                </Pressable>
              ))}
              <TextInput
                style={styles.durationInput}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder="min"
                placeholderTextColor={Colors.gray}
              />
            </View>
          </View>
        )}

        {/* Recurring */}
        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Gjentas ukentlig</Text>
            <Switch
              value={recurring === 'weekly'}
              onValueChange={(v) => setRecurring(v ? 'weekly' : 'none')}
              trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
              thumbColor={recurring === 'weekly' ? Colors.orange : Colors.gray}
            />
          </View>
          {recurring === 'weekly' && (
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, i) => (
                <Pressable
                  key={i}
                  style={[styles.dayChip, recurringDays.includes(i) && styles.dayChipActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text
                    style={[styles.dayText, recurringDays.includes(i) && styles.dayTextActive]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {existing && (
          <Pressable style={styles.deleteBtn} onPress={del}>
            <Text style={styles.deleteBtnText}>Slett oppgave</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
    backgroundColor: Colors.white,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  cancel: { fontSize: FontSize.md, color: Colors.textLight },
  save: { fontSize: FontSize.md, color: Colors.orange, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    ...Shadow.card,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.grayLight,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  seg: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segActive: { backgroundColor: Colors.white, ...Shadow.card },
  segText: { fontSize: FontSize.sm, color: Colors.textLight, textAlign: 'center' },
  segActiveText: { color: Colors.text, fontWeight: '600' },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  durationChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
  },
  durationChipActive: { backgroundColor: Colors.orange },
  durationText: { fontSize: FontSize.sm, color: Colors.text },
  durationTextActive: { color: Colors.white, fontWeight: '700' },
  durationInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    width: 60,
    textAlign: 'center',
    ...Shadow.card,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daysRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: Colors.orange },
  dayText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  dayTextActive: { color: Colors.white },
  deleteBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  deleteBtnText: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },
});
