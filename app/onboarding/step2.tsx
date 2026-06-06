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
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export default function OnboardingStep2() {
  const router = useRouter();
  const settings = useSettingsStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <Text style={styles.emoji}>💼</Text>
          <Text style={styles.heading}>Jobb-modus</Text>
          <Text style={styles.sub}>
            Når jobb-modus er på, vises bare arbeidsrelaterte oppgaver — perfekt for å holde fokus.
            Du kan alltid bytte modus direkte fra hjemskjermen.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchLabel}>Start med jobb-modus aktivert</Text>
              <Text style={styles.switchHint}>Du kan endre dette når som helst</Text>
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
              <Text style={styles.switchLabel}>Aktiver automatisk i arbeidstiden</Text>
              <Text style={styles.switchHint}>Appen bytter modus selv basert på klokkeslett</Text>
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
              <Text style={styles.fieldLabel}>Arbeidstid (HH:MM)</Text>
              <View style={styles.hoursRow}>
                <View style={styles.hourField}>
                  <Text style={styles.hourLabel}>Fra</Text>
                  <TextInput
                    style={styles.hourInput}
                    value={settings.workHoursStart}
                    onChangeText={(v) => settings.update({ workHoursStart: v })}
                    placeholder="09:00"
                    placeholderTextColor={Colors.gray}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <Text style={styles.hourSep}>–</Text>
                <View style={styles.hourField}>
                  <Text style={styles.hourLabel}>Til</Text>
                  <TextInput
                    style={styles.hourInput}
                    value={settings.workHoursEnd}
                    onChangeText={(v) => settings.update({ workHoursEnd: v })}
                    placeholder="17:00"
                    placeholderTextColor={Colors.gray}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            💡 Du kan alltid trykke «Bytt modus» på hjemskjermen for å midlertidig
            gå tilbake til personlig modus — uten å endre innstillingene dine.
          </Text>
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Tilbake</Text>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={() => router.push('/onboarding/step3')}>
          <Text style={styles.nextBtnText}>Neste →</Text>
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: { flex: 1, marginRight: Spacing.md },
  switchLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  switchHint: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.grayLight, marginVertical: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600', marginBottom: Spacing.sm },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hourField: { flex: 1, gap: 4 },
  hourLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  hourInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
  },
  hourSep: { fontSize: FontSize.lg, color: Colors.textLight, marginTop: Spacing.lg },
  tipBox: {
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  tipText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingTop: 0,
  },
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
