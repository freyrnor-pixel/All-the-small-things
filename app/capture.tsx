/**
 * capture.tsx — quick-capture inbox entry point (AP-02)
 *
 * Single-purpose modal: type a thought, tap Capture, it lands in the inbox
 * (store/useInboxStore.ts) instantly — no date, time, or category to decide on
 * up front. Stays open after each capture (input cleared + refocused) so
 * several thoughts can be jotted down in one sitting; closes only via Back.
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, components/PressableScale, components/ScreenBackground, constants/theme, lib/i18n, lib/useAppTheme, store/useInboxStore
 *   Used by → Expo Router route "/capture" (presented as a modal — see app/_layout.tsx), components/BubbleMenu.tsx (capture bubble)
 *   Data    → useInboxStore.add() inserts into inbox_items
 *
 * Edit notes:
 *   - All visible strings go through useT() (t.inbox.*).
 *   - Deliberately no task-form-style fields here (date/time/priority) — those
 *     decisions happen later when promoting an item via components/InboxSection.tsx.
 */
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useT } from '@/lib/i18n';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import PressableScale from '@/components/PressableScale';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import ScreenBackground from '@/components/ScreenBackground';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useInboxStore } from '@/store/useInboxStore';

export default function CaptureScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const addItem = useInboxStore((s) => s.add);

  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  function capture() {
    const trimmed = text.trim();
    if (!trimmed) return;
    addItem(trimmed);
    setText('');
    setConfirm(t.inbox.captured);
    inputRef.current?.focus();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.inbox.title}</Text>
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
            <Text style={styles.captureBtnText}>{t.inbox.captureButton}</Text>
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
