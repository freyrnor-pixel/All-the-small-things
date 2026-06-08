import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useT } from '@/lib/i18n';
import HintCard from '@/components/HintCard';
import { Colors, FontSize, Radius, Shadow, Spacing, THEMES, THEME_META, ThemeName } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);
  const resetMonthly = useShoppingStore((s) => s.resetMonthly);
  const clearTasks = useTaskStore((s) => s.clearAll);
  const t = useT();
  const [name, setName] = useState(settings.userName);
  const [monthlyDateInput, setMonthlyDateInput] = useState(String(settings.monthlyResetDate));

  const DAY_LABELS = t.dayFull;

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t.back}</Text>
        </Pressable>
        <Text style={styles.title}>{t.settingsTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HintCard text={t.hints.settings.text} example={t.hints.settings.example} />

        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionProfile}</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.yourName}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t.namePlaceholder}
              placeholderTextColor={Colors.gray}
              onBlur={() => settings.update({ userName: name })}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionLanguage}</Text>
          <View style={styles.card}>
            <View style={styles.langRow}>
              {(['no', 'en'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  style={[styles.langChip, settings.language === lang && styles.langChipActive]}
                  onPress={() => settings.update({ language: lang })}
                >
                  <Text style={styles.langFlag}>{lang === 'no' ? '🇳🇴' : '🇬🇧'}</Text>
                  <Text style={[styles.langText, settings.language === lang && styles.langTextActive]}>
                    {lang === 'no' ? t.norwegian : t.english}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Shopping list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionShopping}</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.defaultListType}</Text>
            <View style={styles.segmented}>
              {(['weekly', 'monthly'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.seg, settings.shoppingListMode === mode && styles.segActive]}
                  onPress={() => settings.update({ shoppingListMode: mode })}
                >
                  <Text style={[styles.segText, settings.shoppingListMode === mode && styles.segActiveText]}>
                    {mode === 'weekly' ? t.weekly : t.monthly}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>{t.weeklyResetDay}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.xs }}>
              <View style={styles.dayRow}>
                {DAY_LABELS.map((label, i) => (
                  <Pressable
                    key={i}
                    style={[styles.dayChip, settings.weeklyResetDay === i && styles.dayChipActive]}
                    onPress={() => settings.update({ weeklyResetDay: i })}
                  >
                    <Text style={[styles.dayText, settings.weeklyResetDay === i && styles.dayTextActive]}>
                      {label.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>{t.monthlyResetDate}</Text>
            <TextInput
              style={styles.input}
              value={monthlyDateInput}
              onChangeText={(v) => {
                setMonthlyDateInput(v);
                const n = parseInt(v, 10);
                if (!isNaN(n) && n >= 1 && n <= 31) {
                  settings.update({ monthlyResetDate: n });
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
              placeholderTextColor={Colors.gray}
              maxLength={2}
            />
            <Text style={styles.paydayHint}>{t.monthlyDateInputHint}</Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionNotifications}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t.weeklyReminders}</Text>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={(v) => settings.update({ remindersEnabled: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.remindersEnabled ? Colors.orange : Colors.gray}
              />
            </View>
            {settings.remindersEnabled && (
              <>
                <View style={styles.divider} />
                <Text style={styles.fieldLabel}>{t.reminderTimeLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={settings.reminderTime}
                  onChangeText={(v) => settings.update({ reminderTime: v })}
                  keyboardType="numbers-and-punctuation"
                  placeholder={t.reminderTimePlaceholder}
                  placeholderTextColor={Colors.gray}
                />
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={styles.switchLabel}>{t.taskNotifications}</Text>
                <Text style={styles.switchHint}>{t.taskNotificationsHint}</Text>
              </View>
              <Switch
                value={settings.taskNotificationsEnabled}
                onValueChange={(v) => settings.update({ taskNotificationsEnabled: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.taskNotificationsEnabled ? Colors.orange : Colors.gray}
              />
            </View>
          </View>
        </View>

        {/* Holidays */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionHolidays}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={styles.switchLabel}>{t.holidaysEnabledLabel}</Text>
                <Text style={styles.switchHint}>{t.holidaysHint}</Text>
              </View>
              <Switch
                value={settings.holidaysEnabled}
                onValueChange={(v) => settings.update({ holidaysEnabled: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.holidaysEnabled ? Colors.orange : Colors.gray}
              />
            </View>
          </View>
        </View>

        {/* Color theme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionColorTheme}</Text>
          <View style={styles.card}>
            <View style={styles.themeGrid}>
              {(Object.keys(THEMES) as ThemeName[]).map((key) => {
                const meta = THEME_META[key];
                const th = THEMES[key];
                const isActive = settings.colorTheme === key;
                return (
                  <Pressable
                    key={key}
                    style={[styles.themeOption, isActive && styles.themeOptionActive, { borderColor: th.orange }]}
                    onPress={() => settings.update({ colorTheme: key })}
                  >
                    <View style={styles.themeSwatches}>
                      <View style={[styles.swatch, { backgroundColor: th.cream }]} />
                      <View style={[styles.swatch, { backgroundColor: th.orange }]} />
                      <View style={[styles.swatch, { backgroundColor: th.green }]} />
                    </View>
                    <Text style={styles.themeEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.themeLabel, isActive && { color: th.orange, fontWeight: '700' }]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Work mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionWorkMode}</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.workModeDesc}</Text>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t.workModeActive}</Text>
              <Switch
                value={settings.workModeEnabled}
                onValueChange={(v) => settings.update({ workModeEnabled: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.workModeEnabled ? Colors.orange : Colors.gray}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={styles.switchLabel}>{t.autoActivate}</Text>
                <Text style={styles.switchHint}>{t.autoActivateHint}</Text>
              </View>
              <Switch
                value={settings.enforceWorkHours}
                onValueChange={(v) => settings.update({ enforceWorkHours: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.enforceWorkHours ? Colors.orange : Colors.gray}
              />
            </View>
            {settings.enforceWorkHours && (
              <>
                <View style={styles.divider} />
                <Text style={styles.fieldLabel}>{t.workHoursLabel}</Text>
                <View style={styles.hoursRow}>
                  <View style={styles.hourField}>
                    <Text style={styles.hourLabel}>{t.workHoursFrom}</Text>
                    <TextInput
                      style={styles.hourInput}
                      value={settings.workHoursStart}
                      onChangeText={(v) => settings.update({ workHoursStart: v })}
                      placeholder="09:00"
                      placeholderTextColor={Colors.gray}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <Text style={styles.hourSep}>–</Text>
                  <View style={styles.hourField}>
                    <Text style={styles.hourLabel}>{t.workHoursTo}</Text>
                    <TextInput
                      style={styles.hourInput}
                      value={settings.workHoursEnd}
                      onChangeText={(v) => settings.update({ workHoursEnd: v })}
                      placeholder="17:00"
                      placeholderTextColor={Colors.gray}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Motivasjon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionMotivation}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={styles.switchLabel}>{t.showPointsLabel}</Text>
                <Text style={styles.switchHint}>{t.showPointsHint}</Text>
              </View>
              <Switch
                value={settings.showPoints}
                onValueChange={(v) => settings.update({ showPoints: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.showPoints ? Colors.orange : Colors.gray}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={styles.switchLabel}>{t.showHintsLabel}</Text>
                <Text style={styles.switchHint}>{t.showHintsHint}</Text>
              </View>
              <Switch
                value={settings.showHints}
                onValueChange={(v) => settings.update({ showHints: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.showHints ? Colors.orange : Colors.gray}
              />
            </View>
          </View>
        </View>

        {/* Reset data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.sectionReset}</Text>
          <View style={styles.card}>
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetWeekly.toLowerCase(), resetWeekly)}>
              <Text style={styles.dangerBtnText}>{t.resetWeekly}</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetMonthly.toLowerCase(), resetMonthly)}>
              <Text style={styles.dangerBtnText}>{t.resetMonthly}</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.dangerBtn} onPress={() => confirmReset(t.resetTasks.toLowerCase(), clearTasks)}>
              <Text style={styles.dangerBtnText}>{t.resetTasks}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  back: { fontSize: FontSize.md, color: Colors.orange, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.card },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600', marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.offWhite, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  segmented: { flexDirection: 'row', backgroundColor: Colors.grayLight, borderRadius: Radius.md, padding: 3, gap: 3 },
  seg: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  segActive: { backgroundColor: Colors.white, ...Shadow.card },
  segText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  segActiveText: { color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.grayLight, marginVertical: Spacing.md },
  dayRow: { flexDirection: 'row', gap: Spacing.xs },
  dayChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.grayLight },
  dayChipActive: { backgroundColor: Colors.orange },
  dayText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  dayTextActive: { color: Colors.white },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  dateChip: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.grayLight, alignItems: 'center', justifyContent: 'center' },
  dateChipActive: { backgroundColor: Colors.orange },
  dateText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  dateTextActive: { color: Colors.white },
  paydayHint: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.xs, fontStyle: 'italic' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  switchHint: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  dangerBtn: { paddingVertical: Spacing.sm },
  dangerBtnText: { fontSize: FontSize.md, color: Colors.danger, fontWeight: '600' },
  themeGrid: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: { flex: 1, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.grayLight, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  themeOptionActive: { borderWidth: 2 },
  themeSwatches: { flexDirection: 'row', gap: 3 },
  swatch: { width: 14, height: 14, borderRadius: Radius.full },
  themeEmoji: { fontSize: 20 },
  themeLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xs },
  hourField: { flex: 1, gap: 4 },
  hourLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  hourInput: { backgroundColor: Colors.offWhite, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.md, color: Colors.text, textAlign: 'center' },
  hourSep: { fontSize: FontSize.lg, color: Colors.textLight, marginTop: Spacing.md },
  langRow: { flexDirection: 'row', gap: Spacing.md },
  langChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.grayLight, justifyContent: 'center' },
  langChipActive: { backgroundColor: Colors.orange },
  langFlag: { fontSize: 24 },
  langText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  langTextActive: { color: Colors.white },
});
