/**
 * step3.tsx — Shopping reset days (guided step 3 of 5)
 *
 * Captures the weekly shopping/reset day and the monthly reset date that drive
 * the shopping list's recurring resets.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/step3"
 *   Data    → useSettingsStore (writes `weeklyResetDay`, `monthlyResetDate`)
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - monthlyResetDate is committed live on valid input (1–31); onBlur reverts bad input.
 *   - Next button → router.push "/onboarding/step4"; Previous uses router.back().
 *   - `dateInput` is local edit state seeded from settings.monthlyResetDate.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FeatureColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export default function OnboardingStep3() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();
  const [dateInput, setDateInput] = useState(String(settings.monthlyResetDate));

  // Weekly reset defaults to Monday (index 0) — no user choice needed in onboarding.
  useEffect(() => {
    settings.update({ weeklyResetDay: 0 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.iconBadge}>
            <Ionicons name="cart-outline" size={36} color={FeatureColors.shop} />
          </View>
          <Text style={styles.heading}>{t.shoppingOnboarding}</Text>
          <Text style={styles.sub}>{t.shoppingOnboardingSub}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.monthlyResetDateQuestion}</Text>
          <TextInput
            style={styles.dateInput}
            value={dateInput}
            onChangeText={(v) => {
              setDateInput(v);
              const n = parseInt(v, 10);
              if (!isNaN(n) && n >= 1 && n <= 31) {
                settings.update({ monthlyResetDate: n });
              }
            }}
            onBlur={() => {
              const n = parseInt(dateInput, 10);
              if (isNaN(n) || n < 1 || n > 31) {
                setDateInput(String(settings.monthlyResetDate));
              }
            }}
            keyboardType="number-pad"
            placeholder="1–31"
            placeholderTextColor={Colors.gray}
            maxLength={2}
            returnKeyType="done"
          />
          <Text style={styles.hint}>{t.monthlyDateInputHint}</Text>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>{t.monthlyPaydayHint}</Text>
          </View>
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 2 && styles.dotActive]} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t.previous}</Text>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={() => router.push('/onboarding/step4')}>
          <Text style={styles.nextBtnText}>{t.next}</Text>
        </Pressable>
      </View>
      {/* W-E: gentle, always-visible skip so no step feels mandatory */}
      <Pressable style={styles.skipLink} onPress={() => router.push('/onboarding/step4')}>
        <Text style={styles.skipLinkText}>{t.config.skipForNow}</Text>
      </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  flex: { flex: 1 },
  skipLink: { alignItems: 'center', paddingBottom: Spacing.lg },
  skipLinkText: { fontSize: FontSize.sm, color: Colors.textLight, textDecorationLine: 'underline' },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  top: { alignItems: 'center', gap: Spacing.md },
  iconBadge: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.offWhite,
  },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  dayRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  dayChip: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.grayLight, alignItems: 'center', justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: Colors.orange },
  dayText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  dayTextActive: { color: Colors.white },
  hint: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },
  dateInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.orange,
    padding: Spacing.md,
    fontSize: FontSize.xl,
    color: Colors.text,
    textAlign: 'center',
  },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  dateChip: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.grayLight, alignItems: 'center', justifyContent: 'center',
  },
  dateChipActive: { backgroundColor: Colors.orange },
  dateText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  dateTextActive: { color: Colors.white },
  tipBox: { backgroundColor: Colors.greenLight, borderRadius: Radius.md, padding: Spacing.sm },
  tipText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 0 },
  backBtn: { padding: Spacing.md },
  backBtnText: { fontSize: FontSize.md, color: Colors.textLight },
  nextBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadow.card,
  },
  nextBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
