/**
 * QuickAddSheet.tsx — bottom-sheet for quickly adding a task from the home screen.
 *
 * Modal with a title input, a horizontal day picker (today + next 6 days), and
 * an optional time field. On save it creates a default 'start-at' task via the
 * task store. State resets each time the sheet becomes visible.
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, constants/theme, lib/date, lib/i18n, store/useSettingsStore, store/useTaskStore, react-native-safe-area-context
 *   Used by → app/index.tsx
 *   Data    → calls useTaskStore.add() to insert a task; reads colorTheme from useSettingsStore; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - dayOptions is memoized on t.today/t.tomorrow; a language change remounts the sheet so dayShort stays in sync.
 *   - save() builds a task with fixed defaults (taskType 'start-at', recurring 'none', importance 'regular') — extend here for richer quick-add.
 *   - All visible strings via useT(); placeholders like "HH:MM" are format hints, not user copy.
 *   - save() shows a ConfirmationBanner and delays onClose() by 300ms (mirrors task-form.tsx) so there's
 *     always positive proof the task was saved, even if it sorts past the home screen's visible cap.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTaskStore } from '@/store/useTaskStore';
import { useT } from '@/lib/i18n';
import { todayStr, dateStr } from '@/lib/date';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import ConfirmationBanner from '@/components/ConfirmationBanner';

type DayOption = { label: string; date: string };

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function QuickAddSheet({ visible, onClose }: Props) {
  const addTask = useTaskStore((s) => s.add);
  const theme = useAppTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showTime, setShowTime] = useState(false);
  const [time, setTime] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const dayOptions = useMemo((): DayOption[] => {
    const today = new Date();
    const opts: DayOption[] = [{ label: t.today, date: dateStr(today) }];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      opts.push({
        label: i === 1 ? t.tomorrow : t.dayShort[d.getDay()],
        date: dateStr(d),
      });
    }
    return opts;
    // dayShort/today/tomorrow only change when language changes, which remounts this sheet anyway
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.today, t.tomorrow]);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setSelectedDate(todayStr());
      setShowTime(false);
      setTime('');
      setConfirm(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [visible]);

  function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({
      title: trimmed,
      date: selectedDate,
      time: time.trim() || undefined,
      taskType: 'start-at',
      durationMinutes: undefined,
      done: false,
      recurring: 'none',
      recurringDays: [],
      importance: 'regular',
      priority: 'medium',
    });
    setConfirm(t.taskSavedSimple);
    // Let the confirmation land before the sheet closes — mirrors task-form.tsx.
    setTimeout(onClose, 300);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
      >
        <View style={[styles.sheet, { backgroundColor: theme.white, paddingBottom: Math.max(Spacing.xl, bottomInset + Spacing.md) }]}>
          <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />

          <TextInput
            ref={inputRef}
            style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.grayLight }]}
            placeholder={t.whatToDo}
            placeholderTextColor={theme.gray}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            onSubmitEditing={save}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayScroll}
            contentContainerStyle={styles.dayRow}
          >
            {dayOptions.map((opt) => {
              const active = selectedDate === opt.date;
              return (
                <Pressable
                  key={opt.date}
                  style={[
                    styles.dayChip,
                    { backgroundColor: active ? theme.orange : theme.grayLight },
                  ]}
                  onPress={() => setSelectedDate(opt.date)}
                >
                  <Text style={[styles.dayChipText, { color: active ? Colors.white : theme.text }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!showTime ? (
            <Pressable style={styles.timeToggle} onPress={() => setShowTime(true)}>
              <Text style={[styles.timeToggleText, { color: theme.textLight }]}>
                {t.addTime}
              </Text>
            </Pressable>
          ) : (
            <TextInput
              style={[styles.timeInput, { color: theme.text, backgroundColor: theme.offWhite }]}
              placeholder="HH:MM"
              placeholderTextColor={theme.gray}
              value={time}
              onChangeText={setTime}
              keyboardType="numbers-and-punctuation"
            />
          )}

          <Pressable
            style={[
              styles.saveBtn,
              { backgroundColor: theme.orange },
              (!title.trim() || !!confirm) && styles.saveBtnDisabled,
            ]}
            onPress={save}
            disabled={!title.trim() || !!confirm}
          >
            <Text style={styles.saveBtnText}>{t.save}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  kvWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.fab,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.xs,
  },
  titleInput: {
    fontSize: FontSize.xl,
    fontWeight: '500',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  dayScroll: { flexGrow: 0 },
  dayRow: { flexDirection: 'row', gap: Spacing.xs },
  dayChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  dayChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  timeToggle: { paddingVertical: Spacing.xs },
  timeToggleText: { fontSize: FontSize.sm, fontWeight: '600' },
  timeInput: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  saveBtn: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
});
