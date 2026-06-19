/**
 * step4.tsx — Notification confirmation (guided step 4 of 5)
 *
 * Informs the user that task notifications and weekly shopping reminders are
 * enabled by default. No toggles — they can adjust in Settings later.
 * The actual OS permission request fires in step5 on finish.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/step4"
 *   Data    → useSettingsStore (sets remindersEnabled + taskNotificationsEnabled defaults)
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - No OS permission prompt or scheduling here — step5.finish() does that.
 *   - next() → router.push "/onboarding/step5"; Previous uses router.back().
 */
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FeatureColors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

export default function OnboardingStep4() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  // Notifications are ON by default; shopping reminder fires Saturday 14:00.
  useEffect(() => {
    settings.update({
      remindersEnabled: true,
      taskNotificationsEnabled: true,
      reminderTime: '14:00',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.iconBadge}>
            <Ionicons name="notifications-outline" size={36} color={Colors.orange} />
          </View>
          <Text style={styles.heading}>{t.notificationsOnboarding}</Text>
          <Text style={styles.sub}>{t.notificationsSub}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={22} color={Colors.green} style={styles.infoIconView} />
            <Text style={styles.infoText}>{t.taskNotifications} — {t.taskNotificationsHintOnboarding}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="cart-outline" size={22} color={FeatureColors.shop} style={styles.infoIconView} />
            <Text style={styles.infoText}>{t.weeklyRemindersOnboarding} — {t.weeklyRemindersHint}</Text>
          </View>
        </View>

        <View style={[styles.noteBox, { backgroundColor: Colors.greenLight }]}>
          <Text style={styles.noteText}>{t.onboardingSettingsNote}</Text>
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 3 && styles.dotActive]} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t.previous}</Text>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={() => router.push('/onboarding/step5')}>
          <Text style={styles.nextBtnText}>{t.next}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  top: { alignItems: 'center', gap: Spacing.md },
  iconBadge: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.offWhite,
  },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, ...Shadow.card },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoIconView: { marginTop: 1 },
  infoText: { flex: 1, fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  divider: { height: 1, backgroundColor: Colors.grayLight, marginVertical: Spacing.xs },
  noteBox: { borderRadius: Radius.md, padding: Spacing.md },
  noteText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20, textAlign: 'center' },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl },
  backBtn: { padding: Spacing.md },
  backBtnText: { fontSize: FontSize.md, color: Colors.textLight },
  nextBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadow.fab,
  },
  nextBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
