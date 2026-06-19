/**
 * guided.tsx — Guided-setup vs Explore choice (after language)
 *
 * Branch point: "Guided" enters the 5-step wizard; "Explore" skips it and jumps
 * straight to the home screen, marking setup complete. Both enable showHints.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/guided"
 *   Data    → useSettingsStore (writes `showHints`; Explore also writes `setupComplete`)
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - goGuided() → router.push "/onboarding" (continues wizard, leaves setupComplete unset).
 *   - goExplore() sets setupComplete:true and router.replace "/" — this is the onboarding
 *     completion flag; the wizard's own completion is set later in step5.tsx.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';

export default function GuidedScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  function goGuided() {
    settings.update({ showHints: true });
    router.push('/onboarding');
  }

  function goExplore() {
    // W-E: new-user defaults — start with Essentials ON and points visible. Onboarding-only.
    settings.update({ showHints: true, setupComplete: true, essentialsModeEnabled: true, showPoints: true });
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <View style={styles.iconBadge}>
            <Ionicons name="map-outline" size={36} color={Colors.orange} />
          </View>
          <Text style={styles.heading}>{t.guidedTitle}</Text>
          <Text style={styles.sub}>{t.guidedSub}</Text>
        </View>

        <View style={styles.options}>
          <Pressable style={[styles.option, styles.optionPrimary]} onPress={goGuided}>
            <Ionicons name="list-outline" size={24} color={Colors.white} style={styles.optionIconView} />
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>{t.guidedBtn}</Text>
              <Text style={styles.optionDesc}>{t.guidedDesc}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>

          <Pressable style={[styles.option, styles.optionSecondary]} onPress={goExplore}>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, styles.optionLabelSecondary]}>{t.exploreBtn}</Text>
              <Text style={[styles.optionDesc, { color: Colors.textLight }]}>{t.exploreDesc}</Text>
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

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: {
    flex: 1,
    padding: Spacing.xl,
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  top: { alignItems: 'center', gap: Spacing.md },
  iconBadge: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.offWhite,
  },
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
  optionIconView: {},
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
