/**
 * AddItemSheet.tsx — shared bottom sheet for free-adding an item to Katalog or Ukeliste.
 *
 * Opened from the FAB on either the Katalog screen (creates a catalog item) or
 * the Ukeliste screen (creates a weekly working-list item, with an extra
 * "Legg også til i katalog" toggle so the user can optionally persist it as a
 * permanent catalog item too). Fields: Varenavn (required, with a live
 * catalog-search dropdown), Estimert pris (optional, auto-filled when a
 * suggestion is picked), Ønsket antall (stepper, default 1), and a "Midlertidig"
 * toggle (defaults to true on both screens — most free-adds are one-off needs).
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useCatalogStore, components/BottomSheet
 *   Used by → app/shopping.tsx
 *   Data    → none directly — creation flows out via onAdd; the parent calls useShoppingStore.add(). Reads useCatalogStore.suggest() (read-only) for the name-field autocomplete.
 *
 * Edit notes:
 *   - `origin` controls whether the "Legg også til i katalog" toggle renders at all
 *     (only meaningful when adding from the weekly/Ukeliste screen).
 *   - Resets all fields on close via the useEffect keyed on `visible`.
 *   - Now uses BottomSheet component which handles keyboard anchoring and drag-to-dismiss
 *     automatically (no KeyboardAvoidingView needed).
 *   - Suggestions come from useCatalogStore.suggest(name), which already does
 *     case-insensitive substring matching with startsWith-priority ordering — don't
 *     duplicate that logic here, just render its result. Dismissed once a suggestion
 *     is picked or the name is cleared.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AppColors, FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles, useAppTheme } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import { useCatalogStore } from '@/store/useCatalogStore';
import { BottomSheet } from '@/components/BottomSheet';

type Props = {
  visible: boolean;
  origin: 'catalog' | 'weekly';
  theme: AppColors;
  onClose: () => void;
  onAdd: (input: {
    name: string;
    price: number;
    targetQuantity: number;
    isTemporary: boolean;
    alsoAddToCatalog: boolean;
  }) => void;
};

export default function AddItemSheet({ visible, origin, theme, onClose, onAdd }: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const catalogSuggest = useCatalogStore((s) => s.suggest);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [targetQty, setTargetQty] = useState(1);
  const [temporary, setTemporary] = useState(origin !== 'catalog');
  const [alsoAddToCatalog, setAlsoAddToCatalog] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setPrice('');
      setTargetQty(1);
      setTemporary(origin !== 'catalog');
      setAlsoAddToCatalog(false);
      setSuggestionsDismissed(false);
    }
  }, [visible, origin]);

  const suggestions = useMemo(
    () => (suggestionsDismissed ? [] : catalogSuggest(name, 5)),
    [catalogSuggest, name, suggestionsDismissed]
  );

  function handlePickSuggestion(item: { name: string; price: number }) {
    setName(item.name);
    if (item.price > 0) setPrice(String(item.price));
    setSuggestionsDismissed(true);
  }

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      price: parseFloat(price.replace(',', '.')) || 0,
      targetQuantity: Math.max(1, targetQty),
      isTemporary: temporary,
      alsoAddToCatalog,
    });
  }

  return (
    <BottomSheet
      open={visible}
      onClose={onClose}
      title={t.addSheetTitle}
      theme={theme}
    >
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollView}>
        <Text style={[styles.label, { color: theme.textLight }]}>{t.varenavnLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
          value={name}
          onChangeText={(v) => { setName(v); setSuggestionsDismissed(false); }}
          placeholder={t.shoppingItemPlaceholder}
          placeholderTextColor={theme.gray}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        {suggestions.length > 0 && (
          <View style={[styles.suggestionsBox, { backgroundColor: theme.offWhite, borderColor: theme.grayLight }]}>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.suggestionsScroll}>
              {suggestions.map((s) => (
                <Pressable key={s.id} style={styles.suggestionRow} onPress={() => handlePickSuggestion(s)}>
                  <Text style={[styles.suggestionName, { color: theme.text }]} numberOfLines={1}>{s.name}</Text>
                  {s.price > 0 && (
                    <Text style={[styles.suggestionPrice, { color: theme.textLight }]}>{s.price.toFixed(0)} kr</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={[styles.label, { color: theme.textLight }]}>{t.estimertPrisLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.gray}
        />

        <Text style={[styles.label, { color: theme.textLight }]}>{t.onsketAntallLabel}</Text>
        <View style={styles.stepperRow}>
          <Pressable
            style={[styles.stepBtn, { backgroundColor: theme.grayLight }]}
            onPress={() => setTargetQty((q) => Math.max(1, q - 1))}
            hitSlop={6}
          >
            <Text style={[styles.stepText, { color: theme.text }]}>−</Text>
          </Pressable>
          <Text style={[styles.qtyText, { color: theme.text }]}>{targetQty}</Text>
          <Pressable
            style={[styles.stepBtn, { backgroundColor: theme.orange }]}
            onPress={() => setTargetQty((q) => q + 1)}
            hitSlop={6}
          >
            <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
          </Pressable>
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: theme.textLight, marginBottom: 0 }]}>{t.midlertidigToggleLabel}</Text>
          <Switch
            value={temporary}
            onValueChange={setTemporary}
            trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
            thumbColor={temporary ? theme.orange : theme.gray}
          />
        </View>

        {origin === 'weekly' && (
          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.textLight, marginBottom: 0 }]}>{t.addAlsoToCatalogToggle}</Text>
            <Switch
              value={alsoAddToCatalog}
              onValueChange={setAlsoAddToCatalog}
              trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
              thumbColor={alsoAddToCatalog ? theme.orange : theme.gray}
            />
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable style={styles.ghostBtn} onPress={onClose}>
            <Text style={[styles.ghostBtnText, { color: theme.textLight }]}>{t.cancelBtn}</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, { backgroundColor: theme.orange }]} onPress={handleAdd}>
            <Text style={styles.primaryBtnText}>{t.addItemBtn}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const baseStyles = StyleSheet.create({
  scrollView: { flex: 1 },
  label: { fontSize: FontSize.xs, fontFamily: Fonts.semibold, marginTop: Spacing.sm, marginBottom: 4 },
  input: { borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md },
  suggestionsBox: { borderRadius: Radius.sm, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  suggestionsScroll: { maxHeight: 160 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  suggestionName: { flex: 1, fontSize: FontSize.sm },
  suggestionPrice: { fontSize: FontSize.xs },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 34, height: 34, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: FontSize.lg, fontFamily: Fonts.bold, lineHeight: 22 },
  qtyText: { fontSize: FontSize.md, fontFamily: Fonts.bold, minWidth: 28, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  ghostBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  ghostBtnText: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  primaryBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  primaryBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.md },
});
