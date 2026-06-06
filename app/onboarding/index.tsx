import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

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
        <View style={styles.content}>
          <View style={styles.top}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.heading}>Hei, og velkommen!</Text>
            <Text style={styles.sub}>
              Alt det lille hjelper deg å holde styr på hverdagen — uten å tenke for mye.
              La oss sette opp appen raskt.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Hva heter du?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Fornavn"
              placeholderTextColor={Colors.gray}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={next}
            />
          </View>

          <View style={styles.progress}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>Neste →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  flex: { flex: 1 },
  content: { flex: 1, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.xl },
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
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
  },
  dotActive: { backgroundColor: Colors.orange },
  footer: { padding: Spacing.xl },
  nextBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.fab,
  },
  nextBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
