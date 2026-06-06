import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const DAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const DAY_FULL = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

export default function OnboardingStep2() {
  const router = useRouter();
  const settings = useSettingsStore();

  function next() {
    router.push('/onboarding/step3');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Text style={styles.emoji}>🛒</Text>
          <Text style={styles.heading}>Handleliste</Text>
          <Text style={styles.sub}>
            Velg hvilken dag du vil nullstille ukeslisten og legge til den månedlige.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hvilken dag handler du vanligvis?</Text>
          <View style={styles.dayRow}>
            {DAY_LABELS.map((label, i) => (
              <Pressable
                key={i}
                style={[styles.dayChip, settings.weeklyResetDay === i && styles.dayChipActive]}
                onPress={() => settings.update({ weeklyResetDay: i })}
              >
                <Text
                  style={[styles.dayText, settings.weeklyResetDay === i && styles.dayTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            Ukeslisten nullstilles på {DAY_FULL[settings.weeklyResetDay]} morgen.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hvilken dato vil du nullstille månedslisten?</Text>
          <View style={styles.dateRow}>
            {[1, 5, 10, 15, 20, 25, 28].map((d) => (
              <Pressable
                key={d}
                style={[styles.dateChip, settings.monthlyResetDate === d && styles.dateChipActive]}
                onPress={() => settings.update({ monthlyResetDate: d })}
              >
                <Text
                  style={[styles.dateText, settings.monthlyResetDate === d && styles.dateTextActive]}
                >
                  {d}.
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Tilbake</Text>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnText}>Neste →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing.xl, gap: Spacing.xl },
  top: { alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 64 },
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
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: Colors.orange },
  dayText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  dayTextActive: { color: Colors.white },
  hint: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  dateChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: { backgroundColor: Colors.orange },
  dateText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  dateTextActive: { color: Colors.white },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange },
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
