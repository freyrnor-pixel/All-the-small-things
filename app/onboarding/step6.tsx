/**
 * step6.tsx — Companion pet naming (guided step 6 of 6)
 *
 * Final wizard step: name and customize the companion pet, then complete
 * onboarding. On finish it marks setup complete, enables the pet, requests
 * notification permission, and schedules the reminders/task notifications
 * configured in earlier steps.
 *
 * Connections:
 *   Imports → @/store/useSettingsStore, @/lib/notifications, @/lib/reminders,
 *             @/store/useTaskStore, @/lib/i18n, @/constants/theme,
 *             @/lib/useAppTheme, @/components/Pet
 *   Used by → Expo Router route "/onboarding/step6"
 *   Data    → useSettingsStore (writes `petEnabled`, `petName`, `petType`,
 *             `petColor`, `setupComplete`); schedules notifications via
 *             requestPermissions + syncReminders + useTaskStore.syncAllTaskNotifications;
 *             scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All user-facing strings go through useT() — no hardcoded text.
 *   - finish() (moved here from step5.tsx) sets `setupComplete:true` plus the
 *     new-user defaults `essentialsModeEnabled:true` + `showPoints:true`, plus
 *     `petEnabled:true` and the name chosen on this screen, then requests OS
 *     notification permission and, regardless of outcome, syncs reminders and
 *     task notifications; finally router.replace "/" to home.
 *   - Pet preview is live: tapping a type/colour writes straight to
 *     useSettingsStore, and Pet.tsx reads the same store reactively — no local
 *     state needed to keep the preview in sync.
 *   - Pet.tsx's root container is `position: 'absolute'` (it's normally a
 *     home-screen corner overlay) — wrapped here in a fixed-height
 *     `position: 'relative'` box so it renders inline as a preview instead.
 *   - Previous uses router.back(); Finish button color is theme-driven.
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, PetType } from '@/store/useSettingsStore';
import { requestPermissions } from '@/lib/notifications';
import { syncReminders } from '@/lib/reminders';
import { useTaskStore } from '@/store/useTaskStore';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing, THEMES } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import Pet from '@/components/Pet';

const PET_TYPES: PetType[] = ['cat', 'dog', 'bird', 'fox', 'bunny'];
const PET_EMOJIS: Record<PetType, string> = { cat: '🐱', dog: '🐶', bird: '🐦', fox: '🦊', bunny: '🐰' };

export default function OnboardingStep6() {
  const router = useRouter();
  const settings = useSettingsStore();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const [petNameInput, setPetNameInput] = useState(settings.petName);

  // Colour swatches for the pet picker — same fixed palette as settings.tsx's pet colour picker.
  const petSwatches = [theme.orange, theme.green, '#A78BFA', '#F472B6', '#60A5FA', '#34D399'];

  function finish() {
    settings.update({
      setupComplete: true,
      essentialsModeEnabled: true,
      showPoints: true,
      petEnabled: true,
      petName: petNameInput.trim(),
    });
    requestPermissions().finally(() => {
      syncReminders();
      useTaskStore.getState().syncAllTaskNotifications();
    });
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <View style={[styles.iconBadge, { backgroundColor: theme.orangeLight }]}>
              <Ionicons name="paw-outline" size={36} color={theme.orange} />
            </View>
            <Text style={styles.heading}>{t.onboarding.step6.title}</Text>
            <Text style={styles.sub}>{t.onboarding.step6.subtitle}</Text>
          </View>

          <View style={styles.previewWrap}>
            <Pet completedToday={0} />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.settings.pet.name}</Text>
            <TextInput
              style={styles.input}
              value={petNameInput}
              onChangeText={setPetNameInput}
              onBlur={() => settings.update({ petName: petNameInput.trim() })}
              placeholder={t.onboarding.step6.namePlaceholder}
              placeholderTextColor={Colors.gray}
              returnKeyType="done"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.settings.pet.type}</Text>
            <View style={styles.petTypeRow}>
              {PET_TYPES.map((pt) => (
                <Pressable
                  key={pt}
                  style={[styles.petTypeCard, settings.petType === pt && styles.petTypeCardActive]}
                  onPress={() => settings.update({ petType: pt })}
                >
                  <Text style={styles.petTypeEmoji}>{PET_EMOJIS[pt]}</Text>
                  <Text style={styles.petTypeLabel}>{t.settings.pet.typeLabels[pt]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.settings.pet.colour}</Text>
            <View style={styles.swatchRow}>
              {petSwatches.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.petSwatch,
                    { backgroundColor: color },
                    settings.petColor === color && styles.petSwatchActive,
                  ]}
                  onPress={() => settings.update({ petColor: color })}
                />
              ))}
            </View>
          </View>

          <View style={styles.progress}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.dot, i === 5 && styles.dotActive]} />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t.previous}</Text>
          </Pressable>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: THEMES[settings.colorTheme]?.orange ?? Colors.orange }]}
            onPress={finish}
          >
            <Text style={styles.doneBtnText}>{t.finishBtn}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  top: { alignItems: 'center', gap: Spacing.md },
  iconBadge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: FontSize.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },
  previewWrap: { position: 'relative', height: 190, alignItems: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.orange,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  petTypeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  petTypeCard: {
    flex: 1,
    minWidth: 60,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.offWhite,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  petTypeCardActive: { borderColor: Colors.orange, backgroundColor: Colors.orangeLight },
  petTypeEmoji: { fontSize: 28 },
  petTypeLabel: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  petSwatch: { width: 40, height: 40, borderRadius: Radius.full, borderWidth: 3, borderColor: 'transparent' },
  petSwatchActive: { borderColor: Colors.text },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dotActive: { backgroundColor: Colors.orange, width: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 0 },
  backBtn: { padding: Spacing.md },
  backBtnText: { fontSize: FontSize.md, color: Colors.textLight },
  doneBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadow.card,
  },
  doneBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.lg },
});
