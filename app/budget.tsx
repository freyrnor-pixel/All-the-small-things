/**
 * budget.tsx — monthly grocery budget vs. receipts (AP-06B)
 *
 * Compares this month's scanned/manual receipt total (useReceiptStore) against
 * the optional monthly budget set in Settings, with a gentle progress bar and
 * a list of this month's receipts. Reached via a quick-action button on
 * app/shopping.tsx (router.push) or the header link on app/scan.tsx (goToSite,
 * replacing scan) — not in BottomNav. Either way Shopping sits underneath it
 * in the stack, so its ScreenHeader back arrow (router.back()) returns there.
 *
 * Connections:
 *   Imports → components/BottomNav, components/ScreenBackground, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useReceiptStore, store/useSettingsStore
 *   Used by → Expo Router route "/budget"; reached via app/shopping.tsx (quick action) or app/scan.tsx (header link)
 *   Data    → reads useReceiptStore (receipts table, via receiptsForMonth/totalForMonth) and useSettingsStore.monthlyBudgetNok; writes nothing
 *
 * Edit notes:
 *   - No budget set (monthlyBudgetNok <= 0) shows noBudgetSet instead of a progress bar — never a 0%/divide-by-zero bar.
 *   - Over-budget uses FeatureColors.scan (burnt amber), never theme.danger/red — no-shame color rule (see AGENTS.md).
 *   - month is derived via lib/date's currentMonthStr(), matching how useReceiptStore indexes/filters receipts.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useReceiptStore } from '@/store/useReceiptStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { currentMonthStr } from '@/lib/date';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { FeatureColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

export default function BudgetScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const monthlyBudgetNok = useSettingsStore((s) => s.monthlyBudgetNok);
  const totalForMonth = useReceiptStore((s) => s.totalForMonth);
  const receiptsForMonth = useReceiptStore((s) => s.receiptsForMonth);

  const month = currentMonthStr();
  const spent = totalForMonth(month);
  const receipts = receiptsForMonth(month);
  const hasBudget = monthlyBudgetNok > 0;
  const overBudget = hasBudget && spent > monthlyBudgetNok;
  const pct = hasBudget ? Math.min(100, (spent / monthlyBudgetNok) * 100) : 0;
  const barColor = overBudget ? FeatureColors.scan : theme.green;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ScreenHeader title={t.budget.title} onBack={() => router.back()} bordered />

      <SiteSwipeView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Surface style={styles.card}>
          {hasBudget ? (
            <>
              <Text style={[styles.spentText, { color: theme.text }]}>
                {t.budget.spentOfBudget(String(Math.round(spent)), String(Math.round(monthlyBudgetNok)))}
              </Text>
              <View style={[styles.track, { backgroundColor: theme.grayLight }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={[styles.hintText, { color: theme.textLight }]}>
                {overBudget ? t.budget.overBudgetHint : t.budget.onTrackHint}
              </Text>
            </>
          ) : (
            <Text style={[styles.hintText, { color: theme.textLight }]}>{t.budget.noBudgetSet}</Text>
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
      </ScrollView>
      </SiteSwipeView>

      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
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
});
