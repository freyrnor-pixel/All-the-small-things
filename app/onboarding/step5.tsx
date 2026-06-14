/**
 * step5.tsx — Color theme + finish (guided step 5 of 5)
 *
 * Final wizard step: pick a color theme, then complete onboarding. On finish it
 * marks setup complete, requests notification permission, and schedules the
 * reminders/task notifications configured in earlier steps.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/notifications, @/lib/reminders,
 *             @/store/useTaskStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/step5"
 *   Data    → useSettingsStore (writes `colorTheme`, `setupComplete`);
 *             schedules notifications via requestPermissions + syncReminders +
 *             useTaskStore.syncAllTaskNotifications
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - finish() sets `setupComplete:true` plus the new-user defaults
 *     `essentialsModeEnabled:true` + `showPoints:true` (onboarding-only — never
 *     mutates an existing user's saved row), then requests OS notification
 *     permission and, regardless of outcome, syncs reminders and task
 *     notifications; finally router.replace "/" to home.
 *   - Previous uses router.back(); Finish button color is theme-driven.
 */
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { requestPermissions } from '@/lib/notifications';
import { syncReminders } from '@/lib/reminders';
import { useTaskStore } from '@/store/useTaskStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing, THEMES, THEME_META, ThemeName } from '@/constants/theme';

export default function OnboardingStep5() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();

  function finish() {
    // W-E: new-user defaults — Essentials Mode ON + points visible by default, so new
    // users start simple. Set here so the guided path gets them too (idempotent with
    // the explore path). Onboarding-only — never mutates an existing user's saved row.
    settings.update({ setupComplete: true, essentialsModeEnabled: false, showPoints: true });
    // Ask for notification permission once setup is done, then schedule the
    // reminders the user just configured during onboarding.
    requestPermissions().finally(() => {
      syncReminders();
      useTaskStore.getState().syncAllTaskNotifications();
    });
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.emoji}>🎨</Text>
          <Text style={styles.heading}>{t.themeOnboarding}</Text>
          <Text style={styles.sub}>{t.themeSub}</Text>
        </View>

        <View style={styles.themeGrid}>
          {(Object.keys(THEMES) as ThemeName[]).map((key) => {
            const meta = THEME_META[key];
            const th = THEMES[key];
            const isActive = settings.colorTheme === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.themeCard,
                  { backgroundColor: th.cream, borderColor: isActive ? th.orange : th.grayLight },
                  isActive && styles.themeCardActive,
                ]}
                onPress={() => settings.update({ colorTheme: key })}
              >
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: th.orange }]} />
                  <View style={[styles.swatch, { backgroundColor: th.green }]} />
                  <View style={[styles.swatch, { backgroundColor: th.brown }]} />
                </View>
                <Text style={styles.themeEmoji}>{meta.emoji}</Text>
                <Text style={[styles.themeLabel, { color: th.text }]}>{t.themeNames[key]}</Text>
                {isActive && (
                  <View style={[styles.checkmark, { backgroundColor: th.orange }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.handednessCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: Spacing.md }}>
              <Text style={styles.switchLabel}>{t.settings.accessibility.leftHanded}</Text>
              <Text style={styles.switchHint}>{t.settings.accessibility.leftHandedHint}</Text>
            </View>
            <Switch
              value={settings.leftHanded}
              onValueChange={(v) => settings.update({ leftHanded: v })}
              trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
              thumbColor={settings.leftHanded ? Colors.orange : Colors.gray}
            />
          </View>
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 4 && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t.previous}</Text>
        </Pressable>
        <Pressable
          style={[styles.doneBtn, { backgroundColor: THEMES[settings.colorTheme]?.orange ?? Colors.orange }]}
          onPress={finish}
        >
          <Text style={styles.doneBtnText}>{t.finishBtn}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { flex: 1, padding: Spacing.xl, gap: Spacing.xl, justifyContent: 'center' },
  top: { alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 64 },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  themeCard: {
    width: '47%',
    borderRadius: Radius.md,
    borderWidth: 2,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
    position: 'relative',
  },
  themeCardActive: { borderWidth: 2 },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm },
  swatch: { width: 20, height: 20, borderRadius: Radius.full },
  themeEmoji: { fontSize: 28 },
  themeLabel: { fontSize: FontSize.md, fontWeight: '600' },
  checkmark: {
    position: 'absolute',
    top: 8, right: 8,
    width: 22, height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  handednessCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  switchHint: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl },
  backBtn: { padding: Spacing.md },
  backBtnText: { fontSize: FontSize.md, color: Colors.textLight },
  doneBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, ...Shadow.fab },
  doneBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
