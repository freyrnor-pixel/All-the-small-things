/**
 * index.tsx — Onboarding welcome + name capture (guided step 1 of 5)
 *
 * First guided step after the language/guided choice. Shows feature highlights
 * and a text field for the user's name, then advances into the setup wizard.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding"
 *   Data    → useSettingsStore (writes `userName`)
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - next() writes `userName` (trimmed) to settings, then router.push to "/onboarding/step2".
 *   - Progress dot index 0 here; keep the 5-dot row in sync across steps.
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export default function OnboardingWelcome() {
  const router = useRouter();
  const update = useSettingsStore((s) => s.update);
  const t = useT();
  const [name, setName] = useState('');

  function next() {
    update({ userName: name.trim() });
    router.push('/onboarding/step2');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.heading}>{t.welcomeHeading}</Text>
            <Text style={styles.sub}>{t.welcomeSub}</Text>
          </View>

          <View style={styles.featureList}>
            {t.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t.whatsYourName}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t.namePlaceholder}
              placeholderTextColor={Colors.gray}
              selectionColor={Colors.orange}
              returnKeyType="done"
              onSubmitEditing={next}
            />
            <Text style={styles.hint}>{t.nameHint}</Text>
          </View>

          <View style={styles.progress}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>{t.getStarted}</Text>
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
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  featureIcon: { fontSize: 20, lineHeight: 26 },
  featureText: { flex: 1, fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  label: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.orange,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  hint: { fontSize: FontSize.xs, color: Colors.textLight, lineHeight: 18 },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
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
