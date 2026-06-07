import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { requestPermissions } from '@/lib/notifications';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export default function OnboardingStep4() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();

  function next() {
    if (settings.remindersEnabled || settings.taskNotificationsEnabled) {
      requestPermissions().catch(() => {});
    }
    router.push('/onboarding/step5');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={styles.heading}>{t.notificationsOnboarding}</Text>
          <Text style={styles.sub}>{t.notificationsSub}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>{t.weeklyRemindersOnboarding}</Text>
              <Text style={styles.switchHint}>{t.weeklyRemindersHint}</Text>
            </View>
            <Switch
              value={settings.remindersEnabled}
              onValueChange={(v) => settings.update({ remindersEnabled: v })}
              trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
              thumbColor={settings.remindersEnabled ? Colors.orange : Colors.gray}
            />
          </View>

          {settings.remindersEnabled && (
            <>
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>{t.timeLabelOnboarding}</Text>
              <TextInput
                style={styles.input}
                value={settings.reminderTime}
                onChangeText={(v) => settings.update({ reminderTime: v })}
                placeholder={t.timePlaceholder}
                placeholderTextColor={Colors.gray}
                keyboardType="numbers-and-punctuation"
              />
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>{t.taskNotifications}</Text>
              <Text style={styles.switchHint}>{t.taskNotificationsHintOnboarding}</Text>
            </View>
            <Switch
              value={settings.taskNotificationsEnabled}
              onValueChange={(v) => settings.update({ taskNotificationsEnabled: v })}
              trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
              thumbColor={settings.taskNotificationsEnabled ? Colors.orange : Colors.gray}
            />
          </View>
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
        <Pressable style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnText}>{t.next}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
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
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
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
