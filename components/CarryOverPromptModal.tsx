/**
 * CarryOverPromptModal.tsx — payday-boundary carry-over prompt for temporary monthly items.
 *
 * Bottom-sheet shown when the monthly list resets (manually or automatically on
 * payday) and some "temporary" items (added via Update inventory) were never
 * purchased. Lets the user decide, per item or in bulk, whether to carry each
 * one into next month or drop it.
 *
 * Connections:
 *   Imports → constants/theme, store/useShoppingStore
 *   Used by → app/shopping.tsx
 *   Data    → consumes ShoppingItem; the carry/drop decision flows out via onConfirm — no direct store writes here
 *
 * Edit notes:
 *   - Defaults every candidate to "carry" — dropping is a hard delete, so never default to drop.
 *   - Localized strings arrive via the `t` prop; theme via `theme`. No useT() call here.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

interface Props {
  visible: boolean;
  candidates: ShoppingItem[];
  onConfirm: (carryIds: string[], dropIds: string[]) => void;
  theme: AppColors;
  t: {
    carryOverPromptTitle: string;
    carryOverPromptBody: string;
    carryOverItemCarry: string;
    carryOverItemDrop: string;
    carryOverAllCarry: string;
    carryOverAllDrop: string;
    carryOverConfirmBtn: string;
  };
}

export default function CarryOverPromptModal({ visible, candidates, onConfirm, theme, t }: Props) {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const styles = useScaledStyles(baseStyles);
  const [decisions, setDecisions] = useState<Record<string, 'carry' | 'drop'>>({});

  function decisionFor(id: string): 'carry' | 'drop' {
    return decisions[id] ?? 'carry';
  }

  function setAll(value: 'carry' | 'drop') {
    setDecisions(Object.fromEntries(candidates.map((c) => [c.id, value])));
  }

  function handleConfirm() {
    const carryIds = candidates.filter((c) => decisionFor(c.id) === 'carry').map((c) => c.id);
    const dropIds = candidates.filter((c) => decisionFor(c.id) === 'drop').map((c) => c.id);
    onConfirm(carryIds, dropIds);
    setDecisions({});
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop} />
      <View style={[styles.sheet, { backgroundColor: theme.cream, paddingBottom: Math.max(Spacing.xl, bottomInset + Spacing.md) }]}>
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />
        <Text style={[styles.title, { color: theme.text }]}>{t.carryOverPromptTitle}</Text>
        <Text style={[styles.body, { color: theme.textLight }]}>{t.carryOverPromptBody}</Text>

        <View style={styles.bulkRow}>
          <Pressable style={[styles.bulkBtn, { backgroundColor: theme.greenLight }]} onPress={() => setAll('carry')}>
            <Text style={[styles.bulkBtnText, { color: theme.green }]}>{t.carryOverAllCarry}</Text>
          </Pressable>
          <Pressable style={[styles.bulkBtn, { backgroundColor: theme.dangerLight }]} onPress={() => setAll('drop')}>
            <Text style={[styles.bulkBtnText, { color: theme.danger }]}>{t.carryOverAllDrop}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {candidates.map((item, idx) => {
            const decision = decisionFor(item.id);
            return (
              <View key={item.id}>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.choiceRow}>
                    <Pressable
                      style={[styles.choiceBtn, { backgroundColor: decision === 'carry' ? theme.green : theme.grayLight }]}
                      onPress={() => setDecisions((d) => ({ ...d, [item.id]: 'carry' }))}
                    >
                      <Text style={[styles.choiceText, { color: decision === 'carry' ? '#fff' : theme.text }]}>
                        {t.carryOverItemCarry}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.choiceBtn, { backgroundColor: decision === 'drop' ? theme.danger : theme.grayLight }]}
                      onPress={() => setDecisions((d) => ({ ...d, [item.id]: 'drop' }))}
                    >
                      <Text style={[styles.choiceText, { color: decision === 'drop' ? '#fff' : theme.text }]}>
                        {t.carryOverItemDrop}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {idx < candidates.length - 1 && <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />}
              </View>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>

        <Pressable style={[styles.confirmBtn, { backgroundColor: theme.orange }]} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>{t.carryOverConfirmBtn}</Text>
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
    maxHeight: '80%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    ...Shadow.fab,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '700' },
  body: { fontSize: FontSize.sm, marginTop: 2, marginBottom: Spacing.sm },
  bulkRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  bulkBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  bulkBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  list: { flex: 1 },
  itemRow: { paddingVertical: Spacing.sm, gap: Spacing.xs },
  itemName: { fontSize: FontSize.md, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', gap: Spacing.sm },
  choiceBtn: { flex: 1, borderRadius: Radius.sm, paddingVertical: Spacing.xs, alignItems: 'center' },
  choiceText: { fontSize: FontSize.xs, fontWeight: '700' },
  divider: { height: 1 },
  confirmBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
