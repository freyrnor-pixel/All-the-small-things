/**
 * step2.tsx — Work mode setup (guided step 2 of 5)
 *
 * Lets the user toggle work mode, auto-activation by work hours, and enter the
 * start/end work-hour strings used to switch the app's mode automatically.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/step2"
 *   Data    → useSettingsStore (writes `workModeEnabled`, `enforceWorkHours`,
 *             `workHoursStart`, `workHoursEnd`)
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - Switches write directly to settings.update() on change (no local state).
 *   - Next button → router.push "/onboarding/step3"; Previous uses router.back().
 *   - Hour inputs are free-text strings ("09:00"); not validated here.
 */
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';
import TimePickerWheel from '@/components/TimePickerWheel';

export default function OnboardingStep2() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();
  const theme = useAppTheme();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.top}>
          <Text style={styles.emoji}>💼</Text>
          <Text style={styles.heading}>{t.workModeOnboarding}</Text>
          <Text style={styles.sub}>{t.workModeOnboardingSub}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>{t.startWithWorkMode}</Text>
              <Text style={styles.switchHint}>{t.canChangeAnytime}</Text>
            </View>
            <Switch
              value={settings.workModeEnabled}
              onValueChange={(v) => settings.update({ workModeEnabled: v })}
              trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
              thumbColor={settings.workModeEnabled ? Colors.orange : Colors.gray}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>{t.autoActivateWorkHours}</Text>
              <Text style={styles.switchHint}>{t.appSwitchesItself}</Text>
            </View>
            <Switch
              value={settings.enforceWorkHours}
              onValueChange={(v) => settings.update({ enforceWorkHours: v })}
              trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
              thumbColor={settings.enforceWorkHours ? Colors.orange : Colors.gray}
            />
          </View>

          {settings.enforceWorkHours && (
            <>
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>{t.workHoursFormat}</Text>
              <View style={styles.hoursRow}>
                <View style={styles.hourField}>
                  <Text style={styles.hourLabel}>{t.workHoursFrom}</Text>
                  <TimePickerWheel
                    value={settings.workHoursStart || '07:00'}
                    onChange={(v) => settings.update({ workHoursStart: v })}
                    theme={theme}
                  />
                </View>
                <View style={styles.hourField}>
                  <Text style={styles.hourLabel}>{t.workHoursTo}</Text>
                  <TimePickerWheel
                    value={settings.workHoursEnd || '17:00'}
                    onChange={(v) => settings.update({ workHoursEnd: v })}
                    theme={theme}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>{t.tipWorkMode}</Text>
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
          ))}
        </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t.previous}</Text>
          </Pressable>
          <Pressable style={styles.nextBtn} onPress={() => router.push('/onboarding/step3')}>
            <Text style={styles.nextBtnText}>{t.next}</Text>
          </Pressable>
        </View>
        {/* W-E: gentle, always-visible skip so no step feels mandatory */}
        <Pressable style={styles.skipLink} onPress={() => router.push('/onboarding/step3')}>
          <Text style={styles.skipLinkText}>{t.config.skipForNow}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  skipLink: { alignItems: 'center', paddingBottom: Spacing.lg },
  skipLinkText: { fontSize: FontSize.sm, color: Colors.textLight, textDecorationLine: 'underline' },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  top: { alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 64 },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.card },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLeft: { flex: 1, marginRight: Spacing.md },
  switchLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  switchHint: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.grayLight, marginVertical: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600', marginBottom: Spacing.sm },
  hoursRow: { flexDirection: 'row', gap: Spacing.md },
  hourField: { flex: 1, gap: 4 },
  hourLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', textAlign: 'center' },
  tipBox: { backgroundColor: Colors.greenLight, borderRadius: Radius.md, padding: Spacing.md },
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
