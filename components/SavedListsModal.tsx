/**
 * SavedListsModal.tsx — saved/template shopping lists popup.
 *
 * Opened from ListSwitcherHeader's bookmark icon (Ukeliste tab). Lists every
 * isTemplate=true shopping_lists row; tapping one instantiates it as a fresh
 * live list for the current week (useShoppingListStore.instantiateTemplate).
 * A bottom row lets the user save the list currently being viewed as a new
 * template (useShoppingListStore.saveAsTemplate).
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useShoppingListStore (ShoppingList type only)
 *   Used by → app/shopping.tsx
 *   Data    → none directly — `templates` and both callbacks are owned by the parent
 *
 * Edit notes:
 *   - Structurally copies AddSourceChooser.tsx's single-step bottom sheet (backdrop +
 *     slide-up sheet with a handle) — no second "step" here, just one scrollable list.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingList } from '@/store/useShoppingListStore';
import { AppColors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  visible: boolean;
  theme: AppColors;
  templates: ShoppingList[];
  onClose: () => void;
  onSelectTemplate: (id: string) => void;
  onSaveCurrentAsTemplate: () => void;
};

export default function SavedListsModal({ visible, theme, templates, onClose, onSelectTemplate, onSaveCurrentAsTemplate }: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();

  function handleSelect(id: string) {
    onSelectTemplate(id);
    onClose();
  }

  function handleSaveCurrent() {
    onSaveCurrentAsTemplate();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />
        <Text style={[styles.title, { color: theme.text }]}>{t.savedListsTitle}</Text>

        {templates.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.savedListsEmpty}</Text>
        ) : (
          <ScrollView style={styles.scroll}>
            {templates.map((template) => (
              <Pressable key={template.id} style={styles.row} onPress={() => handleSelect(template.id)}>
                <View style={[styles.rowIcon, { backgroundColor: theme.greenLight }]}>
                  <Ionicons name="bookmark" size={16} color={theme.green} />
                </View>
                <Text style={[styles.rowText, { color: theme.text }]} numberOfLines={1}>{template.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Pressable style={[styles.saveBtn, { backgroundColor: theme.orange }]} onPress={handleSaveCurrent}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{t.saveListAsTemplateBtn}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '70%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    ...Shadow.fab,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, marginBottom: Spacing.xs },
  title: { fontSize: FontSize.lg, fontFamily: Fonts.bold },
  scroll: { maxHeight: 320 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  rowIcon: { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: FontSize.md, fontFamily: Fonts.semibold },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radius.md, paddingVertical: Spacing.md, minHeight: 44 },
  saveBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.md },
});
