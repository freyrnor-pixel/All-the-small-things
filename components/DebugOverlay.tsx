/**
 * DebugOverlay.tsx — floating debug button + annotate-mode feedback pins + bubble-wheel tuning panel
 *
 * Mounted once in app/_layout.tsx, gated on settings.loaded && settings.debugModeEnabled.
 * Renders a small floating bug-icon button (top-right, offset down past the home
 * screen's header row so it doesn't sit on top of the settings gear, and clear of
 * the FAB's bottom corner) that opens a Modal panel with two tabs:
 *   - "Comments": an Annotate-mode switch (closes the panel so taps reach the
 *     screen below), a list of this screen's notes (tap to edit/delete), and an
 *     "Export all" action.
 *   - "Bubble Wheel": 4 stepper/numeric controls tuning components/BubbleMenu.tsx,
 *     writing straight through settings.update() (no separate save step) plus a
 *     "Reset to defaults" action.
 * While annotate mode is on, a full-screen transparent layer turns any tap into a
 * normalized (0..1) x/y pin + small note composer. Pins for the current screen are
 * always visible while debug mode is on (not just during annotate mode).
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, constants/theme, lib/haptics, lib/i18n,
 *             lib/useAppTheme, store/useFeedbackStore, store/useSettingsStore
 *   Used by → app/_layout.tsx
 *   Data    → reads/writes feedback_notes via useFeedbackStore; reads/writes the 4
 *             bubble-wheel settings via useSettingsStore
 *
 * Edit notes:
 *   - Tapping the bug button while annotate mode is active turns annotate mode OFF
 *     (instead of opening the panel) — that's the documented "leave annotate mode"
 *     affordance, so a stray tap on the button never leaves the user stuck unable
 *     to use the screen underneath.
 *   - The 4 RANGES below must stay in sync with the clamps in components/BubbleMenu.tsx
 *     (bubbleSize 30-70, bubbleSpacing 60-110) — that component re-clamps defensively
 *     too, but keep both in sync so this UI never suggests a value the wheel would
 *     silently override.
 *   - Export groups ALL screens' notes (not just the current one) plus the 4 live
 *     bubble-wheel values into one text block, then hands off to React Native's
 *     built-in Share.share() — no new native dependency, stays OTA-safe.
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { Modal } from 'react-native';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import { tap, selection } from '@/lib/haptics';
import { useSettingsStore, Settings } from '@/store/useSettingsStore';
import { useFeedbackStore, FeedbackNote } from '@/store/useFeedbackStore';
import ConfirmationBanner from '@/components/ConfirmationBanner';

type Tab = 'comments' | 'bubbleWheel';
type BubbleKey = 'bubbleSize' | 'bubbleSpacing' | 'bubbleSpringIntensity' | 'bubbleAnimSpeed';
type Composer = { x: number; y: number; editId: string | null; text: string };

const RANGES: Record<BubbleKey, { min: number; max: number; step: number; default: number }> = {
  bubbleSize: { min: 30, max: 70, step: 2, default: 50 },
  bubbleSpacing: { min: 60, max: 110, step: 2, default: 78 },
  bubbleSpringIntensity: { min: 0, max: 100, step: 5, default: 50 },
  bubbleAnimSpeed: { min: 0, max: 100, step: 5, default: 50 },
};
const BUBBLE_KEYS = Object.keys(RANGES) as BubbleKey[];

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export default function DebugOverlay() {
  const theme = useAppTheme();
  const t = useT();
  const styles = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();

  const settings = useSettingsStore();
  const notes = useFeedbackStore((s) => s.notes);
  const addNote = useFeedbackStore((s) => s.add);
  const updateNote = useFeedbackStore((s) => s.update);
  const removeNote = useFeedbackStore((s) => s.remove);

  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('comments');
  const [annotateMode, setAnnotateMode] = useState(false);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const screenNotes = notes.filter((n) => n.screen === pathname);

  function handleFabPress() {
    if (annotateMode) {
      selection();
      setAnnotateMode(false);
      return;
    }
    tap();
    setPanelOpen(true);
  }

  function toggleAnnotateMode(v: boolean) {
    selection();
    setAnnotateMode(v);
    if (v) setPanelOpen(false);
  }

  function handleScreenTap(evt: GestureResponderEvent) {
    const { locationX, locationY } = evt.nativeEvent;
    setComposer({ x: clamp(locationX / width, 0, 1), y: clamp(locationY / height, 0, 1), editId: null, text: '' });
  }

  function openExistingNote(note: FeedbackNote) {
    setComposer({ x: note.x, y: note.y, editId: note.id, text: note.note });
  }

  function saveComposer() {
    if (!composer) return;
    const text = composer.text.trim();
    if (!text) { setComposer(null); return; }
    if (composer.editId) {
      updateNote(composer.editId, text);
    } else {
      addNote(pathname, composer.x, composer.y, text);
    }
    setComposer(null);
  }

  function deleteComposerNote() {
    if (composer?.editId) removeNote(composer.editId);
    setComposer(null);
  }

  function updateBubbleSetting(key: BubbleKey, value: number) {
    const { min, max } = RANGES[key];
    const next = clamp(Math.round(value), min, max);
    settings.update({ [key]: next } as Partial<Settings>);
    setConfirm(t.taskSavedSimple);
  }

  function resetBubbleDefaults() {
    selection();
    settings.update({
      bubbleSize: RANGES.bubbleSize.default,
      bubbleSpacing: RANGES.bubbleSpacing.default,
      bubbleSpringIntensity: RANGES.bubbleSpringIntensity.default,
      bubbleAnimSpeed: RANGES.bubbleAnimSpeed.default,
    });
    setConfirm(t.taskSavedSimple);
  }

  function buildExportText(): string {
    const date = new Date().toISOString().slice(0, 10);
    const byScreen = new Map<string, FeedbackNote[]>();
    for (const n of notes) {
      const list = byScreen.get(n.screen) ?? [];
      list.push(n);
      byScreen.set(n.screen, list);
    }
    const lines: string[] = [t.debug.exportHeading(date), ''];
    for (const [screen, screenNs] of byScreen) {
      lines.push(screen);
      for (const n of screenNs) {
        lines.push(`• (${Math.round(n.x * 100)}%, ${Math.round(n.y * 100)}%) "${n.note}"`);
      }
      lines.push('');
    }
    lines.push(
      t.debug.exportBubbleLine(settings.bubbleSize, settings.bubbleSpacing, settings.bubbleSpringIntensity, settings.bubbleAnimSpeed)
    );
    return lines.join('\n');
  }

  async function exportNotes() {
    if (notes.length === 0) {
      setConfirm(t.debug.exportEmpty);
      return;
    }
    try {
      await Share.share({ message: buildExportText() });
    } catch {
      // user cancelled or the share sheet failed — nothing to recover, no-op
    }
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {annotateMode && <Pressable style={StyleSheet.absoluteFill} onPress={handleScreenTap} />}

      {screenNotes.map((note, i) => (
        <Pressable
          key={note.id}
          style={[styles.pin, { left: note.x * width - 12, top: note.y * height - 12, backgroundColor: theme.orange }]}
          onPress={() => openExistingNote(note)}
        >
          <Text style={styles.pinText}>{i + 1}</Text>
        </Pressable>
      ))}

      <Pressable
        style={[
          styles.fab,
          { top: insets.top + 60, borderColor: theme.border },
          { backgroundColor: annotateMode ? theme.orange : theme.white },
        ]}
        onPress={handleFabPress}
      >
        <Ionicons name="bug-outline" size={20} color={annotateMode ? '#fff' : theme.orange} />
      </Pressable>

      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={() => setPanelOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPanelOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.white, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />

          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, tab === 'comments' && { borderBottomColor: theme.orange, borderBottomWidth: 2 }]}
              onPress={() => setTab('comments')}
            >
              <Text style={[styles.tabText, { color: tab === 'comments' ? theme.orange : theme.textLight }]}>
                {t.debug.tabComments}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === 'bubbleWheel' && { borderBottomColor: theme.orange, borderBottomWidth: 2 }]}
              onPress={() => setTab('bubbleWheel')}
            >
              <Text style={[styles.tabText, { color: tab === 'bubbleWheel' ? theme.orange : theme.textLight }]}>
                {t.debug.tabBubbleWheel}
              </Text>
            </Pressable>
          </View>

          {tab === 'comments' ? (
            <ScrollView style={styles.tabContent}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, marginRight: Spacing.md }}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{t.debug.annotateMode}</Text>
                  <Text style={[styles.rowHint, { color: theme.textLight }]}>{t.debug.annotateModeHint}</Text>
                </View>
                <Switch
                  value={annotateMode}
                  onValueChange={toggleAnnotateMode}
                  trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                  thumbColor={annotateMode ? theme.orange : theme.gray}
                />
              </View>

              {screenNotes.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.debug.noNotesOnScreen}</Text>
              ) : (
                screenNotes.map((note, i) => (
                  <Pressable key={note.id} style={[styles.noteRow, { borderColor: theme.border }]} onPress={() => openExistingNote(note)}>
                    <View style={[styles.noteIndex, { backgroundColor: theme.orange }]}>
                      <Text style={styles.noteIndexText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.noteText, { color: theme.text }]} numberOfLines={2}>
                      {note.note}
                    </Text>
                  </Pressable>
                ))
              )}

              <Pressable style={[styles.exportBtn, { backgroundColor: theme.orange }]} onPress={exportNotes}>
                <Text style={styles.exportBtnText}>{t.debug.exportAll}</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView style={styles.tabContent}>
              {BUBBLE_KEYS.map((key) => (
                <View key={key} style={styles.stepperRow}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{t.debug[key]}</Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: theme.grayLight }]}
                      onPress={() => updateBubbleSetting(key, settings[key] - RANGES[key].step)}
                    >
                      <Text style={[styles.stepBtnText, { color: theme.text }]}>−</Text>
                    </Pressable>
                    <TextInput
                      style={[styles.stepperInput, { color: theme.text, borderColor: theme.border }]}
                      keyboardType="number-pad"
                      value={String(Math.round(settings[key]))}
                      onChangeText={(txt) => {
                        const n = parseInt(txt, 10);
                        if (Number.isFinite(n)) updateBubbleSetting(key, n);
                      }}
                    />
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: theme.grayLight }]}
                      onPress={() => updateBubbleSetting(key, settings[key] + RANGES[key].step)}
                    >
                      <Text style={[styles.stepBtnText, { color: theme.text }]}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable style={[styles.resetBtn, { borderColor: theme.danger }]} onPress={resetBubbleDefaults}>
                <Text style={[styles.resetBtnText, { color: theme.danger }]}>{t.debug.resetDefaults}</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={!!composer} transparent animationType="fade" onRequestClose={() => setComposer(null)}>
        <Pressable style={styles.backdrop} onPress={() => setComposer(null)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.composerWrap}>
          <View style={[styles.composerSheet, { backgroundColor: theme.white }]}>
            <Text style={[styles.composerTitle, { color: theme.text }]}>{t.debug.composerTitle}</Text>
            <TextInput
              style={[styles.composerInput, { color: theme.text, borderColor: theme.border }]}
              placeholder={t.debug.composerPlaceholder}
              placeholderTextColor={theme.gray}
              value={composer?.text ?? ''}
              onChangeText={(txt) => setComposer((c) => (c ? { ...c, text: txt } : c))}
              multiline
              autoFocus
            />
            <View style={styles.composerActions}>
              {composer?.editId && (
                <Pressable style={styles.composerBtn} onPress={deleteComposerNote}>
                  <Text style={[styles.composerBtnText, { color: theme.danger }]}>{t.debug.composerDelete}</Text>
                </Pressable>
              )}
              <Pressable style={styles.composerBtn} onPress={() => setComposer(null)}>
                <Text style={[styles.composerBtnText, { color: theme.textLight }]}>{t.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.composerBtn, { backgroundColor: theme.orange }]} onPress={saveComposer}>
                <Text style={[styles.composerBtnText, { color: '#fff' }]}>{t.save}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  pin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  pinText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    maxHeight: '75%',
    ...Shadow.fab,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  tabRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  tabText: { fontSize: FontSize.md, fontWeight: '700' },
  tabContent: { maxHeight: 420 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  rowLabel: { fontSize: FontSize.md, fontWeight: '600' },
  rowHint: { fontSize: FontSize.sm, marginTop: 2 },
  emptyText: { fontSize: FontSize.sm, paddingVertical: Spacing.md, textAlign: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  noteIndex: { width: 22, height: 22, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  noteIndexText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  noteText: { flex: 1, fontSize: FontSize.sm },
  exportBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  stepperRow: { paddingVertical: Spacing.sm },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  stepBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: FontSize.lg, fontWeight: '700' },
  stepperInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  resetBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  resetBtnText: { fontWeight: '700', fontSize: FontSize.md },
  composerWrap: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  composerSheet: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, ...Shadow.fab },
  composerTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  composerInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  composerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },
  composerBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.sm },
  composerBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
