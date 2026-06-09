import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ShoppingItem } from '@/store/useShoppingStore';
import { AppColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const CATEGORY_ORDER = [
  'produce', 'dairy', 'meat', 'fish', 'bread', 'frozen',
  'canned', 'dry', 'snacks', 'drinks', 'cleaning', 'personal', 'other',
] as const;

interface Props {
  visible: boolean;
  monthlyItems: ShoppingItem[];
  categoryLabels: Record<string, string>;
  onConfirm: (selections: { id: string; qty: number }[]) => void;
  onClose: () => void;
  theme: AppColors;
  t: {
    monthlyPickerTitle: string;
    monthlyPickerConfirm: (n: number) => string;
    noMonthlyItems: string;
    monthlyRemaining: (n: number, unit: string) => string;
    monthlyInWeekly: (n: number) => string;
    cancel: string;
  };
}

export default function MonthlyPickerSheet({ visible, monthlyItems, categoryLabels, onConfirm, onClose, theme, t }: Props) {
  const [qtys, setQtys] = useState<{ [id: string]: number }>({});

  function adjust(id: string, delta: number, max: number) {
    setQtys((prev) => {
      const cur: number = prev[id] ?? 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      return { ...prev, [id]: next };
    });
  }

  function handleConfirm() {
    const selections: { id: string; qty: number }[] = Object.entries(qtys)
      .filter(([, qty]) => (qty as number) > 0)
      .map(([id, qty]) => ({ id, qty: qty as number }));
    onConfirm(selections);
    setQtys({});
  }

  function handleClose() {
    setQtys({});
    onClose();
  }

  const totalToAdd: number = (Object.values(qtys) as number[]).reduce((sum: number, q: number) => sum + q, 0);

  type Group = { cat: typeof CATEGORY_ORDER[number]; items: typeof monthlyItems };
  const grouped = useMemo((): Group[] =>
    CATEGORY_ORDER
      .map((cat) => ({ cat, items: monthlyItems.filter((i) => (i.category || 'other') === cat) }))
      .filter((g) => g.items.length > 0),
    [monthlyItems]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cream }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />

        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>{t.monthlyPickerTitle}</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={[styles.closeBtn, { color: theme.textLight }]}>✕</Text>
          </Pressable>
        </View>

        {monthlyItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noMonthlyItems}</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {grouped.map(({ cat, items }: Group) => (
              <View key={cat} style={styles.group}>
                <Text style={[styles.groupHeader, { color: theme.textLight }]}>
                  {categoryLabels[cat]}
                </Text>
                <View style={[styles.groupCard, { backgroundColor: theme.white }]}>
                  {items.map((item, idx) => {
                    const total = parseInt(item.amount, 10) || 1;
                    const remaining = Math.max(0, total - item.monthlyAllocated);
                    const qty = qtys[item.id] ?? 0;
                    const max = remaining;
                    const isLast = idx === items.length - 1;

                    return (
                      <View key={item.id}>
                        <View style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <View style={styles.itemMeta}>
                              <Text style={[styles.itemRemaining, { color: remaining > 0 ? theme.green : theme.gray }]}>
                                {t.monthlyRemaining(remaining, item.unit)}
                              </Text>
                              {item.monthlyAllocated > 0 && (
                                <Text style={[styles.itemAllocated, { color: theme.orange }]}>
                                  · {t.monthlyInWeekly(item.monthlyAllocated)}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.stepper}>
                            <Pressable
                              style={[styles.stepBtn, { backgroundColor: theme.grayLight }]}
                              onPress={() => adjust(item.id, -1, max)}
                              disabled={qty === 0}
                            >
                              <Text style={[styles.stepBtnText, { color: qty === 0 ? theme.gray : theme.text }]}>−</Text>
                            </Pressable>
                            <Text style={[styles.stepQty, { color: theme.text }]}>{qty}</Text>
                            <Pressable
                              style={[
                                styles.stepBtn,
                                { backgroundColor: qty < max ? theme.orange : theme.grayLight },
                              ]}
                              onPress={() => adjust(item.id, +1, max)}
                              disabled={qty >= max}
                            >
                              <Text style={[styles.stepBtnText, { color: qty < max ? '#fff' : theme.gray }]}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                        {!isLast && <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        )}

        {monthlyItems.length > 0 && (
          <Pressable
            style={[
              styles.confirmBtn,
              { backgroundColor: totalToAdd > 0 ? theme.green : theme.grayLight },
            ]}
            onPress={handleConfirm}
            disabled={totalToAdd === 0}
          >
            <Text style={[
              styles.confirmBtnText,
              { color: totalToAdd > 0 ? '#fff' : theme.gray },
            ]}>
              {totalToAdd > 0 ? t.monthlyPickerConfirm(totalToAdd) : t.monthlyPickerTitle}
            </Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    ...Shadow.fab,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  closeBtn: { fontSize: FontSize.lg },
  emptyWrap: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.md },
  list: { flex: 1 },
  group: { marginBottom: Spacing.md },
  groupHeader: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  groupCard: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    ...Shadow.card,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSize.md, fontWeight: '500' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  itemRemaining: { fontSize: FontSize.xs, fontWeight: '600' },
  itemAllocated: { fontSize: FontSize.xs, fontWeight: '600' },
  divider: { height: 1, marginLeft: 0 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: FontSize.lg, fontWeight: '700', lineHeight: 22 },
  stepQty: { fontSize: FontSize.md, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  confirmBtn: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  confirmBtnText: { fontSize: FontSize.md, fontWeight: '700' },
});
