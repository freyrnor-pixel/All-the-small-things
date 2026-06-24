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
 * in-sheet step listing current Katalog items: tapping one selects it (with a
 * qty stepper), and a sticky "Save" button commits every selection at once.
 *
 * The Katalog/Inventory screen does NOT use this chooser — it only has one
 * source (the product catalog), so its "+" opens AddItemSheet directly.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useShoppingStore (ShoppingItem type only)
 *   Used by → app/shopping.tsx
 *   Data    → none directly — catalogItems/callbacks are passed in by the parent
 *
 * Edit notes:
 *   - `catalogItems` should be the parent's `status === 'catalog'` list (same one
 *     the Katalog tab renders) — this component doesn't read the store itself.
 *   - Resets the inventory-picker step, filter text and selected `picks` on close
 *     via the useEffect keyed on `visible` (and also on navigating back to the
 *     "choose" step, so a stale selection can't survive a re-entry into the picker).
 *   - `onConfirmInventoryPicks` receives the whole batch in one call (`{id, quantity}[]`)
 *     rather than firing once per item — the parent does the actual store writes/toasts.
 *   - Wrapped in a KeyboardAvoidingView because RN's <Modal> renders outside the
 *     screen's own KeyboardAvoidingView subtree — without this, the keyboard covers
 *     the search input on short screens (same fix as AddItemSheet.tsx).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  onConfirmInventoryPicks: (picks: { id: string; quantity: number }[]) => void;
  onOpenAddSheet: () => void;
};

export default function AddSourceChooser({ visible, theme, catalogItems, onClose, onConfirmInventoryPicks, onOpenAddSheet }: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const [step, setStep] = useState<'choose' | 'inventory'>('choose');
  const [filter, setFilter] = useState('');
  const [picks, setPicks] = useState<Record<string, number>>({});

  useEffect(() => {
    if (visible) {
      setStep('choose');
      setFilter('');
      setPicks({});
    }
  }, [visible]);

  const filteredCatalogItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const sorted = [...catalogItems].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((i) => i.name.toLowerCase().includes(q));
  }, [catalogItems, filter]);

  const pickCount = Object.keys(picks).length;

  function handleBackToChoose() {
    setStep('choose');
    setPicks({});
  }

  function handleSelect(id: string) {
    setPicks((p) => ({ ...p, [id]: 1 }));
  }

  function handleIncrement(id: string) {
    setPicks((p) => ({ ...p, [id]: (p[id] ?? 1) + 1 }));
  }

  function handleDecrement(id: string) {
    setPicks((p) => {
      const next = (p[id] ?? 1) - 1;
      if (next <= 0) {
        const { [id]: _removed, ...rest } = p;
        return rest;
      }
      return { ...p, [id]: next };
    });
  }

  function handleSavePicks() {
    const list = Object.entries(picks).map(([id, quantity]) => ({ id, quantity }));
    if (list.length === 0) return;
    onConfirmInventoryPicks(list);
    setPicks({});
    onClose();
  }

  function handleOpenAddSheet() {
    onOpenAddSheet();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexFill}>
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
              <Pressable onPress={handleBackToChoose} hitSlop={8}>
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
                {filteredCatalogItems.map((item) => {
                  const qty = picks[item.id];
                  const isSelected = qty !== undefined;
                  return (
                    <View key={item.id} style={[styles.pickerRow, isSelected && { backgroundColor: theme.greenLight }]}>
                      <View style={styles.pickerNameWrap}>
                        <Text style={[styles.pickerName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                        {item.price > 0 && (
                          <Text style={[styles.pickerPrice, { color: theme.textLight }]}>{item.price.toFixed(0)} kr</Text>
                        )}
                      </View>
                      {isSelected ? (
                        <View style={styles.pickerStepperRow}>
                          <Pressable
                            style={[styles.pickerStepBtn, { backgroundColor: theme.grayLight }]}
                            onPress={() => handleDecrement(item.id)}
                            hitSlop={6}
                          >
                            <Text style={[styles.pickerStepText, { color: theme.text }]}>−</Text>
                          </Pressable>
                          <Text style={[styles.pickerQtyText, { color: theme.text }]}>{qty}</Text>
                          <Pressable
                            style={[styles.pickerStepBtn, { backgroundColor: theme.green }]}
                            onPress={() => handleIncrement(item.id)}
                            hitSlop={6}
                          >
                            <Text style={[styles.pickerStepText, { color: theme.white }]}>+</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={[styles.pickerAddBtn, { backgroundColor: theme.greenLight }]}
                          onPress={() => handleSelect(item.id)}
                          hitSlop={6}
                        >
                          <Ionicons name="add" size={16} color={theme.green} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {pickCount > 0 && (
              <Pressable style={[styles.pickerSaveBtn, { backgroundColor: theme.green }]} onPress={handleSavePicks}>
                <Text style={styles.pickerSaveBtnText}>{t.save}</Text>
                <Text style={styles.pickerSaveBtnCount}>({pickCount})</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  flexFill: { flex: 1 },
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
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, borderRadius: Radius.sm },
  pickerNameWrap: { flex: 1, minWidth: 0, marginRight: Spacing.sm },
  pickerName: { fontSize: FontSize.sm },
  pickerPrice: { fontSize: FontSize.xs },
  pickerAddBtn: { width: 28, height: 28, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  pickerStepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  pickerStepBtn: { width: 26, height: 26, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  pickerStepText: { fontSize: FontSize.md, fontWeight: '700' },
  pickerQtyText: { fontSize: FontSize.sm, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  pickerSaveBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  pickerSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  pickerSaveBtnCount: { color: '#fff', fontWeight: '600', fontSize: FontSize.sm },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg },
});
