import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { requestPermissions } from '@/lib/notifications';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export default function OnboardingStep3() {
  const router = useRouter();
  const settings = useSettingsStore();

  async function finish() {
    if (settings.remindersEnabled || settings.taskNotificationsEnabled) {
      await requestPermissions();
    }
    settings.update({ setupComplete: true });
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={styles.heading}>Varsler</Text>
          <Text style={styles.sub}>
            Vi kan sende deg varme påminnelser slik at du aldri trenger å huske alt selv.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Ukentlige påminnelser</Text>
              <Text style={styles.switchHint}>Planlegg uken din</Text>
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
              <Text style={styles.fieldLabel}>Påminnelsestidspunkt</Text>
              <TextInput
                style={styles.input}
                value={settings.reminderTime}
                onChangeText={(v) => settings.update({ reminderTime: v })}
                placeholder="08:00"
                placeholderTextColor={Colors.gray}
                keyboardType="numbers-and-punctuation"
              />
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Oppgavevarsler</Text>
              <Text style={styles.switchHint}>Påminnelse når en oppgave begynner</Text>
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
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Tilbake</Text>
        </Pressable>
        <Pressable style={styles.doneBtn} onPress={finish}>
          <Text style={styles.doneBtnText}>Kom i gang!</Text>
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  dotActive: { backgroundColor: Colors.orange },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  backBtn: { padding: Spacing.md },
  backBtnText: { fontSize: FontSize.md, color: Colors.textLight },
  doneBtn: {
    backgroundColor: Colors.green,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadow.fab,
  },
  doneBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
