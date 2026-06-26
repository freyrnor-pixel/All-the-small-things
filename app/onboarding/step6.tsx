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
import { FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import ScreenBackground from '@/components/ScreenBackground';
import Button from '@/components/Button';
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
      <ScreenBackground />
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
            <Text style={[styles.heading, { color: theme.text }]}>{t.onboarding.step6.title}</Text>
            <Text style={[styles.sub, { color: theme.textLight }]}>{t.onboarding.step6.subtitle}</Text>
          </View>

          <View style={styles.previewWrap}>
            <Pet completedToday={0} />
          </View>

          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.pet.name}</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.orange, backgroundColor: theme.white }]}
              value={petNameInput}
              onChangeText={setPetNameInput}
              onBlur={() => settings.update({ petName: petNameInput.trim() })}
              placeholder={t.onboarding.step6.namePlaceholder}
              placeholderTextColor={theme.textLight}
              returnKeyType="done"
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.pet.type}</Text>
            <View style={styles.petTypeRow}>
              {PET_TYPES.map((pt) => (
                <Pressable
                  key={pt}
                  style={[
                    styles.petTypeCard,
                    { backgroundColor: theme.grayLight, borderColor: 'transparent' },
                    settings.petType === pt && { borderColor: theme.orange, backgroundColor: theme.orangeLight },
                  ]}
                  onPress={() => settings.update({ petType: pt })}
                >
                  <Text style={styles.petTypeEmoji}>{PET_EMOJIS[pt]}</Text>
                  <Text style={[styles.petTypeLabel, { color: theme.text }]}>{t.settings.pet.typeLabels[pt]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.pet.colour}</Text>
            <View style={styles.swatchRow}>
              {petSwatches.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.petSwatch,
                    { backgroundColor: color, borderColor: 'transparent' },
                    settings.petColor === color && { borderColor: theme.text },
                  ]}
                  onPress={() => settings.update({ petColor: color })}
                />
              ))}
            </View>
          </View>

          <View style={styles.progress}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: theme.grayLight },
                  i === 5 && { ...styles.dotActive, backgroundColor: theme.orange },
                ]}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={t.previous}
            onPress={() => router.back()}
            variant="ghost"
            size="md"
          />
          <Button
            label={t.finishBtn}
            onPress={finish}
            variant="primary"
            size="md"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  top: { alignItems: 'center', gap: Spacing.md },
  iconBadge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: FontSize.xxl, fontFamily: Fonts.semibold, textAlign: 'center' },
  sub: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 24 },
  previewWrap: { position: 'relative', height: 190, alignItems: 'center' },
  card: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, ...Shadow.card },
  fieldLabel: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  input: { borderRadius: Radius.sm, borderWidth: 2, padding: Spacing.md, fontSize: FontSize.lg },
  petTypeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  petTypeCard: { flex: 1, minWidth: 60, alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 2 },
  petTypeEmoji: { fontSize: 28 },
  petTypeLabel: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  petSwatch: { width: 40, height: 40, borderRadius: Radius.full, borderWidth: 3 },
  progress: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: Radius.full },
  dotActive: { width: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.md },
});
