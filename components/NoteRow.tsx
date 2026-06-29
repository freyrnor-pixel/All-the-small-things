/**
 * NoteRow.tsx — one note Card on the Notes screen: header, shopping/plans quick-actions, body.
 *
 * Dumb presentational row (same divide as TaskItem/ShoppingRow/WeekListCard): app/notes.tsx
 * owns the Note data and every callback; this component only renders it and reports edits.
 * Header/body TextInputs are locally buffered and committed to the store onBlur (mirrors
 * WeekListCard's commitRename) instead of writing to SQLite on every keystroke.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, components/Surface, store/useNotesStore (Note type)
 *   Used by → app/notes.tsx
 *   Data    → none directly — header/body commits and the checkmark/shopping/plans/delete
 *             actions are all owned by the parent via props
 *
 * Edit notes:
 *   - headerInput/bodyInput seed from `note` once on mount; safe because the parent always
 *     keys this component by note.id, so a given instance only ever represents one note and
 *     never gets fed a different note's text through the same state.
 *   - Checkmark circle styling mirrors components/TaskItem.tsx's check (24px, theme.orange
 *     border, fills orange + white check when checked) for a consistent "done" affordance.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, FeatureColors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { useT } from '@/lib/i18n';
import Surface from '@/components/Surface';
import { Note } from '@/store/useNotesStore';

type Props = {
  note: Note;
  theme: AppColors;
  onToggleChecked: () => void;
  onHeaderCommit: (text: string) => void;
  onBodyCommit: (text: string) => void;
  onShoppingPress: () => void;
  onPlansPress: () => void;
  onDelete: () => void;
};

export default function NoteRow({
  note,
  theme,
  onToggleChecked,
  onHeaderCommit,
  onBodyCommit,
  onShoppingPress,
  onPlansPress,
  onDelete,
}: Props) {
  const t = useT();
  const [headerInput, setHeaderInput] = useState(note.header);
  const [bodyInput, setBodyInput] = useState(note.body);

  function commitHeader() {
    const trimmed = headerInput.trim();
    if (trimmed !== note.header) onHeaderCommit(trimmed);
  }

  function commitBody() {
    if (bodyInput !== note.body) onBodyCommit(bodyInput);
  }

  return (
    <Surface style={styles.card}>
      <View style={styles.topRow}>
        <Pressable
          style={[
            styles.check,
            { borderColor: theme.orange },
            note.checked && { backgroundColor: theme.orange },
          ]}
          onPress={onToggleChecked}
          hitSlop={8}
          accessibilityLabel={t.notes.checkedLabel}
        >
          {note.checked && <Ionicons name="checkmark" size={14} color={theme.white} />}
        </Pressable>
        <TextInput
          style={[styles.headerInput, { color: theme.text }]}
          value={headerInput}
          onChangeText={setHeaderInput}
          onBlur={commitHeader}
          placeholder={t.notes.headerPlaceholder}
          placeholderTextColor={theme.gray}
          returnKeyType="done"
        />
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel={t.notes.deleteNote}>
          <Ionicons name="trash-outline" size={16} color={theme.danger} />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: theme.grayLight }]}
          onPress={onShoppingPress}
        >
          <Ionicons name="cart-outline" size={15} color={FeatureColors.shop} />
          <Text style={[styles.actionText, { color: theme.text }]}>{t.notes.addToShoppingLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: theme.grayLight }]}
          onPress={onPlansPress}
        >
          <Ionicons name="checkbox-outline" size={15} color={FeatureColors.task} />
          <Text style={[styles.actionText, { color: theme.text }]}>{t.notes.addToPlansLabel}</Text>
        </Pressable>
      </View>

      <TextInput
        style={[styles.bodyInput, { color: theme.text, borderTopColor: theme.grayLight }]}
        value={bodyInput}
        onChangeText={setBodyInput}
        onBlur={commitBody}
        placeholder={t.notes.bodyPlaceholder}
        placeholderTextColor={theme.gray}
        multiline
        textAlignVertical="top"
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInput: { flex: 1, fontSize: FontSize.md, fontFamily: Fonts.semibold, paddingVertical: 2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
  },
  actionText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  bodyInput: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.regular,
    minHeight: 60,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
});
