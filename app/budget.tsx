/**
 * budget.tsx — monthly grocery budget vs. receipts (AP-06B) with month navigation & store breakdown
 *
 * Compares a selected month's scanned/manual receipt total (useReceiptStore) against
 * the optional monthly budget set in Settings, with a gentle progress bar, month selector,
 * receipt list, and per-store breakdown. Budget can be set/edited inline. Reached via a
 * quick-action button on app/shopping.tsx (router.push) or the header link on app/scan.tsx
 * (goToSite, replacing scan) — not in BottomNav. Shopping sits underneath, so back()
 * returns there.
 *
 * Connections:
 *   Imports → components/BottomNav, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useReceiptStore, store/useSettingsStore
 *   Used by → Expo Router route "/budget"; reached via app/shopping.tsx (quick action) or app/scan.tsx (header link)
 *   Data    → reads useReceiptStore (receipts table, months/receiptsForMonth/totalForMonth/receiptsByStore) and useSettingsStore.monthlyBudgetNok; writes via useSettingsStore.update (monthlyBudgetNok)
 *
 * Edit notes:
 *   - Month selector uses left/right navigation (← Older / Newer →) to browse available months (derived from distinct receipt months, sorted descending).
 *   - No budget set (monthlyBudgetNok <= 0) shows "Set budget" button inline; hasBudget shows "Edit budget" link.
 *   - Per-store breakdown (Per butikk section) sums receipts by store for the selected month, sorted by amount descending.
 *   - Over-budget uses FeatureColors.scan (burnt amber), never theme.danger/red — no-shame color rule (see AGENTS.md).
 *   - Budget progress bar always compares against the live monthlyBudgetNok, even when viewing past months.
 *   - No AddFAB on this screen — a budget is a single value to edit, not a list of entities.
 *     The budget-editor sheet's Cancel/Save live in a header row at the top (matching
 *     app/task-form.tsx's pattern) instead of a bottom footer.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useReceiptStore } from '@/store/useReceiptStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { currentMonthStr } from '@/lib/date';
import Surface from '@/components/Surface';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { FeatureColors, FontSize, Radius, Shadow, Spacing, Colors } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

export default function BudgetScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const monthlyBudgetNok = useSettingsStore((s) => s.monthlyBudgetNok);
  const updateSettings = useSettingsStore((s) => s.update);
  const totalForMonth = useReceiptStore((s) => s.totalForMonth);
  const receiptsForMonth = useReceiptStore((s) => s.receiptsForMonth);
  const getMonths = useReceiptStore((s) => s.months);
  const receiptsByStore = useReceiptStore((s) => s.receiptsByStore);

  const defaultMonth = currentMonthStr();
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [budgetEditorVisible, setBudgetEditorVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudgetNok || ''));
  const months = getMonths();

  const spent = totalForMonth(selectedMonth);
  const receipts = receiptsForMonth(selectedMonth);
  const storeBreakdown = receiptsByStore(selectedMonth);
  const hasBudget = monthlyBudgetNok > 0;
  const overBudget = hasBudget && spent > monthlyBudgetNok;
  const pct = hasBudget ? Math.min(100, (spent / monthlyBudgetNok) * 100) : 0;
  const barColor = overBudget ? FeatureColors.scan : theme.green;

  function saveBudget() {
    const newBudget = parseFloat(budgetInput.replace(',', '.')) || 0;
    updateSettings({ monthlyBudgetNok: newBudget });
    setBudgetEditorVisible(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={t.budget.title} onBack={() => router.back()} bordered />

      <SiteSwipeView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Month selector */}
        {months.length > 1 && (
          <View style={styles.monthSelector}>
            <Pressable
              onPress={() => {
                const idx = months.indexOf(selectedMonth);
                if (idx < months.length - 1) setSelectedMonth(months[idx + 1]);
              }}
              disabled={months.indexOf(selectedMonth) >= months.length - 1}
            >
              <Text style={[styles.monthNavText, { color: theme.orange }]}>← Older</Text>
            </Pressable>
            <Text style={[styles.monthText, { color: theme.text }]}>{selectedMonth}</Text>
            <Pressable
              onPress={() => {
                const idx = months.indexOf(selectedMonth);
                if (idx > 0) setSelectedMonth(months[idx - 1]);
              }}
              disabled={months.indexOf(selectedMonth) === 0}
            >
              <Text style={[styles.monthNavText, { color: theme.orange }]}>Newer →</Text>
            </Pressable>
          </View>
        )}

        <Surface style={styles.card}>
          {hasBudget ? (
            <>
              <View style={styles.budgetHeader}>
                <Text style={[styles.spentText, { color: theme.text }]}>
                  {t.budget.spentOfBudget(String(Math.round(spent)), String(Math.round(monthlyBudgetNok)))}
                </Text>
                <Pressable onPress={() => { setBudgetInput(String(monthlyBudgetNok)); setBudgetEditorVisible(true); }}>
                  <Text style={[styles.editBudgetLink, { color: theme.orange }]}>Endre budsjett</Text>
                </Pressable>
              </View>
              <View style={[styles.track, { backgroundColor: theme.grayLight }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={[styles.hintText, { color: theme.textLight }]}>
                {overBudget ? t.budget.overBudgetHint : t.budget.onTrackHint}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.hintText, { color: theme.textLight }]}>{t.budget.noBudgetSet}</Text>
              <Pressable
                style={[styles.setBudgetBtn, { backgroundColor: theme.orange }]}
                onPress={() => { setBudgetInput(''); setBudgetEditorVisible(true); }}
              >
                <Text style={styles.setBudgetBtnText}>Sett budsjett</Text>
              </Pressable>
            </>
          )}
        </Surface>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.budget.receiptsTitle}</Text>
          {receipts.length === 0 ? (
            <Surface tint={theme.offWhite} style={styles.card}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.budget.noReceipts}</Text>
            </Surface>
          ) : (
            <Surface style={styles.card}>
              {receipts.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowLabel, { color: theme.text }]}>{r.store || t.budget.title}</Text>
                    <Text style={[styles.rowMeta, { color: theme.textLight }]}>{r.date}</Text>
                  </View>
                  <Text style={[styles.rowTotal, { color: theme.text }]}>{r.total.toFixed(2)} kr</Text>
                </View>
              ))}
            </Surface>
          )}
        </View>

        {/* Per-store breakdown */}
        {Object.keys(storeBreakdown).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>Per butikk</Text>
            <Surface style={styles.card}>
              {Object.entries(storeBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([store, total]) => (
                  <View key={store} style={styles.row}>
                    <View style={styles.rowContent}>
                      <Text style={[styles.rowLabel, { color: theme.text }]}>{store || t.budget.title}</Text>
                    </View>
                    <Text style={[styles.rowTotal, { color: theme.text }]}>{total.toFixed(2)} kr</Text>
                  </View>
                ))}
            </Surface>
          </View>
        )}
      </ScrollView>
      </SiteSwipeView>

      <BottomNav />

      {/* Budget editor modal */}
      <Modal visible={budgetEditorVisible} transparent animationType="slide" onRequestClose={() => setBudgetEditorVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setBudgetEditorVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kvWrapper}>
          <View style={[styles.budgetSheet, { backgroundColor: theme.white }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.grayLight }]} />
            <View style={[styles.sheetHeader, { borderBottomColor: theme.grayLight }]}>
              <Pressable onPress={() => setBudgetEditorVisible(false)}>
                <Text style={[styles.sheetCancel, { color: theme.textLight }]}>Avbryt</Text>
              </Pressable>
              <Text style={[styles.sheetHeaderTitle, { color: theme.text }]}>Sett budsjett</Text>
              <Pressable onPress={saveBudget}>
                <Text style={[styles.sheetSave, { color: theme.orange }]}>Lagre</Text>
              </Pressable>
            </View>
            <Text style={[styles.sheetLabel, { color: theme.textLight }]}>Månedlig budsjett (NOK)</Text>
            <TextInput
              style={[styles.sheetInput, { color: theme.text, backgroundColor: theme.offWhite }]}
              placeholder="0"
              placeholderTextColor={theme.gray}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={saveBudget}
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, ...Shadow.card },
  spentText: { fontSize: FontSize.lg, fontWeight: '700' },
  track: { height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
  hintText: { fontSize: FontSize.sm, lineHeight: 20 },
  section: { gap: Spacing.xs },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: FontSize.md, fontWeight: '600' },
  rowMeta: { fontSize: FontSize.xs, marginTop: 1 },
  rowTotal: { fontSize: FontSize.md, fontWeight: '600' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  monthText: { fontSize: FontSize.md, fontWeight: '600' },
  monthNavText: { fontSize: FontSize.sm, fontWeight: '600' },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBudgetLink: { fontSize: FontSize.sm, fontWeight: '600' },
  setBudgetBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  setBudgetBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  kvWrapper: { flex: 1, justifyContent: 'flex-end' },
  budgetSheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  sheetHeaderTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  sheetCancel: { fontSize: FontSize.md },
  sheetSave: { fontSize: FontSize.md, fontWeight: '700' },
  sheetLabel: { fontSize: FontSize.sm, fontWeight: '600', marginTop: Spacing.xs },
  sheetInput: { borderRadius: Radius.md, padding: Spacing.md, fontSize: FontSize.lg },
});
