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
import { Colors, FontSize, Radius, Shadow, Spacing, THEMES, THEME_META, ThemeName } from '@/constants/theme';

const DAY_LABELS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const resetWeekly = useShoppingStore((s) => s.resetWeekly);
  const resetMonthly = useShoppingStore((s) => s.resetMonthly);
  const clearTasks = useTaskStore((s) => s.clearAll);

  const [name, setName] = useState(settings.userName);

  function confirmReset(label: string, action: () => void) {
    Alert.alert(
      `Nullstill ${label}?`,
      'Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Nullstill', style: 'destructive', onPress: action },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Hjem</Text>
        </Pressable>
        <Text style={styles.title}>Innstillinger</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ditt navn</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Navn"
              placeholderTextColor={Colors.gray}
              onBlur={() => settings.update({ userName: name })}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Shopping list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Handleliste</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Standard listetype</Text>
            <View style={styles.segmented}>
              {(['weekly', 'monthly'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.seg, settings.shoppingListMode === mode && styles.segActive]}
                  onPress={() => settings.update({ shoppingListMode: mode })}
                >
                  <Text style={[styles.segText, settings.shoppingListMode === mode && styles.segActiveText]}>
                    {mode === 'weekly' ? 'Ukentlig' : 'Månedlig'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Nullstill ukesliste på (ukedag)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.xs }}>
              <View style={styles.dayRow}>
                {DAY_LABELS.map((label, i) => (
                  <Pressable
                    key={i}
                    style={[styles.dayChip, settings.weeklyResetDay === i && styles.dayChipActive]}
                    onPress={() => settings.update({ weeklyResetDay: i })}
                  >
                    <Text style={[styles.dayText, settings.weeklyResetDay === i && styles.dayTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Nullstill månedsliste på dato</Text>
            <View style={styles.dateRow}>
              {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                <Pressable
                  key={d}
                  style={[styles.dateChip, settings.monthlyResetDate === d && styles.dateChipActive]}
                  onPress={() => settings.update({ monthlyResetDate: d })}
                >
                  <Text style={[styles.dateText, settings.monthlyResetDate === d && styles.dateTextActive]}>
                    {d}.
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Varsler</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Ukentlige påminnelser</Text>
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
                <Text style={styles.fieldLabel}>Påminnelsestidspunkt (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.reminderTime}
                  onChangeText={(v) => settings.update({ reminderTime: v })}
                  keyboardType="numbers-and-punctuation"
                  placeholder="08:00"
                  placeholderTextColor={Colors.gray}
                />
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Oppgavevarsler</Text>
              <Switch
                value={settings.taskNotificationsEnabled}
                onValueChange={(v) => settings.update({ taskNotificationsEnabled: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.taskNotificationsEnabled ? Colors.orange : Colors.gray}
              />
            </View>
          </View>
        </View>

        {/* Color theme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fargetema</Text>
          <View style={styles.card}>
            <View style={styles.themeGrid}>
              {(Object.keys(THEMES) as ThemeName[]).map((key) => {
                const meta = THEME_META[key];
                const t = THEMES[key];
                const isActive = settings.colorTheme === key;
                return (
                  <Pressable
                    key={key}
                    style={[styles.themeOption, isActive && styles.themeOptionActive, { borderColor: t.orange }]}
                    onPress={() => settings.update({ colorTheme: key })}
                  >
                    <View style={styles.themeSwatches}>
                      <View style={[styles.swatch, { backgroundColor: t.cream }]} />
                      <View style={[styles.swatch, { backgroundColor: t.orange }]} />
                      <View style={[styles.swatch, { backgroundColor: t.green }]} />
                    </View>
                    <Text style={styles.themeEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.themeLabel, isActive && { color: t.orange, fontWeight: '700' }]}>
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
          <Text style={styles.sectionTitle}>Jobb-modus</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>
              Jobb-modus skjuler private oppgaver og lar deg fokusere.
            </Text>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Jobb-modus aktiv</Text>
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
                <Text style={styles.switchLabel}>Aktiver automatisk</Text>
                <Text style={styles.switchHint}>Skrur på jobb-modus i arbeidstiden</Text>
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
                <Text style={styles.fieldLabel}>Arbeidstid</Text>
                <View style={styles.hoursRow}>
                  <View style={styles.hourField}>
                    <Text style={styles.hourLabel}>Fra</Text>
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
                    <Text style={styles.hourLabel}>Til</Text>
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
          <Text style={styles.sectionTitle}>Motivasjon</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={styles.switchLabel}>Vis antall fullførte oppgaver</Text>
                <Text style={styles.switchHint}>Hvert lite steg teller — se totalen på forsiden</Text>
              </View>
              <Switch
                value={settings.showPoints}
                onValueChange={(v) => settings.update({ showPoints: v })}
                trackColor={{ false: Colors.grayLight, true: Colors.orangeLight }}
                thumbColor={settings.showPoints ? Colors.orange : Colors.gray}
              />
            </View>
          </View>
        </View>

        {/* Reset buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nullstill data</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.dangerBtn}
              onPress={() => confirmReset('ukesliste', resetWeekly)}
            >
              <Text style={styles.dangerBtnText}>Nullstill ukesliste</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.dangerBtn}
              onPress={() => confirmReset('månedsliste', resetMonthly)}
            >
              <Text style={styles.dangerBtnText}>Nullstill månedsliste</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.dangerBtn}
              onPress={() => confirmReset('alle oppgaver', clearTasks)}
            >
              <Text style={styles.dangerBtnText}>Nullstill alle oppgaver</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  back: { fontSize: FontSize.md, color: Colors.orange, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600', marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.grayLight,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  seg: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  segActive: { backgroundColor: Colors.white, ...Shadow.card },
  segText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  segActiveText: { color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.grayLight, marginVertical: Spacing.md },
  dayRow: { flexDirection: 'row', gap: Spacing.xs },
  dayChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
  },
  dayChipActive: { backgroundColor: Colors.orange },
  dayText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  dayTextActive: { color: Colors.white },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  dateChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: { backgroundColor: Colors.orange },
  dateText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  dateTextActive: { color: Colors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  dangerBtn: { paddingVertical: Spacing.sm },
  dangerBtnText: { fontSize: FontSize.md, color: Colors.danger, fontWeight: '600' },
  themeGrid: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.grayLight,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  themeOptionActive: { borderWidth: 2 },
  themeSwatches: { flexDirection: 'row', gap: 3 },
  swatch: { width: 14, height: 14, borderRadius: Radius.full },
  themeEmoji: { fontSize: 20 },
  themeLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  switchHint: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xs },
  hourField: { flex: 1, gap: 4 },
  hourLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  hourInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
  },
  hourSep: { fontSize: FontSize.lg, color: Colors.textLight, marginTop: Spacing.md },
});
