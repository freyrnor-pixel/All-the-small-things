/**
 * habit-form.tsx — add / edit a habit
 *
 * Modal form for one habit: build/break kind, icon, title, category, the four
 * cue→craving→response→reward steps, daily goal, recurrence, and an optional
 * daily notification. An `id` route param switches it to edit mode (with
 * delete); a `kind` param pre-seeds build vs. break for new habits.
 *
 * Connections:
 *   Imports → components/HabitIcon, components/ScreenBackground, components/Surface, constants/theme, lib/i18n, store/useHabitStore, store/useSettingsStore
 *   Used by → Expo Router route "/habit-form" (presented as a modal — see app/_layout.tsx)
 *   Data    → useHabitStore (habits table) via add/update/remove; toggling the notification schedules a habit reminder; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); colour theme comes from useSettingsStore.
 *   - recurrenceDays is always saved as [] here (weekday selection not exposed in this form).
 *   - notificationTime uses the TimePickerWheel component (same as task-form).
 *   - Essentials shown by default (W-D): Title → Frequency → Reminder. Icon, category,
 *     the four cue→craving→response→reward steps and daily goal live behind a
 *     "more options" disclosure; data wiring is unchanged.
 *   - add() needs routineOrder (Omit<Habit,'id'|'createdAt'|'active'>) — pass 0 on create
 *     (the store falls back to Date.now() when it's falsy).
 */
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
import TimePickerWheel from '@/components/TimePickerWheel';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import HabitIcon, { HABIT_ICON_NAMES } from '@/components/HabitIcon';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';

const HABIT_ICONS = HABIT_ICON_NAMES;

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
  childName: string;
};

export default function HabitForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: string; childName?: string }>();
  const isEdit = !!params.id;

  const habits = useHabitStore((s) => s.habits);
  const add = useHabitStore((s) => s.add);
  const update = useHabitStore((s) => s.update);
  const remove = useHabitStore((s) => s.remove);
  const childProfiles = useSettingsStore((s) => s.childProfiles);

  const theme = useAppTheme();
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  const existing = isEdit ? habits.find((h) => h.id === params.id) : null;

  const [form, setForm] = useState<FormState>({
    title: existing?.title ?? '',
    icon: existing?.icon ?? 'star-outline',
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
    childName: existing?.childName ?? (params.childName ?? ''),
  });

  // Advanced fields (icon, category, cue→craving→response→reward, daily goal) start
  // collapsed so the default view is just the essentials: Title → Frequency → Reminder.
  // Open by default in edit mode if any advanced field already holds a value.
  const [showMore, setShowMore] = useState<boolean>(
    isEdit && !!(existing && (existing.cue || existing.craving || existing.response || existing.reward || existing.dailyGoal > 1 || existing.category !== 'other'))
  );

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    if (!form.title.trim()) return;
    if (isEdit && params.id) {
      update(params.id, { ...form, recurrenceDays: [] });
    } else {
      // routineOrder satisfies Omit<Habit,'id'|'createdAt'|'active'>; the store
      // replaces a falsy 0 with Date.now() so new habits append to the end.
      add({ ...form, recurrenceDays: [], routineOrder: 0 });
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
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
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

          {/* For — profile assignment */}
          {childProfiles.length > 0 && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textLight }]}>{t.habitForLabel}</Text>
              <View style={styles.chipRow}>
                {(['', ...childProfiles] as string[]).map((name) => {
                  const active = form.childName === name;
                  return (
                    <Pressable
                      key={name || '__me__'}
                      style={[
                        styles.chip,
                        { backgroundColor: active ? theme.orange : theme.grayLight },
                      ]}
                      onPress={() => patch('childName', name)}
                    >
                      <Text style={[styles.chipText, active && { color: Colors.white }]}>
                        {name || t.habitForMe}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Notification */}
          <Surface style={styles.notifRow}>
            <Text style={[styles.notifLabel, { color: theme.text }]}>{t.habitNotification}</Text>
            <Switch
              value={form.notificationEnabled}
              onValueChange={(v) => patch('notificationEnabled', v)}
              trackColor={{ false: Colors.grayLight, true: Colors.orange }}
              thumbColor={Colors.white}
            />
          </Surface>
          {form.notificationEnabled && (
            <TimePickerWheel
              value={form.notificationTime}
              onChange={(v) => patch('notificationTime', v)}
              theme={theme}
            />
          )}

          {/* W-D: advanced fields collapsed behind a disclosure so the default
              view is just the essentials (Title → Frequency → Reminder). */}
          <Pressable
            style={[styles.disclosure, { borderColor: theme.grayLight }]}
            onPress={() => setShowMore((v) => !v)}
          >
            <Text style={[styles.disclosureText, { color: theme.textLight }]}>
              {showMore ? `${t.habits.fewerOptions} ↑` : `${t.habits.moreOptions} ↓`}
            </Text>
          </Pressable>

          {showMore && (
            <>
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
                        <HabitIcon
                          icon={icon}
                          size={22}
                          color={form.icon === icon ? theme.white : theme.text}
                        />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
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

              {/* Four steps: cue → craving → response → reward */}
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
            </>
          )}

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

const baseStyles = StyleSheet.create({
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: Radius.md, padding: Spacing.md, ...Shadow.card,
  },
  notifLabel: { fontSize: FontSize.md, fontWeight: '600' },
  // W-D: "more options" disclosure toggle for advanced habit fields.
  disclosure: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  disclosureText: { fontSize: FontSize.sm, fontWeight: '600' },
  deleteBtn: {
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  deleteBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
