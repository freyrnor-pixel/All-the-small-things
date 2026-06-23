/**
 * AddSourceChooser.tsx — "+" menu source picker for the Ukeliste (weekly) tab.
 *
 * The weekly list's "+" button can add an item from three sources: an existing
 * Katalog (inventory) item, the product catalog/price database (useCatalogStore,
 * via AddItemSheet's autocomplete), or a free-typed manual entry. This sheet
 * presents that choice; picking "Fra katalog" or "Skriv inn manuelt" both hand
 * off to AddItemSheet (which already searches the catalog live as you type, so
 * there's nothing left to differentiate downstream — the distinction here is
 * purely about user intent/framing). "Fra inventar" instead shows a second,
 * in-sheet step listing current Katalog items to flip straight into the weekly
 * list (bypassing the staging tray).
 *
 * The Katalog/Inventory screen does NOT use this chooser — it only has one
 * source (the product catalog), so its "+" opens AddItemSheet directly.
 *
 * TODO(06-theming-and-popups): restyle this as the shared popup/action-sheet
 * component once it lands — this is a plain in-app Modal placeholder per the
 * task brief's instruction to coordinate with the popup redesign rather than
 * block on it.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useShoppingStore (ShoppingItem type only)
 *   Used by → app/shopping.tsx
 *   Data    → none directly — catalogItems/callbacks are passed in by the parent
 *
 * Edit notes:
 *   - `catalogItems` should be the parent's `status === 'catalog'` list (same one
 *     the Katalog tab renders) — this component doesn't read the store itself.
 *   - Resets the inventory-picker step + filter text on close via the useEffect
 *     keyed on `visible`.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  visible: boolean;
  theme: AppColors;
  catalogItems: ShoppingItem[];
  onClose: () => void;
  onPickFromInventory: (id: string) => void;
  onOpenAddSheet: () => void;
};

export default function AddSourceChooser({ visible, theme, catalogItems, onClose, onPickFromInventory, onOpenAddSheet }: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const [step, setStep] = useState<'choose' | 'inventory'>('choose');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('choose');
      setFilter('');
    }
  }, [visible]);

  const filteredCatalogItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const sorted = [...catalogItems].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((i) => i.name.toLowerCase().includes(q));
  }, [catalogItems, filter]);

  function handlePick(id: string) {
    onPickFromInventory(id);
    onClose();
  }

  function handleOpenAddSheet() {
    onOpenAddSheet();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />

        {step === 'choose' ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>{t.addSourceChooserTitle}</Text>

            <Pressable style={styles.optionRow} onPress={() => setStep('inventory')}>
              <View style={[styles.optionIcon, { backgroundColor: theme.greenLight }]}>
                <Ionicons name="cube-outline" size={20} color={theme.green} />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>{t.addFromInventoryOption}</Text>
            </Pressable>

            <Pressable style={styles.optionRow} onPress={handleOpenAddSheet}>
              <View style={[styles.optionIcon, { backgroundColor: theme.orangeLight }]}>
                <Ionicons name="search-outline" size={20} color={theme.orange} />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>{t.addFromCatalogueOption}</Text>
            </Pressable>

            <Pressable style={styles.optionRow} onPress={handleOpenAddSheet}>
              <View style={[styles.optionIcon, { backgroundColor: theme.grayLight }]}>
                <Ionicons name="create-outline" size={20} color={theme.textLight} />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>{t.addFreeEntryOption}</Text>
            </Pressable>

            <Pressable style={styles.cancelRow} onPress={onClose}>
              <Text style={[styles.cancelText, { color: theme.textLight }]}>{t.cancelBtn}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.pickerHeader}>
              <Pressable onPress={() => setStep('choose')} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={theme.textLight} />
              </Pressable>
              <Text style={[styles.title, { color: theme.text, marginBottom: 0, flex: 1 }]}>{t.inventoryPickerTitle}</Text>
            </View>

            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={filter}
              onChangeText={setFilter}
              placeholder={t.inventoryPickerSearchPlaceholder}
              placeholderTextColor={theme.gray}
              autoFocus
            />

            {filteredCatalogItems.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.addSourceChooserInventoryEmpty}</Text>
            ) : (
              <ScrollView style={styles.pickerScroll} keyboardShouldPersistTaps="handled">
                {filteredCatalogItems.map((item) => (
                  <Pressable key={item.id} style={styles.pickerRow} onPress={() => handlePick(item.id)}>
                    <Text style={[styles.pickerName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                    {item.price > 0 && (
                      <Text style={[styles.pickerPrice, { color: theme.textLight }]}>{item.price.toFixed(0)} kr</Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </>
        )}
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
    gap: Spacing.xs,
    ...Shadow.fab,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  optionIcon: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: FontSize.md, fontWeight: '600' },
  cancelRow: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  cancelText: { fontSize: FontSize.md, fontWeight: '600' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchInput: { borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md, marginTop: Spacing.xs },
  pickerScroll: { marginTop: Spacing.xs },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  pickerName: { flex: 1, fontSize: FontSize.sm },
  pickerPrice: { fontSize: FontSize.xs },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg },
});
