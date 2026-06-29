/**
 * capture.tsx — quick-capture inbox entry point (AP-02)
 *
 * Single-purpose modal: type a thought, tap Capture, it lands in the inbox
 * (store/useInboxStore.ts) instantly — no date, time, or category to decide on
 * up front. Stays open after each capture (input cleared + refocused) so
 * several thoughts can be jotted down in one sitting; closes only via Back.
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, components/PressableScale, constants/theme, lib/i18n, lib/useAppTheme, store/useInboxStore
 *   Used by → Expo Router route "/capture" (presented as a modal — see app/_layout.tsx), components/BubbleMenu.tsx (capture bubble), components/InboxSection.tsx (edit affordance, passes ?id=)
 *   Data    → useInboxStore.add() inserts into inbox_items; useInboxStore.update() edits an existing row
 *
 * Edit notes:
 *   - All visible strings go through useT() (t.inbox.*).
 *   - Deliberately no task-form-style fields here (date/time/priority) — those
 *     decisions happen later when promoting an item via components/InboxSection.tsx.
 *   - Dual-purpose: with no params it's add-mode (stays open after each capture);
 *     with ?id=<inbox id> it's edit-mode (pre-fills the row, saves via update(),
 *     then closes) — mirrors the id-param pattern in app/task-form.tsx / habit-form.tsx.
 */
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useT } from '@/lib/i18n';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useInboxStore } from '@/store/useInboxStore';

export default function CaptureScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const addItem = useInboxStore((s) => s.add);
  const updateItem = useInboxStore((s) => s.update);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useInboxStore((s) => (id ? s.items.find((i) => i.id === id) : undefined));
  const isEditing = !!id;

  const [text, setText] = useState(existing?.text ?? '');
  const [confirm, setConfirm] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  function capture() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isEditing && id) {
      updateItem(id, trimmed);
      router.back();
      return;
    }
    addItem(trimmed);
    setText('');
    setConfirm(t.inbox.captured);
    inputRef.current?.focus();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{isEditing ? t.inbox.editTitle : t.inbox.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: theme.white, color: theme.text }]}
            value={text}
            onChangeText={setText}
            placeholder={t.inbox.placeholder}
            placeholderTextColor={theme.gray}
            multiline
            autoFocus
            returnKeyType="done"
            onSubmitEditing={capture}
          />
          <PressableScale
            style={[styles.captureBtn, { backgroundColor: theme.orange }, !text.trim() && styles.captureBtnDisabled]}
            onPress={capture}
            disabled={!text.trim()}
          >
            <Text style={styles.captureBtnText}>{isEditing ? t.inbox.saveButton : t.inbox.captureButton}</Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

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
  title: { fontSize: FontSize.lg, fontWeight: '600' },
  back: { fontSize: FontSize.md },
  content: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  input: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    textAlignVertical: 'top',
    ...Shadow.card,
  },
  captureBtn: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.4 },
  captureBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
});
