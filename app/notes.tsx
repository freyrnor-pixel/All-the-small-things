/**
 * notes.tsx — Notes site ("Notater"): free-form notes with shopping/plans quick-actions.
 *
 * Two stacked sections split by a theme-coloured divider: active (unchecked) notes above,
 * checked-off notes below — the split is just `notes.filter(checked)` since useNotesStore's
 * load() already orders by `checked, sort_order`. Each note renders as a NoteRow (header +
 * checkmark + delete, shopping/plans quick-action buttons, body textarea). The shopping
 * button opens ShoppingQuickAddSheet in place (no navigation away from this screen); the
 * plans button pushes /task-form with the note's header prefilled as the new task's title.
 *
 * Connections:
 *   Imports → components/AddFAB, components/BottomNav, components/HintCard, components/NoteRow,
 *             components/ScreenBackground, components/ScreenHeader, components/ShoppingQuickAddSheet,
 *             components/SiteSwipeView, constants/theme, lib/i18n, lib/useAppTheme, store/useNotesStore
 *   Used by → Expo Router route "/notes", reached via a header icon on app/index.tsx (no
 *             BottomNav tab — see lib/siteNav.ts)
 *   Data    → reads/writes useNotesStore (notes table) directly — no draft buffer, since a
 *             note has no "locked, read-only" resting state to fall back to (unlike plans.tsx)
 *
 * Edit notes:
 *   - shoppingSheetVisible is a screen-level bool, not per-row — only one sheet can be open
 *     at a time, and it doesn't need to know which note opened it (it just adds a plain
 *     shopping-list item, same as app/shopping.tsx's own "+").
 *   - The divider line uses theme.orange (the theme's primary accent across every palette,
 *     light/dark/custom) so it reads as "the active colour theme", not a fixed hue.
 *   - Only rendered when both sections are non-empty — an all-active or all-checked list has
 *     nothing to visually separate.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotesStore } from '@/store/useNotesStore';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import HintCard from '@/components/HintCard';
import NoteRow from '@/components/NoteRow';
import AddFAB from '@/components/AddFAB';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import ShoppingQuickAddSheet from '@/components/ShoppingQuickAddSheet';
import { useT } from '@/lib/i18n';
import { FontSize, Fonts, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

export default function NotesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const t = useT();

  const notes = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.add);
  const updateNote = useNotesStore((s) => s.update);
  const toggleChecked = useNotesStore((s) => s.toggleChecked);
  const removeNote = useNotesStore((s) => s.remove);

  const [shoppingSheetVisible, setShoppingSheetVisible] = useState(false);

  const activeNotes = notes.filter((n) => !n.checked);
  const checkedNotes = notes.filter((n) => n.checked);

  function openTaskForm(title: string) {
    router.push({ pathname: '/task-form', params: { title } });
  }

  function renderRow(note: (typeof notes)[number]) {
    return (
      <NoteRow
        key={note.id}
        note={note}
        theme={theme}
        onToggleChecked={() => toggleChecked(note.id)}
        onHeaderCommit={(text) => updateNote(note.id, { header: text })}
        onBodyCommit={(text) => updateNote(note.id, { body: text })}
        onShoppingPress={() => setShoppingSheetVisible(true)}
        onPlansPress={() => openTaskForm(note.header)}
        onDelete={() => removeNote(note.id)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ScreenHeader title={t.notes.title} onBack={() => router.back()} />

      <SiteSwipeView>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <HintCard text={t.hints.notes.text} example={t.hints.notes.example} />

          {notes.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.notes.emptyState}</Text>
          ) : (
            <>
              {activeNotes.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.notes.activeLabel}</Text>
                  {activeNotes.map(renderRow)}
                </View>
              )}

              {activeNotes.length > 0 && checkedNotes.length > 0 && (
                <View style={[styles.divider, { backgroundColor: theme.orange }]} />
              )}

              {checkedNotes.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.notes.checkedLabel}</Text>
                  {checkedNotes.map(renderRow)}
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SiteSwipeView>

      <AddFAB onPress={() => addNote()} />
      <ShoppingQuickAddSheet visible={shoppingSheetVisible} onClose={() => setShoppingSheetVisible(false)} />
      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 2, borderRadius: 999, marginVertical: Spacing.md },
  emptyText: { fontSize: FontSize.sm, fontFamily: Fonts.regular, textAlign: 'center', marginTop: Spacing.xl },
});
