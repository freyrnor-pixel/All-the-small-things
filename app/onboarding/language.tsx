/**
 * language.tsx — App intro + language picker (first onboarding screen)
 *
 * Entry point of the onboarding flow. The very first thing a new user sees:
 * the app name and a choice of English or Norwegian — no explanatory copy.
 * Persists the choice so all subsequent strings render in that language.
 *
 * Connections:
 *   Imports → @/components/AppLogo, @/store/useSettingsStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/language"
 *   Data    → useSettingsStore (writes `language`)
 *
 * Edit notes:
 *   - Intentionally has no heading/subtext beyond the app name — keep it that way.
 *   - choose() writes `language` to settings, then router.push to "/onboarding/privacy" (inserts privacy trust screen before guided).
 *   - OPTIONS labels are intentionally literal language names (not translated).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import AppLogo from '@/components/AppLogo';
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
    router.push('/onboarding/privacy');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <AppLogo size={72} />
          <Text style={styles.heading}>{t.welcomeHeading}</Text>
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
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
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
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
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
});
