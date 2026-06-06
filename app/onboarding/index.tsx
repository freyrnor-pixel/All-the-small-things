import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const FEATURES = [
  { icon: '✅', text: 'Hold styr på dagens oppgaver — uten å huske alt selv' },
  { icon: '🛒', text: 'Handlelister som setter seg selv opp hver uke' },
  { icon: '🍽', text: 'Matretter med ingredienser du kan skyve rett til handlelisten' },
  { icon: '💚', text: 'Enkel helsedagbok for symptomer og observasjoner' },
  { icon: '💼', text: 'Jobb-modus som holder privat og jobb atskilt' },
];

export default function OnboardingWelcome() {
  const router = useRouter();
  const update = useSettingsStore((s) => s.update);
  const [name, setName] = useState('');

  function next() {
    update({ userName: name.trim() });
    router.push('/onboarding/step2');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.heading}>Alt det lille</Text>
            <Text style={styles.sub}>
              En enkel hverdagsapp laget for deg som ikke ønsker å bruke energi på å holde styr på ting.
              Sett den opp én gang — og la appen gjøre resten.
            </Text>
          </View>

          <View style={styles.featureList}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Hva heter du?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Fornavn (valgfritt)"
              placeholderTextColor={Colors.gray}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={next}
            />
            <Text style={styles.hint}>Brukes bare til å si hei — ingen data forlater telefonen din.</Text>
          </View>

          <View style={styles.progress}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>Kom i gang →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  flex: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  top: { alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 64 },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  featureList: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureIcon: { fontSize: 20, lineHeight: 26 },
  featureText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  label: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  input: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  hint: { fontSize: FontSize.xs, color: Colors.textLight, lineHeight: 18 },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
  },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: { padding: Spacing.xl, paddingTop: Spacing.md },
  nextBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.fab,
  },
  nextBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
