/**
 * settings.tsx — app settings
 *
 * Tabbed settings screen — a tab bar (Generelt | Lister | Varsler | Utseende) sits under
 * the header; each tab is its own scroll of cards (local `tab` state, no router routes).
 *
 * - Generelt: Focus mode toggle (formerly "Essentials Mode") → Profil (name + language,
 *   merged into one card) → Jobb-modus (work mode, auto-activate + hours + work days,
 *   plus Norske helligdager) → Tilgjengelighet (reduced motion, font size, left-handed) →
 *   Motivasjon (points, hints, Følgeven/pet-enable toggle) → Companion Pet config (shown
 *   when pet enabled) → Data group (debug mode, test data, destructive resets) at the bottom.
 * - Lister: the Shopping List card (default list type, weekly/monthly reset, monthly budget)
 *   — unchanged content, just relocated to its own tab.
 * - Varsler: Ukentlig (weekly reminder + time) → Generelle (merged plan notifications
 *   toggle driving both task- and habit-notification flags together, persistent daily
 *   overview, quiet hours).
 * - Utseende: Fargetema (colour theme + custom hue), Materiale (bubble material), Mørk
 *   modus (dark mode 3-way).
 *
 * Each control carries a one-sentence description. Destructive reset actions live in the
 * danger-tinted Data card (each confirms via showAppModal), preceded there by the Test data
 * card. Changing reminder-, notification- or language-related settings re-syncs the
 * scheduled reminders.
 *
 * Connections:
 *   Imports → components/AppModal, components/BottomNav, components/ScreenHeader, components/SiteSwipeView, components/Surface, components/TimePickerWheel, constants/theme, lib/i18n, lib/notifications, lib/reminders, lib/seedTestData, lib/useAppTheme, store/useHabitStore, store/useSettingsStore, store/useShoppingStore, store/useTaskStore
 *   Used by → Expo Router route "/settings"
 *   Data    → useSettingsStore (settings table; incl. essentialsModeEnabled, quietHours*, monthlyBudgetNok); reset actions touch useShoppingStore (shopping_items) + useTaskStore (tasks); re-syncs notifications via syncReminders / syncAllTaskNotifications / syncAllHabitReminders / syncNotificationCategories; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); this screen uses useAppTheme() (not the static Colors palette) so theme/dark-mode apply — keep new colours theme-derived.
 *   - applyAndSync() is the single write path: it updates settings AND fires the right notification re-sync based on which keys changed — route changes through it, not settings.update() directly. Quiet-hours keys re-sync task notifications (so existing reminders honour the new window); language or habitNotificationsEnabled changes re-sync habit reminders; a language change also re-registers the interactive notification action button labels via syncNotificationCategories.
 *   - The "Planvarsler"/Plan notifications toggle on the Varsler tab writes both
 *     `taskNotificationsEnabled` and `habitNotificationsEnabled` together — there is no
 *     separate UI for habit notifications anymore; `taskNotificationsEnabled` is read as the
 *     display value for both since they're always kept equal.
 *   - `essentialsModeEnabled` is the underlying field/DB column name (unchanged, to avoid a
 *     migration) — its user-facing label is now "Focus mode" / "Fokus-modus", not "Essentials
 *     Mode"/"Start simple".
 *   - The Privacy trust card that used to sit at the top of this screen was removed — it's
 *     moving to a future "About app" screen (not built yet).
 *   - Companion pet is configured during onboarding step6 by default; this section lets returning users change it later. The pet's enable switch lives in the Motivasjon card now (as "Følgeven"); the Companion Pet card below it only renders the name/type/colour config.
 *   - Automations no longer has a settings row — it's reached directly via BottomNav (app/automations.tsx).
 *   - Monthly budget (AP-06B) lives at the bottom of the Shopping List card; an empty input means "no budget set" (monthlyBudgetNok = 0), which app/budget.tsx reads as "don't show a progress bar."
 *   - Design system pass: fontWeight string literals replaced with Fonts.* tokens; dropped
 *     unused back/title styles (superseded by ScreenHeader).
 */
import React, { useState } from 'react';
import {
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
import { showAppModal } from '@/components/AppModal';
import Surface from '@/components/Surface';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import TimePickerWheel from '@/components/TimePickerWheel';
import SectionDivider from '@/components/SectionDivider';
import { FontSize, Fonts, Radius, Shadow, Spacing, THEMES, ThemeName, MATERIAL_META, MaterialName, getMaterialStyle, hueToCustomColors, hslToHex } from '@/constants/theme';
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

  // Form dirty state
  const [dirtyName, setDirtyName] = useState(false);
  const [dirtyMonthlyDate, setDirtyMonthlyDate] = useState(false);
  const [dirtyMonthlyBudget, setDirtyMonthlyBudget] = useState(false);
  const [dirtyWorkDays, setDirtyWorkDays] = useState(false);
  const [workDaysTemp, setWorkDaysTemp] = useState(settings.workDays);
  const [dirtyWeeklyReset, setDirtyWeeklyReset] = useState(false);
  const [weeklyResetTemp, setWeeklyResetTemp] = useState(settings.weeklyResetDay);

  type SettingsTab = 'generelt' | 'lister' | 'varsler' | 'utseende';
  const [tab, setTab] = useState<SettingsTab>('generelt');
  const TABS: { key: SettingsTab; label: string }[] = [
    { key: 'generelt', label: t.config.tabs.general },
    { key: 'lister', label: t.config.tabs.lists },
    { key: 'varsler', label: t.config.tabs.notifications },
    { key: 'utseende', label: t.config.tabs.appearance },
  ];

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
    if (keys.includes('language') || keys.includes('habitNotificationsEnabled')) {
      syncHabitNotifs();
      if (keys.includes('language')) {
        const tNew = getTranslations(useSettingsStore.getState().language);
        void syncNotificationCategories(tNew.notif.actionDone, tNew.notif.actionRemindLater);
      }
    }
  }

  function confirmReset(label: string, action: () => void) {
    warning();
    showAppModal(
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

  const isDirty = dirtyName || dirtyMonthlyDate || dirtyMonthlyBudget || dirtyWorkDays || dirtyWeeklyReset;

  function handleSave() {
    if (dirtyName) {
      applyAndSync({ userName: name });
      setDirtyName(false);
    }
    if (dirtyMonthlyDate) {
      const n = parseInt(monthlyDateInput, 10);
      if (!isNaN(n) && n >= 1 && n <= 31) {
        applyAndSync({ monthlyResetDate: n });
        setDirtyMonthlyDate(false);
      }
    }
    if (dirtyMonthlyBudget) {
      if (monthlyBudgetInput.trim() === '') {
        applyAndSync({ monthlyBudgetNok: 0 });
      } else {
        const n = parseFloat(monthlyBudgetInput.replace(',', '.'));
        if (!isNaN(n) && n >= 0) {
          applyAndSync({ monthlyBudgetNok: n });
        }
      }
      setDirtyMonthlyBudget(false);
    }
    if (dirtyWorkDays) {
      applyAndSync({ workDays: workDaysTemp });
      setDirtyWorkDays(false);
    }
    if (dirtyWeeklyReset) {
      applyAndSync({ weeklyResetDay: weeklyResetTemp });
      setDirtyWeeklyReset(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={t.settingsTitle}
        onBack={() => router.back()}
        bordered
        right={
          isDirty ? (
            <Pressable
              onPress={handleSave}
              style={[
                styles.savePill,
                { backgroundColor: theme.orange, borderColor: theme.orange },
              ]}
            >
              <Text style={[styles.savePillText, { color: theme.white }]}>
                {t.save}
              </Text>
            </Pressable>
          ) : (
            <View
              style={[
                styles.savePill,
                { backgroundColor: theme.orange, borderColor: theme.orange, opacity: 0.5 },
              ]}
            >
              <Text style={[styles.savePillText, { color: theme.white }]}>
                {t.save}
              </Text>
            </View>
          )
        }
      />

      <View style={[styles.tabsRow, { borderBottomColor: theme.grayLight }]}>
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <Pressable
              key={tb.key}
              style={[styles.tabItem, active && { borderBottomColor: theme.orange, borderBottomWidth: 2 }]}
              onPress={() => setTab(tb.key)}
            >
              <Text style={[
                styles.tabLabel,
                { color: active ? theme.orange : theme.textLight },
                active && { fontFamily: Fonts.bold },
              ]}>
                {tb.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SiteSwipeView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {tab === 'generelt' && (
          <>
            {/* Focus mode — formerly "Essentials Mode" */}
            <View style={styles.section}>
              <View style={[styles.essentialsCard, { backgroundColor: theme.orangeLight, borderColor: theme.orange }]}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: Spacing.md }}>
                    <Text style={[styles.essentialsLabel, { color: theme.text }]}>{t.config.essentials.label}</Text>
                    <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.config.essentials.hint}</Text>
                  </View>
                  <Switch
                    value={settings.essentialsModeEnabled}
                    onValueChange={(v) => {
                      selection();
                      settings.update({ essentialsModeEnabled: v });
                    }}
                    trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                    thumbColor={settings.essentialsModeEnabled ? theme.orange : theme.gray}
                  />
                </View>
              </View>
            </View>

            {/* PROFIL — name + language merged into one card */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.sectionProfile}</Text>
              <Surface style={styles.card}>
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.yourName}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setDirtyName(v !== settings.userName);
                  }}
                  placeholder={t.namePlaceholder}
                  placeholderTextColor={theme.gray}
                  returnKeyType="done"
                />
                <Text style={[styles.descText, { color: theme.textLight }]}>{t.config.desc.name}</Text>

                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />

                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.sectionLanguage}</Text>
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
                        settings.language === lang && { color: theme.white },
                      ]}>
                        {lang === 'no' ? t.norwegian : t.english}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.descText, { color: theme.textLight }]}>{t.config.desc.language}</Text>
              </Surface>
            </View>

            {/* JOBB-MODUS — work mode + holidays (moved here from the old Notifications group) */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.config.sections.workMode}</Text>
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
                    <View style={styles.workHoursRow}>
                      <View style={styles.workHoursCol}>
                        <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.workHoursFrom}</Text>
                        <TimePickerWheel
                          value={settings.workHoursStart || '09:00'}
                          onChange={(v) => settings.update({ workHoursStart: v })}
                          theme={theme}
                          size="compact"
                        />
                      </View>
                      <View style={styles.workHoursCol}>
                        <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.workHoursTo}</Text>
                        <TimePickerWheel
                          value={settings.workHoursEnd || '17:00'}
                          onChange={(v) => settings.update({ workHoursEnd: v })}
                          theme={theme}
                          size="compact"
                        />
                      </View>
                    </View>
                  </>
                )}
                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
                <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.workDaysLabel}</Text>
                <View style={[styles.dayRow, styles.workDayRow]}>
                  {DAY_LABELS.map((label, i) => {
                    const active = workDaysTemp.includes(i);
                    return (
                      <Pressable
                        key={i}
                        style={[
                          styles.dayChip,
                          styles.workDayChip,
                          { backgroundColor: theme.grayLight },
                          active && { backgroundColor: theme.orange },
                        ]}
                        onPress={() => {
                          const next = active
                            ? workDaysTemp.filter((d) => d !== i)
                            : [...workDaysTemp, i].sort();
                          setWorkDaysTemp(next);
                          setDirtyWorkDays(JSON.stringify(next) !== JSON.stringify(settings.workDays));
                        }}
                      >
                        <Text style={[
                          styles.dayText,
                          { color: theme.text },
                          active && { color: theme.white },
                        ]}>
                          {label.slice(0, 3)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
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

            {/* TILGJENGELIGHET */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.settings.accessibility.title}</Text>
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
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: Spacing.md }}>
                    <Text style={[styles.switchLabel, { color: theme.text }]}>{t.settings.accessibility.particles}</Text>
                    <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.settings.accessibility.particlesHint}</Text>
                  </View>
                  <Switch
                    value={settings.particlesEnabled}
                    onValueChange={(v) => settings.update({ particlesEnabled: v })}
                    trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                    thumbColor={settings.particlesEnabled ? theme.orange : theme.gray}
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
                        settings.fontSize === size && { color: theme.text, fontFamily: Fonts.semibold },
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

            {/* MOTIVASJON — points, hints, Følgeven (pet-enable toggle only) */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.sectionMotivation}</Text>
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
                <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
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
              </Surface>
            </View>

            {/* Companion pet config — name/type/colour, shown once Følgeven is enabled */}
            {settings.petEnabled && (
              <View style={styles.section}>
                <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.settings.pet.toggle}</Text>
                <Surface style={styles.card}>
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
                          settings.petColor === color && [styles.petSwatchActive, { borderColor: theme.text }],
                        ]}
                        onPress={() => settings.update({ petColor: color })}
                      />
                    ))}
                  </View>
                </Surface>
              </View>
            )}

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
                    showAppModal('', t.loadTestDataDone);
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
                    showAppModal('', t.removeTestDataDone);
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
          </>
        )}

        {tab === 'lister' && (
          <View style={styles.section}>
            <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.sectionShopping}</Text>
            <Surface style={styles.card}>
              <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.weeklyResetDay}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.xs }}>
                <View style={styles.dayRow}>
                  {DAY_LABELS.map((label, i) => (
                    <Pressable
                      key={i}
                      style={[
                        styles.dayChip,
                        { backgroundColor: theme.grayLight },
                        weeklyResetTemp === i && { backgroundColor: theme.orange },
                      ]}
                      onPress={() => {
                        setWeeklyResetTemp(i);
                        setDirtyWeeklyReset(i !== settings.weeklyResetDay);
                      }}
                    >
                      <Text style={[
                        styles.dayText,
                        { color: theme.text },
                        weeklyResetTemp === i && { color: '#FFFFFF' },
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
                  setDirtyMonthlyDate(v !== String(settings.monthlyResetDate) && !isNaN(n) && n >= 1 && n <= 31);
                }}
                onBlur={() => {
                  const n = parseInt(monthlyDateInput, 10);
                  if (isNaN(n) || n < 1 || n > 31) {
                    setMonthlyDateInput(String(settings.monthlyResetDate));
                    setDirtyMonthlyDate(false);
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
                  const isDirty = v !== (settings.monthlyBudgetNok > 0 ? String(settings.monthlyBudgetNok) : '');
                  setDirtyMonthlyBudget(isDirty);
                }}
                onBlur={() => {
                  const n = parseFloat(monthlyBudgetInput.replace(',', '.'));
                  if (monthlyBudgetInput.trim() !== '' && (isNaN(n) || n < 0)) {
                    setMonthlyBudgetInput(settings.monthlyBudgetNok > 0 ? String(settings.monthlyBudgetNok) : '');
                    setDirtyMonthlyBudget(false);
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
        )}

        {tab === 'varsler' && (
          <>
            {/* UKENTLIG */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.weeklyReminders}</Text>
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
              </Surface>
            </View>

            {/* GENERELLE — merged plan notifications (task+habit together), daily overview, quiet hours */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.config.sections.notifications}</Text>
              <Surface style={styles.card}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: Spacing.md }}>
                    <Text style={[styles.switchLabel, { color: theme.text }]}>{t.taskNotifications}</Text>
                    <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.taskNotificationsHint}</Text>
                  </View>
                  <Switch
                    value={settings.taskNotificationsEnabled}
                    onValueChange={(v) => applyAndSync({ taskNotificationsEnabled: v, habitNotificationsEnabled: v })}
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
          </>
        )}

        {tab === 'utseende' && (
          <>
            {/* FARGETEMA */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.sectionColorTheme}</Text>
              <Surface style={styles.card}>
                <SwatchPicker
                  items={(Object.keys(THEMES) as ThemeName[]).map((key) => ({ key, label: t.themeNames[key] }))}
                  value={settings.colorTheme}
                  onChange={(key) => {
                    settings.update({ colorTheme: key as ThemeName });
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
              </Surface>
            </View>

            {/* MATERIALE */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.sectionBubbleMaterial}</Text>
              <Surface style={styles.card}>
                <SwatchPicker
                  items={(Object.keys(MATERIAL_META) as MaterialName[]).map((key) => ({ key, label: t.materialNames[key] }))}
                  value={settings.bubbleMaterial}
                  onChange={(key) => {
                    settings.update({ bubbleMaterial: key as MaterialName });
                  }}
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
              </Surface>
            </View>

            {/* LIGHT/DARK MODE */}
            <View style={styles.section}>
              <Text style={[styles.tabSectionLabel, { color: theme.textLight }]}>{t.lightDarkModeLabel}</Text>
              <Surface style={styles.card}>
                <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
                  {(['off', 'system', 'on'] as DarkMode[]).map((mode) => (
                    <Pressable
                      key={mode}
                      style={[styles.seg, settings.darkMode === mode && [styles.segActive, { backgroundColor: theme.white }]]}
                      onPress={() => {
                        settings.update({ darkMode: mode });
                      }}
                    >
                      <Text style={[
                        styles.segText,
                        { color: theme.textLight },
                        settings.darkMode === mode && { color: theme.text, fontFamily: Fonts.semibold },
                      ]}>
                        {mode === 'off' ? t.darkModeOff : mode === 'on' ? t.darkModeOn : t.darkModeSystem}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Surface>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </SiteSwipeView>

      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1,
  },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontFamily: Fonts.bold },
  // W-E: primary group header (Appearance · Notifications · Work Mode · Data)
  groupHeader: { fontSize: FontSize.xl, fontFamily: Fonts.bold, marginTop: Spacing.sm },
  // W-E: one-sentence description under a setting
  descText: { fontSize: FontSize.xs, marginTop: Spacing.sm, lineHeight: 18 },
  // W-E: Essentials Mode hero card
  essentialsCard: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 2, ...Shadow.card },
  essentialsLabel: { fontSize: FontSize.lg, fontFamily: Fonts.bold },
  card: { borderRadius: Radius.md, padding: Spacing.md, ...Shadow.card },
  fieldLabel: { fontSize: FontSize.sm, fontFamily: Fonts.semibold, marginBottom: Spacing.xs },
  input: { borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3, gap: 3 },
  seg: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  segActive: { ...Shadow.card },
  segText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  divider: { height: 1, marginVertical: Spacing.md },
  workHoursRow: { flexDirection: 'row', gap: Spacing.md },
  workHoursCol: { flex: 1 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayChip: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  // Work-days picker: all 7 days must fit on one row, so it overrides dayRow/dayChip's
  // wrap + fixed minWidth with an evenly-split, non-wrapping layout.
  workDayRow: { flexWrap: 'nowrap', gap: 2 },
  workDayChip: { flex: 1, minWidth: 0, minHeight: 36, paddingHorizontal: 2 },
  dayText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  paydayHint: { fontSize: FontSize.xs, marginTop: Spacing.xs, fontStyle: 'italic' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.md, fontFamily: Fonts.medium },
  switchHint: { fontSize: FontSize.xs, marginTop: 2 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navRowArrow: { fontSize: FontSize.xl, fontFamily: Fonts.bold },
  dangerBtn: { paddingVertical: Spacing.sm },
  dangerBtnText: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  materialSwatch: { width: '100%', height: '100%', borderRadius: Radius.full, overflow: 'hidden' },
  materialSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', borderRadius: Radius.full },
  langRow: { flexDirection: 'row', gap: Spacing.md },
  langChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.md, justifyContent: 'center',
  },
  langFlag: { fontSize: 24 },
  langText: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  // Tab bar
  tabsRow: {
    flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.md,
  },
  tabItem: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: FontSize.sm },
  tabSectionLabel: {
    fontSize: FontSize.xs, fontFamily: Fonts.semibold, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.sm,
  },
  // Pet styles
  petTypeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  petTypeCard: {
    flex: 1, minWidth: 56, borderWidth: 2, borderRadius: Radius.md,
    padding: Spacing.xs, alignItems: 'center', gap: 2,
  },
  petTypeEmoji: { fontSize: 28 },
  petTypeLabel: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  petSwatch: {
    width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2,
    borderColor: 'transparent',
  },
  petSwatchActive: { borderWidth: 3 },
  savePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  savePillText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semibold,
  },
});
