import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export default function GuidedScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();

  function goGuided() {
    settings.update({ showHints: true });
    router.push('/onboarding');
  }

  function goExplore() {
    settings.update({ showHints: true, setupComplete: true });
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.heading}>{t.guidedTitle}</Text>
          <Text style={styles.sub}>{t.guidedSub}</Text>
        </View>

        <View style={styles.options}>
          <Pressable style={[styles.option, styles.optionPrimary]} onPress={goGuided}>
            <Text style={styles.optionIcon}>📋</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>{t.guidedBtn}</Text>
              <Text style={styles.optionDesc}>{t.guidedDesc}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>

          <Pressable style={[styles.option, styles.optionSecondary]} onPress={goExplore}>
            <Text style={styles.optionIcon}>🚀</Text>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, styles.optionLabelSecondary]}>{t.exploreBtn}</Text>
              <Text style={styles.optionDesc}>{t.exploreDesc}</Text>
            </View>
            <Text style={[styles.arrow, styles.arrowSecondary]}>→</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>{t.previous}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: {
    flex: 1,
    padding: Spacing.xl,
    gap: Spacing.xl,
    justifyContent: 'center',
  },
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
    lineHeight: 22,
  },
  options: { gap: Spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  optionPrimary: {
    backgroundColor: Colors.orange,
  },
  optionSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  optionIcon: { fontSize: 28 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  optionLabelSecondary: { color: Colors.text },
  optionDesc: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  arrow: {
    fontSize: FontSize.xl,
    color: Colors.white,
    fontWeight: '700',
  },
  arrowSecondary: { color: Colors.textLight },
  footer: {
    padding: Spacing.xl,
    paddingTop: 0,
  },
  backText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    fontWeight: '500',
  },
});
