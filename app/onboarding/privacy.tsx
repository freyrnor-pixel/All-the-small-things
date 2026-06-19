/**
 * privacy.tsx — Local-only trust screen (onboarding step between language and guided)
 *
 * Reassures the user that no data leaves the device and the app is always free.
 * Shown once during onboarding; the same content also appears as a HintCard in
 * app/settings.tsx for returning users.
 *
 * Connections:
 *   Imports → @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/privacy"
 *   Data    → none (no writes to settings; purely informational)
 *
 * Edit notes:
 *   - All strings through useT(); this screen has no local state.
 *   - "Got it" navigates to /onboarding/guided.
 *   - Previous navigates back to /onboarding/language.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

export default function PrivacyScreen() {
  const router = useRouter();
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.headline}>{t.onboarding.privacy.headline}</Text>
        </View>

        <View style={styles.bulletCard}>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>📱</Text>
            <Text style={styles.bulletText}>{t.onboarding.privacy.local}</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>💚</Text>
            <Text style={styles.bulletText}>{t.onboarding.privacy.free}</Text>
          </View>
        </View>

        <Pressable style={styles.ctaBtn} onPress={() => router.push('/onboarding/guided')}>
          <Text style={styles.ctaText}>{t.onboarding.privacy.cta}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>{t.previous}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: {
    flex: 1,
    padding: Spacing.xl,
    gap: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  top: { alignItems: 'center', gap: Spacing.md },
  icon: { fontSize: 72 },
  headline: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  bulletCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    ...Shadow.card,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bullet: { fontSize: 22, lineHeight: 26 },
  bulletText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  ctaBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    ...Shadow.card,
  },
  ctaText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  footer: { padding: Spacing.xl, paddingTop: 0 },
  backText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '500' },
});
