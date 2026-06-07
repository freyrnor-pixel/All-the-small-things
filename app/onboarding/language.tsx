import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import type { Language } from '@/store/useSettingsStore';

type LangOption = {
  code: Language;
  flag: string;
  label: string;
  sublabel: string;
};

const OPTIONS: LangOption[] = [
  { code: 'en', flag: '🇬🇧', label: 'English', sublabel: 'English' },
  { code: 'no', flag: '🇳🇴', label: 'Norsk', sublabel: 'Norwegian' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();

  function choose(lang: Language) {
    settings.update({ language: lang });
    router.push('/onboarding/guided');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.emoji}>🌐</Text>
          <Text style={styles.heading}>{t.chooseLanguage}</Text>
          <Text style={styles.sub}>{t.chooseLanguageSub}</Text>
        </View>

        <View style={styles.optionsRow}>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.code}
              style={[
                styles.option,
                settings.language === opt.code && styles.optionActive,
              ]}
              onPress={() => choose(opt.code)}
            >
              <Text style={styles.flag}>{opt.flag}</Text>
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Text style={styles.optionSub}>{opt.sublabel}</Text>
              {settings.language === opt.code && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
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
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  option: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.grayLight,
    position: 'relative',
    ...Shadow.card,
  },
  optionActive: {
    borderColor: Colors.orange,
  },
  flag: { fontSize: 48 },
  optionLabel: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  optionSub: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
