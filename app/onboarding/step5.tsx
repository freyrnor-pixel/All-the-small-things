/**
 * step5.tsx — Color theme (guided step 5 of 6)
 *
 * Pick a color theme and handedness, then continue to the companion-pet step.
 * Finishing onboarding (setup complete + notification scheduling) now happens
 * in step6.tsx.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/i18n, @/constants/theme
 *   Used by → Expo Router route "/onboarding/step5"
 *   Data    → useSettingsStore (writes `colorTheme`, `leftHanded`); scaled
 *             fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - Next button → router.push "/onboarding/step6" (companion pet naming,
 *     which now owns setupComplete + notification scheduling).
 *   - Previous uses router.back(); Next button color is theme-driven.
 */
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing, THEMES, THEME_ICONS, ThemeName } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import SwatchPicker from '@/components/SwatchPicker';

export default function OnboardingStep5() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();
  const styles = useScaledStyles(baseStyles);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <View style={styles.iconBadge}>
            <Ionicons name="color-palette-outline" size={36} color={Colors.orange} />
          </View>
          <Text style={styles.heading}>{t.themeOnboarding}</Text>
          <Text style={styles.sub}>{t.themeSub}</Text>
        </View>

        <SwatchPicker
          items={(Object.keys(THEMES) as ThemeName[])
            .filter((key) => key !== 'custom')
            .map((key) => ({ key, label: t.themeNames[key] }))}
          value={settings.colorTheme}
          onChange={(key) => settings.update({ colorTheme: key as ThemeName })}
          renderSwatch={(key) => {
            const th = THEMES[key as ThemeName];
            return (
              <View style={[styles.swatchFill, { backgroundColor: th.orange }]}>
                <Ionicons name={THEME_ICONS[key as ThemeName] as any} size={24} color={th.white} />
              </View>
            );
          }}
        />

        <View style={styles.handednessCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: Spacing.md }}>
              <Text style={styles.switchLabel}>{t.settings.accessibility.leftHanded}</Text>
              <Text style={styles.switchHint}>{t.settings.accessibility.leftHandedHint}</Text>
            </View>
            <Switch
              value={settings.leftHanded}
              onValueChange={(v) => settings.update({ leftHanded: v })}
              trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
              thumbColor={settings.leftHanded ? Colors.orange : Colors.gray}
            />
          </View>
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.dot, i === 4 && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t.previous}</Text>
        </Pressable>
        <Pressable
          style={[styles.doneBtn, { backgroundColor: THEMES[settings.colorTheme]?.orange ?? Colors.orange }]}
          onPress={() => router.push('/onboarding/step6')}
        >
          <Text style={styles.doneBtnText}>{t.next}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { flex: 1, padding: Spacing.xl, gap: Spacing.xl, justifyContent: 'center' },
  top: { alignItems: 'center', gap: Spacing.md },
  iconBadge: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.offWhite,
  },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },
  swatchFill: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  handednessCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  switchHint: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl },
  backBtn: { padding: Spacing.md },
  backBtnText: { fontSize: FontSize.md, color: Colors.textLight },
  doneBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, ...Shadow.fab },
  doneBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
