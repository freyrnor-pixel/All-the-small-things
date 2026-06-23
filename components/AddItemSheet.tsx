/**
 * AddItemSheet.tsx — shared bottom sheet for free-adding an item to Katalog or Ukeliste.
 *
 * Opened from the FAB on either the Katalog screen (creates a catalog item) or
 * the Ukeliste screen (creates a weekly working-list item, with an extra
 * "Legg også til i katalog" toggle so the user can optionally persist it as a
 * permanent catalog item too). Fields: Varenavn (required), Estimert pris
 * (optional), Ønsket antall (stepper, default 1), and a "Midlertidig" toggle
 * (defaults to true on both screens — most free-adds are one-off needs).
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme
 *   Used by → app/shopping.tsx
 *   Data    → none directly — creation flows out via onAdd; the parent calls useShoppingStore.add()
 *
 * Edit notes:
 *   - `origin` controls whether the "Legg også til i katalog" toggle renders at all
 *     (only meaningful when adding from the weekly/Ukeliste screen).
 *   - Resets all fields on close via the useEffect keyed on `visible`.
 */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

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
  const { bottom: bottomInset } = useSafeAreaInsets();
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [targetQty, setTargetQty] = useState(1);
  const [temporary, setTemporary] = useState(true);
  const [alsoAddToCatalog, setAlsoAddToCatalog] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setPrice('');
      setTargetQty(1);
      setTemporary(true);
      setAlsoAddToCatalog(false);
    }
  }, [visible]);

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.white, paddingBottom: Math.max(Spacing.xl, bottomInset + Spacing.md) }]}>
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />
        <Text style={[styles.title, { color: theme.text }]}>{t.addSheetTitle}</Text>

        <Text style={[styles.label, { color: theme.textLight }]}>{t.varenavnLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
          value={name}
          onChangeText={setName}
          placeholder={t.shoppingItemPlaceholder}
          placeholderTextColor={theme.gray}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

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
      </View>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '85%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
    ...Shadow.fab,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  label: { fontSize: FontSize.xs, fontWeight: '600', marginTop: Spacing.sm, marginBottom: 4 },
  input: { borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 34, height: 34, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: FontSize.lg, fontWeight: '700', lineHeight: 22 },
  qtyText: { fontSize: FontSize.md, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  ghostBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  ghostBtnText: { fontSize: FontSize.md, fontWeight: '600' },
  primaryBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
