/**
 * UpdateSheet.tsx — bottom sheet for editing a single Katalog item.
 *
 * Opens when a Katalog row body (not its checkbox) is tapped. Edits name,
 * estimated price, target quantity (the "Ønsket antall ved reset" stepper —
 * the ONLY place targetQuantity is mutated, replacing the old inline +/-
 * steppers on the main row), and the isTemporary toggle. "Slett fra katalog"
 * uses an inline two-step confirm (no native Alert) since this is a sheet.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme
 *   Used by → app/shopping.tsx
 *   Data    → none directly — all mutations flow out via onSave/onDelete callbacks; the parent calls useShoppingStore.update()/removeWithSource()
 *
 * Edit notes:
 *   - visible/item are controlled by the parent; internal field state resets via the useEffect keyed on item.id whenever a different item opens.
 *   - deleteArmed is local state for the inline "Er du sikker?" confirm step — resets whenever the sheet closes or a different item opens.
 *   - Wrapped in a KeyboardAvoidingView because RN's <Modal> renders outside the
 *     screen's own KeyboardAvoidingView subtree — without this, the keyboard covers
 *     the name input on short screens.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  visible: boolean;
  item: ShoppingItem | null;
  theme: AppColors;
  onClose: () => void;
  onSave: (patch: { name: string; price: number; targetQuantity: number; isTemporary: boolean }) => void;
  onDelete: () => void;
};

export default function UpdateSheet({ visible, item, theme, onClose, onSave, onDelete }: Props) {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [targetQty, setTargetQty] = useState(1);
  const [temporary, setTemporary] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price > 0 ? String(item.price) : '0');
      setTargetQty(item.targetQuantity || 1);
      setTemporary(item.isTemporary);
      setDeleteArmed(false);
    }
  }, [item?.id]);

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      price: parseFloat(price.replace(',', '.')) || 0,
      targetQuantity: Math.max(1, targetQty),
      isTemporary: temporary,
    });
  }

  function handleDeletePress() {
    if (deleteArmed) {
      onDelete();
    } else {
      setDeleteArmed(true);
    }
  }

  if (!item || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexFill}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.white, paddingBottom: Math.max(Spacing.xl, bottomInset + Spacing.md) }]}>
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />
        <Text style={[styles.title, { color: theme.text }]}>{t.updateSheetTitle}</Text>

        <Text style={[styles.label, { color: theme.textLight }]}>{t.varenavnLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: theme.textLight }]}>{t.estimertPrisLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
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

        <View style={styles.actionsRow}>
          <Pressable style={styles.ghostBtn} onPress={onClose}>
            <Text style={[styles.ghostBtnText, { color: theme.textLight }]}>{t.cancelBtn}</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, { backgroundColor: theme.orange }]} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>{t.saveBtn}</Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.deleteBtn,
            { backgroundColor: deleteArmed ? theme.danger : theme.dangerLight },
          ]}
          onPress={handleDeletePress}
        >
          <Text style={[styles.deleteBtnText, { color: deleteArmed ? '#fff' : theme.danger }]}>
            {deleteArmed ? t.deleteConfirmText : t.deleteFromCatalogBtn}
          </Text>
        </Pressable>
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
    maxHeight: '85%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
    ...Shadow.fab,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, fontFamily: Fonts.bold, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.xs, fontFamily: Fonts.semibold, marginTop: Spacing.sm, marginBottom: 4 },
  input: { borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 34, height: 34, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: FontSize.lg, fontFamily: Fonts.bold, lineHeight: 22 },
  qtyText: { fontSize: FontSize.md, fontFamily: Fonts.bold, minWidth: 28, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  ghostBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  ghostBtnText: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  primaryBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  primaryBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.md },
  deleteBtn: { marginTop: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  deleteBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.md },
});
