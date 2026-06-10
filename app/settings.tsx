/**
 * settings.tsx — app settings
 *
 * Central settings screen: name, language, colour theme / dark mode, work-mode
 * and focus options, reminder + notification toggles and times, weekly/monthly
 * reset schedule, and destructive reset/clear actions. Changing reminder-,
 * notification- or language-related settings re-syncs the scheduled reminders.
 *
 * Connections:
 *   Imports → components/HintCard, components/TimePickerWheel, constants/theme, lib/i18n, lib/reminders, lib/useAppTheme, store/useHabitStore, store/useSettingsStore, store/useShoppingStore, store/useTaskStore
 *   Used by → Expo Router route "/settings"
 *   Data    → useSettingsStore (settings table); reset actions touch useShoppingStore (shopping_items) + useTaskStore (tasks); re-syncs notifications via syncReminders / syncAllTaskNotifications / syncAllHabitReminders
 *
 * Edit notes:
 *   - All visible strings go through useT(); this screen uses useAppTheme() (not the static Colors palette) so theme/dark-mode apply — keep new colours theme-derived.
 *   - applyAndSync() is the single write path: it updates settings AND fires the right notification re-sync based on which keys changed — route changes through it, not settings.update() directly.
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
import { useSettingsStore, Settings } from '@/store/useSettingsStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useHabitStore } from '@/store/useHabitStore';
import { syncReminders } from '@/lib/reminders';
import { useT } from '@/lib/i18n';
import { useAppTheme } from '@/lib/useAppTheme';
import HintCard from '@/components/HintCard';
import TimePickerWheel from '@/components/TimePickerWheel';
// OLD: import { Colors, FontSize, Radius, Shadow, Spacing, THEMES, THEME_META, ThemeName } from '@/constants/theme';
//      Colors (the warm/default palette) was used throughout this screen for every
//      background, text, and border colour — meaning theme changes had no effect here.
//      Replaced with useAppTheme() so settings matches the user's chosen theme and dark mode.
import { FontSize, Radius, Shadow, Spacing, THEMES, THEME_META, ThemeName } from '@/constants/theme';
import { DarkMode } from '@/store/useSettingsStore';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const theme = useAppTheme();
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);
  const resetMonthly = useShoppingStore((s) => s.resetMonthly);
  const clearTasks = useTaskStore((s) => s.clearAll);
  const syncTaskNotifs = useTaskStore((s) => s.syncAllTaskNotifications);
  const syncHabitNotifs = useHabitStore((s) => s.syncAllHabitReminders);
  const t = useT();
  const [name, setName] = useState(settings.userName);
  const [monthlyDateInput, setMonthlyDateInput] = useState(String(settings.monthlyResetDate));

  const DAY_LABELS = t.dayFull;

  function applyAndSync(patch: Partial<Settings>) {
    settings.update(patch);
    const keys = Object.keys(patch);
    if (keys.some((k) => ['remindersEnabled', 'reminderTime', 'weeklyResetDay', 'monthlyResetDate', 'language'].includes(k))) {
      void syncReminders();
    }
    if (keys.some((k) => ['taskNotificationsEnabled', 'language'].includes(k))) {
      syncTaskNotifs();
    }
    if (keys.includes('language')) {
      syncHabitNotifs();
    }
  }

  function confirmReset(label: string, action: () => void) {
    Alert.alert(
      t.resetConfirmTitle(label),
      t.resetConfirmBody,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.resetConfirmBtn, style: 'destructive', onPress: action },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.settingsTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <HintCard text={t.hints.settings.text} example={t.hints.settings.example} />

        {/* Profile */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionProfile}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
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
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionLanguage}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
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
          </View>
        </View>

        {/* Shopping list */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionShopping}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
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
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionNotifications}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>{t.weeklyReminders}</Text>
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
                {/* OLD: <TextInput
                      style={styles.input}
                      value={settings.reminderTime}
                      onChangeText={(v) => applyAndSync({ reminderTime: v })}
                      keyboardType="numbers-and-punctuation"
                      placeholder={t.reminderTimePlaceholder}
                      placeholderTextColor={Colors.gray}
                    />
                    Free-text HH:MM entry was error-prone (partial input, wrong separators).
                    TimePickerWheel is already used in task-form for the same purpose. */}
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
          </View>
        </View>

        {/* Holidays */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionHolidays}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
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
          </View>
        </View>

        {/* Color theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionColorTheme}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <View style={styles.themeGrid}>
              {(Object.keys(THEMES) as ThemeName[]).map((key) => {
                const meta = THEME_META[key];
                const th = THEMES[key];
                const isActive = settings.colorTheme === key;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.themeOption,
                      { borderColor: isActive ? th.orange : theme.grayLight },
                      isActive && styles.themeOptionActive,
                    ]}
                    onPress={() => settings.update({ colorTheme: key })}
                  >
                    <View style={styles.themeSwatches}>
                      <View style={[styles.swatch, { backgroundColor: th.cream }]} />
                      <View style={[styles.swatch, { backgroundColor: th.orange }]} />
                      <View style={[styles.swatch, { backgroundColor: th.green }]} />
                    </View>
                    <Text style={styles.themeEmoji}>{meta.emoji}</Text>
                    <Text style={[
                      styles.themeLabel,
                      { color: theme.textLight },
                      isActive && { color: th.orange, fontWeight: '700' },
                    ]}>
                      {t.themeNames[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Appearance — dark mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionAppearance}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <Text style={[styles.fieldLabel, { color: theme.textLight }]}>{t.darkModeLabel}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.grayLight }]}>
              {(['system', 'off', 'on'] as DarkMode[]).map((mode) => (
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
                    {mode === 'system' ? t.darkModeSystem : mode === 'on' ? t.darkModeOn : t.darkModeOff}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Work mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionWorkMode}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
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
                {/* OLD: <Text style={styles.fieldLabel}>{t.workHoursLabel}</Text>
                        <View style={styles.hoursRow}>
                          <View style={styles.hourField}>
                            <Text style={styles.hourLabel}>{t.workHoursFrom}</Text>
                            <TextInput style={styles.hourInput} value={settings.workHoursStart}
                              onChangeText={(v) => settings.update({ workHoursStart: v })}
                              placeholder="09:00" keyboardType="numbers-and-punctuation" />
                          </View>
                          <Text style={styles.hourSep}>–</Text>
                          <View style={styles.hourField}>
                            <Text style={styles.hourLabel}>{t.workHoursTo}</Text>
                            <TextInput style={styles.hourInput} value={settings.workHoursEnd}
                              onChangeText={(v) => settings.update({ workHoursEnd: v })}
                              placeholder="17:00" keyboardType="numbers-and-punctuation" />
                          </View>
                        </View>
                    Side-by-side text inputs were compact but error-prone. Work hours are a
                    one-time setup step (hidden unless enforceWorkHours is on), so the extra
                    height from two stacked wheels is acceptable for the clarity gained. */}
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
          </View>
        </View>

        {/* Motivation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionMotivation}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>{t.showPointsLabel}</Text>
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.showPointsHint}</Text>
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
                <Text style={[styles.switchHint, { color: theme.textLight }]}>{t.showHintsHint}</Text>
              </View>
              <Switch
                value={settings.showHints}
                onValueChange={(v) => settings.update({ showHints: v })}
                trackColor={{ false: theme.grayLight, true: theme.orangeLight }}
                thumbColor={settings.showHints ? theme.orange : theme.gray}
              />
            </View>
          </View>
        </View>

        {/* Reset data */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.sectionReset}</Text>
          <View style={[styles.card, { backgroundColor: theme.white }]}>
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetWeekly.toLowerCase(), resetWeekly)}>
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.resetWeekly}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetMonthly.toLowerCase(), resetMonthly)}>
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.resetMonthly}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetTasks.toLowerCase(), clearTasks)}>
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>{t.resetTasks}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  dangerBtn: { paddingVertical: Spacing.sm },
  dangerBtnText: { fontSize: FontSize.md, fontWeight: '600' },
  themeGrid: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: { flex: 1, borderRadius: Radius.md, borderWidth: 2, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  themeOptionActive: { borderWidth: 2 },
  themeSwatches: { flexDirection: 'row', gap: 3 },
  swatch: { width: 14, height: 14, borderRadius: Radius.full },
  themeEmoji: { fontSize: 20 },
  themeLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  langRow: { flexDirection: 'row', gap: Spacing.md },
  langChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.md, justifyContent: 'center',
  },
  langFlag: { fontSize: 24 },
  langText: { fontSize: FontSize.md, fontWeight: '600' },
});
