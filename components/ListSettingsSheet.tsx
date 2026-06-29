/**
 * ListSettingsSheet.tsx — per-list recurring toggle + interval picker.
 *
 * Opened from WeekListCard's settings icon (Ukeliste tab). Lets the user
 * turn "repeat this list" on/off and, when on, pick the cadence (1-4 weeks) —
 * mirrors app/settings.tsx's weeklyResetDay chip-row look. Changes apply
 * immediately via onSetRecurring (useShoppingListStore.setRecurring), no
 * separate save step — same immediate-apply pattern as every other Switch in
 * app/settings.tsx.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme, store/useShoppingListStore (ShoppingList type only)
 *   Used by → app/shopping.tsx
 *   Data    → none directly — `list` and `onSetRecurring` are owned by the parent
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ShoppingList } from '@/store/useShoppingListStore';
import { AppColors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

const INTERVAL_OPTIONS = [1, 2, 3, 4];

type Props = {
  visible: boolean;
  theme: AppColors;
  list: ShoppingList | undefined;
  onClose: () => void;
  onSetRecurring: (isRecurring: boolean, intervalWeeks?: number) => void;
};

export default function ListSettingsSheet({ visible, theme, list, onClose, onSetRecurring }: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();

  if (!list) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <View style={[styles.handle, { backgroundColor: theme.grayLight }]} />
        <Text style={[styles.title, { color: theme.text }]}>{t.listSettingsTitle}</Text>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: theme.text }]}>{t.listRecurringToggleLabel}</Text>
          <Switch
            value={list.isRecurring}
            onValueChange={(v) => onSetRecurring(v, list.recurrenceIntervalWeeks)}
            trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
            thumbColor={list.isRecurring ? theme.orange : theme.gray}
          />
        </View>

        {list.isRecurring && (
          <View style={styles.intervalBlock}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.listRecurringIntervalLabel}</Text>
            <View style={styles.chipRow}>
              {INTERVAL_OPTIONS.map((n) => {
                const active = list.recurrenceIntervalWeeks === n;
                return (
                  <Pressable
                    key={n}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.grayLight },
                      active && { backgroundColor: theme.orange },
                    ]}
                    onPress={() => onSetRecurring(true, n)}
                  >
                    <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.text }]}>
                      {t.listRecurringWeeksOption(n)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Pressable style={[styles.doneBtn, { backgroundColor: theme.orange }]} onPress={onClose}>
          <Text style={styles.doneBtnText}>{t.save}</Text>
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
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.fab,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, marginBottom: Spacing.xs },
  title: { fontSize: FontSize.lg, fontFamily: Fonts.bold },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.md, fontFamily: Fonts.medium },
  intervalBlock: { gap: Spacing.xs },
  fieldLabel: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  chipRow: { flexDirection: 'row', gap: Spacing.xs },
  chip: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, paddingHorizontal: Spacing.xs },
  chipText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  doneBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.md },
});
