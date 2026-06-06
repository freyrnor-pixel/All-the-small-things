import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Colors, FontSize, Radius, Shadow, Spacing, THEMES, THEME_META, ThemeName } from '@/constants/theme';

export default function OnboardingStep5() {
  const router = useRouter();
  const settings = useSettingsStore();

  function finish() {
    settings.update({ setupComplete: true });
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.emoji}>🎨</Text>
          <Text style={styles.heading}>Velg utseende</Text>
          <Text style={styles.sub}>
            Velg et fargetema du liker. Du kan alltid endre det i innstillingene.
          </Text>
        </View>

        <View style={styles.themeGrid}>
          {(Object.keys(THEMES) as ThemeName[]).map((key) => {
            const meta = THEME_META[key];
            const t = THEMES[key];
            const isActive = settings.colorTheme === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.themeCard,
                  { backgroundColor: t.cream, borderColor: isActive ? t.orange : t.grayLight },
                  isActive && styles.themeCardActive,
                ]}
                onPress={() => settings.update({ colorTheme: key })}
              >
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: t.orange }]} />
                  <View style={[styles.swatch, { backgroundColor: t.green }]} />
                  <View style={[styles.swatch, { backgroundColor: t.brown }]} />
                </View>
                <Text style={styles.themeEmoji}>{meta.emoji}</Text>
                <Text style={[styles.themeLabel, { color: t.text }]}>{meta.label}</Text>
                {isActive && (
                  <View style={[styles.checkmark, { backgroundColor: t.orange }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 4 && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Tilbake</Text>
        </Pressable>
        <Pressable style={[styles.doneBtn, { backgroundColor: THEMES[settings.colorTheme]?.orange ?? Colors.orange }]} onPress={finish}>
          <Text style={styles.doneBtnText}>Kom i gang! 🌿</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { flex: 1, padding: Spacing.xl, gap: Spacing.xl, justifyContent: 'center' },
  top: { alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 64 },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  themeCard: {
    width: '47%',
    borderRadius: Radius.md,
    borderWidth: 2,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
    position: 'relative',
  },
  themeCardActive: {
    borderWidth: 2,
  },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm },
  swatch: { width: 20, height: 20, borderRadius: Radius.full },
  themeEmoji: { fontSize: 28 },
  themeLabel: { fontSize: FontSize.md, fontWeight: '600' },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  backBtn: { padding: Spacing.md },
  backBtnText: { fontSize: FontSize.md, color: Colors.textLight },
  doneBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadow.fab,
  },
  doneBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
