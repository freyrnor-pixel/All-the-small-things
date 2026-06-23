/**
 * settings.tsx — app settings
 *
 * Central settings screen, with an Essentials Mode toggle pinned at the very
 * top, followed by Profile/Language, then four primary group headers —
 * Appearance, Notifications, Work Mode, Data. Cards that don't fit a group
 * header (Accessibility, Motivation, Companion Pet, Shopping List) sit
 * ungrouped between Appearance and Notifications, each carrying its own
 * section title for separation. Each control carries a one-sentence
 * description. Destructive reset actions live in the danger-tinted Data
 * section at the bottom (each confirms via Alert), preceded there by the
 * Test data card. Changing reminder-, notification- or language-related
 * settings re-syncs the scheduled reminders.
 *
 * Connections:
 *   Imports → components/HintCard, components/ScreenBackground, components/ScreenHeader, components/Surface, components/TimePickerWheel, constants/theme, lib/i18n, lib/notifications, lib/reminders, lib/seedTestData, lib/useAppTheme, store/useHabitStore, store/useSettingsStore, store/useShoppingStore, store/useTaskStore
 *   Used by → Expo Router route "/settings"
 *   Data    → useSettingsStore (settings table; incl. essentialsModeEnabled, quietHours*, monthlyBudgetNok); reset actions touch useShoppingStore (shopping_items) + useTaskStore (tasks); re-syncs notifications via syncReminders / syncAllTaskNotifications / syncAllHabitReminders / syncNotificationCategories; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); this screen uses useAppTheme() (not the static Colors palette) so theme/dark-mode apply — keep new colours theme-derived.
 *   - applyAndSync() is the single write path: it updates settings AND fires the right notification re-sync based on which keys changed — route changes through it, not settings.update() directly. Quiet-hours keys re-sync task notifications (so existing reminders honour the new window); a language change also re-registers the interactive notification action button labels via syncNotificationCategories.
 *   - Order top-to-bottom: Essentials toggle → Profile → Language → Appearance group (colour theme, bubble material, dark mode) → Accessibility → Motivation → Companion Pet → Shopping List → Notifications group (reminders, task notifications, persistent overview, quiet hours, holidays, automations link) → Work Mode group → Data group (debug mode toggle first, then test data, then destructive resets last). The debug mode panel itself (annotate-mode pins + bubble-wheel tuning) lives in components/DebugOverlay.tsx, not here.
 *   - Privacy HintCard at the top mirrors the onboarding/privacy trust screen for returning users.
 *   - Companion pet is configured during onboarding step6 by default; this section lets returning users change it later.
 *   - The Automations row navigates to /automations via router.push — it's a plain link, not a control, so it doesn't import useAutomationStore itself.
 *   - Monthly budget (AP-06B) lives at the bottom of the Shopping List card; an empty input means "no budget set" (monthlyBudgetNok = 0), which app/budget.tsx reads as "don't show a progress bar."
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore, Settings, FontSizePref, PetType } from '@/store/useSettingsStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useHabitStore } from '@/store/useHabitStore';
import { syncReminders } from '@/lib/reminders';
import { syncNotificationCategories } from '@/lib/notifications';
import { seedTestData } from '@/lib/seedTestData';
import { useT, getTranslations } from '@/lib/i18n';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { selection, warning, heavy } from '@/lib/haptics'; // W-E: haptic tick on the Essentials toggle
import HintCard from '@/components/HintCard';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import TimePickerWheel from '@/components/TimePickerWheel';
import SectionDivider from '@/components/SectionDivider';
import { FontSize, Radius, Shadow, Spacing, THEMES, ThemeName, MATERIAL_META, MaterialName, getMaterialStyle, hueToCustomColors, hslToHex } from '@/constants/theme';
import { DarkMode } from '@/store/useSettingsStore';
import SwatchPicker from '@/components/SwatchPicker';
import { RadialSwatch, ConicSwatch } from '@/components/GradientSwatch';
import HuePicker from '@/components/HuePicker';

const PET_TYPES: PetType[] = ['cat', 'dog', 'bird', 'fox', 'bunny'];
const PET_EMOJIS: Record<PetType, string> = { cat: '🐱', dog: '🐶', bird: '🐦', fox: '🦊', bunny: '🐰' };

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);
  const monthlyReset = useShoppingStore((s) => s.monthlyReset);
  const clearTasks = useTaskStore((s) => s.clearAll);
  const syncTaskNotifs = useTaskStore((s) => s.syncAllTaskNotifications);
  const syncHabitNotifs = useHabitStore((s) => s.syncAllHabitReminders);
  const t = useT();
  const [name, setName] = useState(settings.userName);
  const [petNameInput, setPetNameInput] = useState(settings.petName);
  const [monthlyDateInput, setMonthlyDateInput] = useState(String(settings.monthlyResetDate));
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState(
    settings.monthlyBudgetNok > 0 ? String(settings.monthlyBudgetNok) : ''
  );

  const DAY_LABELS = t.dayFull;

  // Colour swatches for the pet colour picker — pulled from the active theme palette.
  const petSwatches = [
    theme.orange, theme.green, '#A78BFA', '#F472B6', '#60A5FA', '#34D399',
  ];

  function applyAndSync(patch: Partial<Settings>) {
    settings.update(patch);
    const keys = Object.keys(patch);
    if (keys.some((k) => ['remindersEnabled', 'reminderTime', 'weeklyResetDay', 'monthlyResetDate', 'language'].includes(k))) {
      void syncReminders();
    }
    if (keys.some((k) => ['taskNotificationsEnabled', 'language', 'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd'].includes(k))) {
      syncTaskNotifs();
    }
    if (keys.includes('language')) {
      syncHabitNotifs();
      const tNew = getTranslations(useSettingsStore.getState().language);
      void syncNotificationCategories(tNew.notif.actionDone, tNew.notif.actionRemindLater);
    }
  }

  function confirmReset(label: string, action: () => void) {
    warning();
    Alert.alert(
      t.resetConfirmTitle(label),
      t.resetConfirmBody,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.resetConfirmBtn, style: 'destructive', onPress: () => { heavy(); action(); } },
      ]
    );
  }

  function clearTestData() {
    const taskStore = useTaskStore.getState();
    const shoppingStore = useShoppingStore.getState();
    const habitStore = useHabitStore.getState();

    taskStore.clearAll();
    shoppingStore.resetWeekly();
    shoppingStore.monthlyReset();
    habitStore.habits.forEach((h) => habitStore.remove(h.id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ScreenHeader title={t.settingsTitle} onBack={() => router.back()} bordered />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <HintCard text={t.hints.settings.text} example={t.hints.settings.example} />

        {/* Privacy trust card — mirrors onboarding/privacy for returning users */}
        <View style={[styles.privacyCard, { backgroundColor: theme.greenLight, borderColor: theme.border }]}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.privacyHeadline, { color: theme.text }]}>{t.settings.privacy.headline}</Text>
            <Text style={[styles.privacyLine, { color: theme.textLight }]}>{t.settings.privacy.local}</Text>
            <Text style={[styles.privacyLine, { color: theme.textLight }]}>{t.settings.privacy.free}</Text>
          </View>
        </View>

        {/* W-E: Essentials Mode — pinned at the very top, most prominent. Frames starting simple positively. */}
        <View style={styles.section}>
          <View style={[styles.essentialsCard, { backgroundColor: theme.orangeLight, borderColor: theme.orange }]}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.essentialsLabel, { color: theme.text }]}>{t.config.essentials.label}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.config.essentials.hint}</Text>
              </View>
              <Switch
                value={settings.essentialsModeEnabled}
                onValueChange={(v) => { selection(); settings.update({ essentialsModeEnabled: v }); }}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.essentialsModeEnabled ? theme.orange : theme.gray}
              />
            </View>
          </View>
        </View>

        {/* Profile */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionProfile}</Text>
          <Surface style={styles.card}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.yourName}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder={t.namePlaceholder}
              placeholderTextColor={theme.gray}
              onBlur={() => settings.update({ userName: name })}
              returnKeyType="done"
            />
            <Text style={[styles.descText, { color: theme.textLight }]}>{t.config.desc.name}</Text>
          </Surface>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionLanguage}</Text>
          <Surface style={styles.card}>
            <View style={styles.langRow}>
              {(['no', 'en'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  style={[
                    styles.langChip,
                    { backgroundColor: theme.grayLight },
                    settings.language === lang && { backgroundColor: theme.orange },
                  ]}
                  onPress={() => applyAndSync({ language: lang })}
                >
                  <Text style={styles.langFlag}>{lang === 'no' ? '🇳🇴' : '🇬🇧'}</Text>
                  <Text style={[
                    styles.langText,
                    { color: theme.text },
                    settings.language === lang && { color: '#FFFFFF' },
                  ]}>
                    {lang === 'no' ? t.norwegian : t.english}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.descText, { color: theme.textLight }]}>{t.config.desc.language}</Text>
          </Surface>
        </View>

        {/* ===== APPEARANCE ===== */}
        <Text style={[styles.groupHeader, { color: theme.text }]}>{t.config.sections.appearance}</Text>

        {/* Color theme (Appearance) — 2-column grid, custom theme color pickers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionColorTheme}</Text>
          <Surface style={styles.card}>
            <SwatchPicker
              items={(Object.keys(THEMES) as ThemeName[]).map((key) => ({ key, label: t.themeNames[key] }))}
              value={settings.colorTheme}
              onChange={(key) => {
                settings.update({ colorTheme: key as ThemeName });
                if (key === 'gothic') settings.update({ darkMode: 'on' });
              }}
              renderSwatch={(key) => {
                const th = THEMES[key as ThemeName];
                if (key === 'custom') {
                  const wheelColors = Array.from({ length: 24 }, (_, i) => hslToHex((i / 24), 0.65, 0.55));
                  return (
                    <ConicSwatch size={54} colors={wheelColors} />
                  );
                }
                return (
                  <RadialSwatch color={th.orange} size={54} />
                );
              }}
            />

            {/* Custom theme hue picker — saturation/lightness are fixed by hueToCustomColors() */}
            {settings.colorTheme === 'custom' && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.customThemeHue}</Text>
                <HuePicker
                  value={settings.customHue}
                  onChange={(hue) => {
                    const { primary, secondary } = hueToCustomColors(hue);
                    settings.update({ customHue: hue, customPrimaryColor: primary, customSecondaryColor: secondary });
                  }}
                />
              </>
            )}

            <Text style={[styles.descText, { color: theme.textLight }]}>{t.config.desc.theme}</Text>
          </Surface>
        </View>

        {/* Bubble finish (Appearance) — menu bubble/FAB surface material, independent of colour theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionBubbleMaterial}</Text>
          <Surface style={styles.card}>
            <SwatchPicker
              items={(Object.keys(MATERIAL_META) as MaterialName[]).map((key) => ({ key, label: t.materialNames[key] }))}
              value={settings.bubbleMaterial}
              onChange={(key) => settings.update({ bubbleMaterial: key as MaterialName })}
              renderSwatch={(key) => {
                const preview = getMaterialStyle(theme.orange, key as MaterialName);
                return (
                  <View
                    style={[
                      styles.materialSwatch,
                      {
                        backgroundColor: preview.backgroundColor,
                        borderWidth: preview.borderWidth,
                        borderColor: preview.borderColor,
                        borderTopColor: preview.borderTopColor,
                        borderBottomColor: preview.borderBottomColor,
                        shadowOpacity: preview.shadowOpacity,
                        shadowRadius: preview.shadowRadius,
                        elevation: preview.elevation,
                      },
                    ]}
                  >
                    <View style={[styles.materialSheen, { backgroundColor: preview.sheenColor }]} />
                  </View>
                );
              }}
            />
            <Text style={[styles.descText, { color: theme.textLight }]}>{t.config.desc.material}</Text>
          </Surface>
        </View>

        {/* Dark mode (Appearance) — three options: Light, Dark, Follow System */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionAppearance}</Text>
          <Surface style={styles.card}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.darkModeLabel}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['off', 'system', 'on'] as DarkMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.seg, settings.darkMode === mode && [styles.segActive, { backgroundColor: theme.white }]]}
                  onPress={() => settings.update({ darkMode: mode })}
                >
                  <Text style={[
                    styles.segText,
                    { color: theme.textLight },
                    settings.darkMode === mode && { color: theme.text, fontWeight: '600' },
                  ]}>
                    {mode === 'off' ? t.darkModeOff : mode === 'on' ? t.darkModeOn : t.darkModeSystem}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.descText, { color: theme.textLight }]}>{t.config.desc.darkMode}</Text>
          </Surface>
        </View>

        {/* Accessibility (Proposal 4) — Appearance group */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.settings.accessibility.title}</Text>
          <Surface style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.settings.accessibility.reducedMotion}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.settings.accessibility.reducedMotionHint}</Text>
              </View>
              <Switch
                value={settings.reducedMotion}
                onValueChange={(v) => settings.update({ reducedMotion: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.reducedMotion ? theme.orange : theme.gray}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.accessibility.fontSize}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['small', 'default', 'large'] as FontSizePref[]).map((size) => (
                <Pressable
                  key={size}
                  style={[styles.seg, settings.fontSize === size && [styles.segActive, { backgroundColor: theme.white }]]}
                  onPress={() => settings.update({ fontSize: size })}
                >
                  <Text style={[
                    styles.segText,
                    { color: theme.textLight },
                    settings.fontSize === size && { color: theme.text, fontWeight: '600' },
                  ]}>
                    {size === 'small'
                      ? t.settings.accessibility.fontSizeSmall
                      : size === 'large'
                        ? t.settings.accessibility.fontSizeLarge
                        : t.settings.accessibility.fontSizeDefault}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.settings.accessibility.leftHanded}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.settings.accessibility.leftHandedHint}</Text>
              </View>
              <Switch
                value={settings.leftHanded}
                onValueChange={(v) => settings.update({ leftHanded: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.leftHanded ? theme.orange : theme.gray}
              />
            </View>
          </Surface>
        </View>

        {/* Motivation (Appearance group — home-screen embellishments) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionMotivation}</Text>
          <Surface style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.showPointsLabel}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.config.desc.points}</Text>
              </View>
              <Switch
                value={settings.showPoints}
                onValueChange={(v) => settings.update({ showPoints: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.showPoints ? theme.orange : theme.gray}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.showHintsLabel}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.config.desc.hints}</Text>
              </View>
              <Switch
                value={settings.showHints}
                onValueChange={(v) => settings.update({ showHints: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.showHints ? theme.orange : theme.gray}
              />
            </View>
          </Surface>
        </View>

        {/* Companion pet (Proposal 6) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.settings.pet.toggle}</Text>
          <Surface style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.settings.pet.toggle}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.settings.pet.toggleSubtitle}</Text>
              </View>
              <Switch
                value={settings.petEnabled}
                onValueChange={(v) => settings.update({ petEnabled: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.petEnabled ? theme.orange : theme.gray}
              />
            </View>

            {settings.petEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />

                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.pet.name}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
                  value={petNameInput}
                  onChangeText={setPetNameInput}
                  placeholder={t.settings.pet.namePlaceholder}
                  placeholderTextColor={theme.gray}
                  onBlur={() => settings.update({ petName: petNameInput.trim() })}
                  returnKeyType="done"
                />

                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />

                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.pet.type}</Text>
                <View style={styles.petTypeRow}>
                  {PET_TYPES.map((pt) => (
                    <Pressable
                      key={pt}
                      style={[
                        styles.petTypeCard,
                        { borderColor: settings.petType === pt ? theme.orange : theme.grayLight },
                        { backgroundColor: settings.petType === pt ? theme.orangeLight : theme.offWhite },
                      ]}
                      onPress={() => settings.update({ petType: pt })}
                    >
                      <Text style={styles.petTypeEmoji}>{PET_EMOJIS[pt]}</Text>
                      <Text style={[styles.petTypeLabel, { color: settings.petType === pt ? theme.brown : theme.textLight }]}>
                        {t.settings.pet.typeLabels[pt]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />

                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.pet.colour}</Text>
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
              </>
            )}
          </Surface>
        </View>

        {/* Shopping list — its own settings, not a notification */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionShopping}</Text>
          <Surface style={styles.card}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.defaultListType}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['weekly', 'monthly'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.seg, settings.shoppingListMode === mode && [styles.segActive, { backgroundColor: theme.white }]]}
                  onPress={() => settings.update({ shoppingListMode: mode })}
                >
                  <Text style={[
                    styles.segText,
                    { color: theme.textLight },
                    settings.shoppingListMode === mode && { color: theme.text, fontWeight: '600' },
                  ]}>
                    {mode === 'weekly' ? t.weekly : t.monthly}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />

            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.weeklyResetDay}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.xs }}>
              <View style={styles.dayRow}>
                {DAY_LABELS.map((label, i) => (
                  <Pressable
                    key={i}
                    style={[
                      styles.dayChip,
                      { backgroundColor: theme.grayLight },
                      settings.weeklyResetDay === i && { backgroundColor: theme.orange },
                    ]}
                    onPress={() => applyAndSync({ weeklyResetDay: i })}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: theme.text },
                      settings.weeklyResetDay === i && { color: '#FFFFFF' },
                    ]}>
                      {label.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />

            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.monthlyResetDate}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={monthlyDateInput}
              onChangeText={(v) => {
                setMonthlyDateInput(v);
                const n = parseInt(v, 10);
                if (!isNaN(n) && n >= 1 && n <= 31) {
                  applyAndSync({ monthlyResetDate: n });
                }
              }}
              onBlur={() => {
                const n = parseInt(monthlyDateInput, 10);
                if (isNaN(n) || n < 1 || n > 31) {
                  setMonthlyDateInput(String(settings.monthlyResetDate));
                }
              }}
              keyboardType="number-pad"
              placeholder="1–31"
              placeholderTextColor={theme.gray}
              maxLength={2}
            />
            <Text style={[styles.paydayHint, { color: theme.textLight }]}>{t.monthlyDateInputHint}</Text>

            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />

            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.settings.monthlyBudget.label}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={monthlyBudgetInput}
              onChangeText={(v) => {
                setMonthlyBudgetInput(v);
                if (v.trim() === '') {
                  applyAndSync({ monthlyBudgetNok: 0 });
                  return;
                }
                const n = parseFloat(v.replace(',', '.'));
                if (!isNaN(n) && n >= 0) {
                  applyAndSync({ monthlyBudgetNok: n });
                }
              }}
              onBlur={() => {
                const n = parseFloat(monthlyBudgetInput.replace(',', '.'));
                if (monthlyBudgetInput.trim() !== '' && (isNaN(n) || n < 0)) {
                  setMonthlyBudgetInput(settings.monthlyBudgetNok > 0 ? String(settings.monthlyBudgetNok) : '');
                }
              }}
              keyboardType="number-pad"
              placeholder={t.settings.monthlyBudget.placeholder}
              placeholderTextColor={theme.gray}
              maxLength={6}
            />
            <Text style={[styles.paydayHint, { color: theme.textLight }]}>{t.settings.monthlyBudget.hint}</Text>
          </Surface>
        </View>

        {/* ===== NOTIFICATIONS ===== */}
        <SectionDivider />
        <Text style={[styles.groupHeader, { color: theme.text }]}>{t.config.sections.notifications}</Text>

        {/* Reminders */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionNotifications}</Text>
          <Surface style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.weeklyReminders}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.config.desc.weeklyReminders}</Text>
              </View>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={(v) => applyAndSync({ remindersEnabled: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.remindersEnabled ? theme.orange : theme.gray}
              />
            </View>
            {settings.remindersEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.reminderTimeLabel}</Text>
                <TimePickerWheel
                  value={settings.reminderTime || '08:00'}
                  onChange={(v) => applyAndSync({ reminderTime: v })}
                  theme={theme}
                />
              </>
            )}
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.taskNotifications}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.taskNotificationsHint}</Text>
              </View>
              <Switch
                value={settings.taskNotificationsEnabled}
                onValueChange={(v) => applyAndSync({ taskNotificationsEnabled: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.taskNotificationsEnabled ? theme.orange : theme.gray}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.persistentNotifLabel}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.persistentNotifHint}</Text>
              </View>
              <Switch
                value={settings.persistentNotifEnabled}
                onValueChange={(v) => settings.update({ persistentNotifEnabled: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.persistentNotifEnabled ? theme.orange : theme.gray}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.settings.quietHours.label}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.settings.quietHours.hint}</Text>
              </View>
              <Switch
                value={settings.quietHoursEnabled}
                onValueChange={(v) => applyAndSync({ quietHoursEnabled: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.quietHoursEnabled ? theme.orange : theme.gray}
              />
            </View>
            {settings.quietHoursEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.workHoursFrom}</Text>
                <TimePickerWheel
                  value={settings.quietHoursStart || '21:00'}
                  onChange={(v) => applyAndSync({ quietHoursStart: v })}
                  theme={theme}
                />
                <Text style={[styles.fieldLabel, { color: theme.textLight, marginTop: Spacing.md }]}>{t.workHoursTo}</Text>
                <TimePickerWheel
                  value={settings.quietHoursEnd || '08:00'}
                  onChange={(v) => applyAndSync({ quietHoursEnd: v })}
                  theme={theme}
                />
              </>
            )}
          </Surface>
        </View>

        {/* Holidays */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionHolidays}</Text>
          <Surface style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.holidaysEnabledLabel}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.holidaysHint}</Text>
              </View>
              <Switch
                value={settings.holidaysEnabled}
                onValueChange={(v) => settings.update({ holidaysEnabled: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.holidaysEnabled ? theme.orange : theme.gray}
              />
            </View>
          </Surface>
        </View>

        {/* Automations — hidden for now, not a near-term feature (see design handoff Q1) */}

        {/* ===== WORK MODE ===== */}
        <SectionDivider />
        <Text style={[styles.groupHeader, { color: theme.text }]}>{t.config.sections.workMode}</Text>

        {/* Work mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionWorkMode}</Text>
          <Surface style={styles.card}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.workModeDesc}</Text>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>{t.workModeActive}</Text>
              <Switch
                value={settings.workModeEnabled}
                onValueChange={(v) => settings.update({ workModeEnabled: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.workModeEnabled ? theme.orange : theme.gray}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.autoActivate}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.autoActivateHint}</Text>
              </View>
              <Switch
                value={settings.enforceWorkHours}
                onValueChange={(v) => settings.update({ enforceWorkHours: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.enforceWorkHours ? theme.orange : theme.gray}
              />
            </View>
            {settings.enforceWorkHours && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.workHoursFrom}</Text>
                <TimePickerWheel
                  value={settings.workHoursStart || '09:00'}
                  onChange={(v) => settings.update({ workHoursStart: v })}
                  theme={theme}
                />
                <Text style={[styles.fieldLabel, { color: theme.textLight, marginTop: Spacing.md }]}>{t.workHoursTo}</Text>
                <TimePickerWheel
                  value={settings.workHoursEnd || '17:00'}
                  onChange={(v) => settings.update({ workHoursEnd: v })}
                  theme={theme}
                />
              </>
            )}
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.workDaysLabel}</Text>
            <View style={styles.dayRow}>
              {DAY_LABELS.map((label, i) => {
                const active = settings.workDays.includes(i);
                return (
                  <Pressable
                    key={i}
                    style={[
                      styles.dayChip,
                      { backgroundColor: theme.grayLight },
                      active && { backgroundColor: theme.orange },
                    ]}
                    onPress={() => {
                      const next = active
                        ? settings.workDays.filter((d) => d !== i)
                        : [...settings.workDays, i].sort();
                      settings.update({ workDays: next });
                    }}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: theme.text },
                      active && { color: '#FFFFFF' },
                    ]}>
                      {label.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Surface>
        </View>

        {/* ===== DATA (destructive resets — separated, danger-tinted) ===== */}
        <SectionDivider />
        <Text style={[styles.groupHeader, { color: theme.danger }]}>{t.config.sections.data}</Text>

        {/* Debug mode — feedback pins + bubble-wheel tuning overlay (components/DebugOverlay.tsx) */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.debug.toggleLabel}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.debug.toggleHint}</Text>
              </View>
              <Switch
                value={settings.debugModeEnabled}
                onValueChange={(v) => { selection(); settings.update({ debugModeEnabled: v }); }}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.debugModeEnabled ? theme.orange : theme.gray}
              />
            </View>
          </View>
        </View>

        {/* Test data */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionTestData}</Text>
          <View style={[styles.card, { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.green }]}>
            <Text style={[styles.descText, { color: theme.textLight, marginBottom: Spacing.sm, marginTop: 0 }]}>{t.loadTestDataDesc}</Text>
            <Pressable
              style={styles.dangerBtn}
              onPress={() => {
                seedTestData();
                Alert.alert('', t.loadTestDataDone);
              }}
            >
              <Text style={[styles.dangerBtnText, { color: theme.green }]}>{t.loadTestData}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Text style={[styles.descText, { color: theme.textLight, marginBottom: Spacing.sm }]}>{t.removeTestDataDesc}</Text>
            <Pressable
              style={styles.dangerBtn}
              onPress={() => confirmReset(t.removeTestData.toLowerCase(), () => {
                clearTestData();
                Alert.alert('', t.removeTestDataDone);
              })}
            >
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.removeTestData}</Text>
            </Pressable>
          </View>
        </View>

        {/* Reset data */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionReset}</Text>
          <View style={[styles.card, { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.dangerLight }]}>
            <Text style={[styles.descText, { color: theme.danger, marginBottom: Spacing.sm }]}>{t.config.desc.dataNote}</Text>
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetWeekly.toLowerCase(), resetWeekly)}>
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.resetWeekly}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetMonthly.toLowerCase(), monthlyReset)}>
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.resetMonthly}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetTasks.toLowerCase(), clearTasks)}>
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.resetTasks}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Pressable
              style={styles.dangerBtn}
              onPress={() =>
                confirmReset(t.resetOnboarding.toLowerCase(), () => {
                  settings.update({ setupComplete: false });
                  router.replace('/onboarding/language');
                })
              }
            >
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.resetOnboarding}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  // W-E: primary group header (Appearance · Notifications · Work Mode · Data)
  groupHeader: { fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.sm },
  // W-E: one-sentence description under a setting
  descText: { fontSize: FontSize.xs, marginTop: Spacing.sm, lineHeight: 18 },
  // W-E: Essentials Mode hero card
  essentialsCard: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 2, ...Shadow.card },
  essentialsLabel: { fontSize: FontSize.lg, fontWeight: '700' },
  card: { borderRadius: Radius.md, padding: Spacing.md, ...Shadow.card },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  input: { borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3, gap: 3 },
  seg: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  segActive: { ...Shadow.card },
  segText: { fontSize: FontSize.sm, fontWeight: '600' },
  divider: { height: 1, marginVertical: Spacing.md },
  dayRow: { flexDirection: 'row', gap: Spacing.xs },
  dayChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  dayText: { fontSize: FontSize.xs, fontWeight: '600' },
  paydayHint: { fontSize: FontSize.xs, marginTop: Spacing.xs, fontStyle: 'italic' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.md, fontWeight: '500' },
  switchHint: { fontSize: FontSize.xs, marginTop: 2 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navRowArrow: { fontSize: FontSize.xl, fontWeight: '700' },
  dangerBtn: { paddingVertical: Spacing.sm },
  dangerBtnText: { fontSize: FontSize.md, fontWeight: '600' },
  materialSwatch: { width: '100%', height: '100%', borderRadius: Radius.full, overflow: 'hidden' },
  materialSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', borderRadius: Radius.full },
  langRow: { flexDirection: 'row', gap: Spacing.md },
  langChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.md, justifyContent: 'center',
  },
  langFlag: { fontSize: 24 },
  langText: { fontSize: FontSize.md, fontWeight: '600' },
  // Privacy card
  privacyCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1,
  },
  privacyIcon: { fontSize: 28 },
  privacyHeadline: { fontSize: FontSize.sm, fontWeight: '700' },
  privacyLine: { fontSize: FontSize.xs, lineHeight: 18 },
  // Pet styles
  petTypeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  petTypeCard: {
    flex: 1, minWidth: 56, borderWidth: 2, borderRadius: Radius.md,
    padding: Spacing.xs, alignItems: 'center', gap: 2,
  },
  petTypeEmoji: { fontSize: 28 },
  petTypeLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  petSwatch: {
    width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2,
    borderColor: 'transparent',
  },
  petSwatchActive: { borderColor: '#333', borderWidth: 3 },
});
