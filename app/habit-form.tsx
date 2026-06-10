import React, { useState } from 'react';
import {
  Alert,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHabitStore, HabitKind, HabitRecurrence, HabitCategory } from '@/store/useHabitStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

const HABIT_ICONS = [
  '💧','🏃','📚','🧘','🥗','💊','😴','🏋️','🧹','🌿',
  '☕','📵','🚭','🍺','🎮','⭐','💪','🎯','🌅','🍎',
  '🦷','✍️','🧠','🫁','🫀','🌊','🔥','🎵','🧩','💤',
];

type FormState = {
  title: string;
  icon: string;
  kind: HabitKind;
  category: HabitCategory;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  dailyGoal: number;
  recurrence: HabitRecurrence;
  notificationEnabled: boolean;
  notificationTime: string;
};

export default function HabitForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const isEdit = !!params.id;

  const habits = useHabitStore((s) => s.habits);
  const add = useHabitStore((s) => s.add);
  const update = useHabitStore((s) => s.update);
  const remove = useHabitStore((s) => s.remove);

  const theme = useAppTheme();
  const t = useT();

  const existing = isEdit ? habits.find((h) => h.id === params.id) : null;

  const [form, setForm] = useState<FormState>({
    title: existing?.title ?? '',
    icon: existing?.icon ?? '⭐',
    kind: existing?.kind ?? (params.kind === 'break' ? 'break' : 'build'),
    category: existing?.category ?? 'other',
    cue: existing?.cue ?? '',
    craving: existing?.craving ?? '',
    response: existing?.response ?? '',
    reward: existing?.reward ?? '',
    dailyGoal: existing?.dailyGoal ?? 1,
    recurrence: existing?.recurrence ?? 'daily',
    notificationEnabled: existing?.notificationEnabled ?? false,
    notificationTime: existing?.notificationTime ?? '08:00',
  });

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    if (!form.title.trim()) return;
    if (isEdit && params.id) {
      update(params.id, { ...form, recurrenceDays: [] });
    } else {
      add({ ...form, recurrenceDays: [] });
    }
    router.back();
  }

  function confirmDelete() {
    Alert.alert(
      t.resetConfirmTitle(form.title),
      t.resetConfirmBody,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.resetConfirmBtn,
          style: 'destructive',
          onPress: () => { if (params.id) remove(params.id); router.back(); },
        },
      ]
    );
  }

  const recurrenceOptions: { key: HabitRecurrence; label: string }[] = [
    { key: 'daily', label: t.habitRecurrenceDaily },
    { key: 'weekly', label: t.habitRecurrenceWeekly },
    { key: 'monthly', label: t.habitRecurrenceMonthly },
    { key: 'one-time', label: t.habitRecurrenceOnce },
  ];

  const categoryKeys = ['physical', 'mental', 'health', 'nutrition', 'sleep', 'work', 'wellbeing', 'other'] as HabitCategory[];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={[styles.header, { borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.orange }]}>{t.cancel}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {isEdit ? t.habitFormEdit : t.habitFormTitle}
        </Text>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: theme.orange }, !form.title.trim() && { opacity: 0.4 }]}
          onPress={save}
          disabled={!form.title.trim()}
        >
          <Text style={styles.saveBtnText}>{t.save}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Kind toggle */}
          <View style={[styles.kindToggle, { backgroundColor: theme.grayLight }]}>
            {(['build', 'break'] as HabitKind[]).map((k) => (
              <Pressable
                key={k}
                style={[
                  styles.kindOption,
                  form.kind === k && {
                    backgroundColor: k === 'build' ? theme.green : theme.danger,
                    ...Shadow.card,
                  },
                ]}
                onPress={() => patch('kind', k)}
              >
                <Text style={[
                  styles.kindText,
                  form.kind === k && { color: Colors.white, fontWeight: '700' },
                ]}>
                  {k === 'build' ? `${t.habitKindBuild} ↑` : `${t.habitKindBreak} ↓`}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Icon picker */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.habitIconLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.iconRow}>
                {HABIT_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.iconBtn,
                      { backgroundColor: theme.grayLight },
                      form.icon === icon && { backgroundColor: theme.orange },
                    ]}
                    onPress={() => patch('icon', icon)}
                  >
                    <Text style={styles.iconEmoji}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.habitTitleLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.white, color: theme.text }]}
              value={form.title}
              onChangeText={(v) => patch('title', v)}
              placeholder={t.habitTitlePlaceholder}
              placeholderTextColor={theme.gray}
              autoFocus={!isEdit}
              returnKeyType="next"
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {categoryKeys.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.grayLight },
                      form.category === cat && { backgroundColor: theme.orange },
                    ]}
                    onPress={() => patch('category', cat)}
                  >
                    <Text style={[styles.chipText, form.category === cat && { color: Colors.white }]}>
                      {t.habitCategories[cat]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Four steps */}
          {([
            { key: 'cue', label: t.habitCue, placeholder: t.habitCuePlaceholder },
            { key: 'craving', label: t.habitCraving, placeholder: t.habitCravingPlaceholder },
            { key: 'response', label: t.habitResponse, placeholder: t.habitResponsePlaceholder },
            { key: 'reward', label: t.habitReward, placeholder: t.habitRewardPlaceholder },
          ] as { key: keyof FormState; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
            <View key={key} style={styles.field}>
              <Text style={[styles.label, { color: theme.textLight }]}>{label}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.white, color: theme.text }]}
                value={form[key] as string}
                onChangeText={(v) => patch(key, v)}
                placeholder={placeholder}
                placeholderTextColor={theme.gray}
                returnKeyType="next"
              />
            </View>
          ))}

          {/* Daily goal stepper */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.habitDailyGoal}</Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepperBtn, { backgroundColor: theme.grayLight }]}
                onPress={() => patch('dailyGoal', Math.max(1, form.dailyGoal - 1))}
              >
                <Text style={[styles.stepperBtnText, { color: theme.text }]}>−</Text>
              </Pressable>
              <Text style={[styles.stepperValue, { color: theme.text }]}>{form.dailyGoal}</Text>
              <Pressable
                style={[styles.stepperBtn, { backgroundColor: theme.orange }]}
                onPress={() => patch('dailyGoal', Math.min(20, form.dailyGoal + 1))}
              >
                <Text style={[styles.stepperBtnText, { color: Colors.white }]}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Recurrence */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textLight }]}>{t.habitRecurrence}</Text>
            <View style={styles.chipRow}>
              {recurrenceOptions.map(({ key, label }) => (
                <Pressable
                  key={key}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.grayLight },
                    form.recurrence === key && { backgroundColor: theme.orange },
                  ]}
                  onPress={() => patch('recurrence', key)}
                >
                  <Text style={[styles.chipText, form.recurrence === key && { color: Colors.white }]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notification */}
          <View style={[styles.notifRow, { backgroundColor: theme.white }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifLabel, { color: theme.text }]}>{t.habitNotification}</Text>
              {form.notificationEnabled && (
                <TextInput
                  style={[styles.timeInput, { color: theme.text, backgroundColor: theme.offWhite }]}
                  value={form.notificationTime}
                  onChangeText={(v) => patch('notificationTime', v)}
                  placeholder="08:00"
                  placeholderTextColor={theme.gray}
                  keyboardType="numeric"
                  maxLength={5}
                />
              )}
            </View>
            <Switch
              value={form.notificationEnabled}
              onValueChange={(v) => patch('notificationEnabled', v)}
              trackColor={{ false: Colors.grayLight, true: Colors.orange }}
              thumbColor={Colors.white}
            />
          </View>

          {/* Delete */}
          {isEdit && (
            <Pressable style={[styles.deleteBtn, { backgroundColor: Colors.dangerLight }]} onPress={confirmDelete}>
              <Text style={[styles.deleteBtnText, { color: Colors.danger }]}>{t.habitDeleteLabel}</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1,
  },
  cancel: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.lg, fontWeight: '700' },
  saveBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  content: { padding: Spacing.md, gap: Spacing.md },
  kindToggle: {
    flexDirection: 'row', borderRadius: Radius.md, padding: 3, gap: 3,
  },
  kindOption: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center',
  },
  kindText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '600' },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: Radius.md, padding: Spacing.md,
    fontSize: FontSize.md, ...Shadow.card,
  },
  iconRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs },
  iconBtn: {
    width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.full,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepperBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { fontSize: FontSize.xl, fontWeight: '300', lineHeight: 40 },
  stepperValue: { fontSize: FontSize.xl, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md,
    padding: Spacing.md, gap: Spacing.md, ...Shadow.card,
  },
  notifLabel: { fontSize: FontSize.md, fontWeight: '600' },
  timeInput: {
    borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md,
    marginTop: Spacing.xs, width: 80,
  },
  deleteBtn: {
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  deleteBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
