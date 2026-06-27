/**
 * ListSwitcherHeader.tsx — current shopping list name + prev/next + settings/saved-lists entry points.
 *
 * Sits above the Ukeliste (weekly) tab's sections in app/shopping.tsx. Shows the
 * selected list's name (tap to rename inline), chevrons to step to the adjacent
 * list (sorted by startDate) among all non-template lists, a settings icon
 * (opens ListSettingsSheet — recurring toggle + interval), and a bookmark icon
 * (opens SavedListsModal — templates + "save as template").
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useShoppingListStore (ShoppingList type only)
 *   Used by → app/shopping.tsx
 *   Data    → none directly — list/selection state and callbacks are owned by the parent
 *
 * Edit notes:
 *   - Renaming commits on submit/blur via onRename(trimmed); empty/unchanged input is
 *     ignored (no-op) rather than clearing the name.
 *   - Prev/next step through ALL non-template lists sorted by startDate, not just
 *     some "active" window — lets the user browse history/future lists too.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingList } from '@/store/useShoppingListStore';
import { AppColors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  theme: AppColors;
  lists: ShoppingList[];
  selectedList: ShoppingList | undefined;
  onSelectList: (id: string) => void;
  onRename: (name: string) => void;
  onOpenSettings: () => void;
  onOpenSavedLists: () => void;
};

export default function ListSwitcherHeader({
  theme,
  lists,
  selectedList,
  onSelectList,
  onRename,
  onOpenSettings,
  onOpenSavedLists,
}: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(selectedList?.name ?? '');

  useEffect(() => {
    setEditing(false);
    setNameInput(selectedList?.name ?? '');
  }, [selectedList?.id, selectedList?.name]);

  if (!selectedList) return null;

  const sorted = [...lists].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const idx = sorted.findIndex((l) => l.id === selectedList.id);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < sorted.length - 1;

  function commitRename() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== selectedList!.name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <View style={[styles.row, { backgroundColor: theme.white }]}>
      <Pressable
        onPress={() => canPrev && onSelectList(sorted[idx - 1].id)}
        disabled={!canPrev}
        hitSlop={8}
        accessibilityLabel={t.listSwitcherPrevList}
      >
        <Ionicons name="chevron-back" size={20} color={canPrev ? theme.text : theme.grayLight} />
      </Pressable>

      <View style={styles.nameWrap}>
        {editing ? (
          <TextInput
            style={[styles.nameInput, { color: theme.text, borderColor: theme.grayLight }]}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder={t.listRenamePlaceholder}
            placeholderTextColor={theme.gray}
            autoFocus
            onSubmitEditing={commitRename}
            onBlur={commitRename}
            returnKeyType="done"
          />
        ) : (
          <Pressable onPress={() => setEditing(true)} style={styles.nameTapTarget}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{selectedList.name}</Text>
            {selectedList.isRecurring && (
              <Ionicons name="repeat" size={14} color={theme.green} style={styles.repeatIcon} />
            )}
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => canNext && onSelectList(sorted[idx + 1].id)}
        disabled={!canNext}
        hitSlop={8}
        accessibilityLabel={t.listSwitcherNextList}
      >
        <Ionicons name="chevron-forward" size={20} color={canNext ? theme.text : theme.grayLight} />
      </Pressable>

      <Pressable onPress={onOpenSettings} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name="options-outline" size={20} color={theme.textLight} />
      </Pressable>

      <Pressable onPress={onOpenSavedLists} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name="bookmark-outline" size={20} color={theme.textLight} />
      </Pressable>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    ...Shadow.card,
  },
  nameWrap: { flex: 1, minWidth: 0 },
  nameTapTarget: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, justifyContent: 'center' },
  name: { fontSize: FontSize.md, fontFamily: Fonts.bold, textAlign: 'center' },
  repeatIcon: { marginLeft: 2 },
  nameInput: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  iconBtn: { padding: 4 },
});
