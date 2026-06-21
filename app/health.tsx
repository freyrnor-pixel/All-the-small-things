/**
 * health.tsx — health / symptom log
 *
 * Logs ailments with a date, 1–5 severity and notes. Shows a last-30-days
 * overview (top ailments by frequency, each with a current-week severity
 * strip) above the chronological log list.
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, components/HintCard, components/PressableScale, components/ScreenBackground, components/Surface, constants/theme, lib/date, lib/i18n, lib/useAppTheme, store/useHealthStore
 *   Used by → Expo Router route "/health"
 *   Data    → useHealthStore (health_logs table); scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); dates are YYYY-MM-DD via todayStr()/dateStr().
 *   - The date field is a free-text TextInput (no picker) — it trusts the YYYY-MM-DD string entered.
 *   - save() shows a ConfirmationBanner so there's always positive proof the entry was logged.
 *   - W-D: this is an emotional screen — uses useSoftTheme() for a gentler palette and
 *     PressableScale severity targets. SEVERITY_COLORS is a soft purple→blue family
 *     (NOT red/green — avoids alarm connotations); labels come from t.severityLabels.
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
import { useHealthStore } from '@/store/useHealthStore';
import HintCard from '@/components/HintCard';
import PressableScale from '@/components/PressableScale';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import { useT } from '@/lib/i18n';
import { todayStr, getWeekDates } from '@/lib/date';
import { Colors, FontSize, Radius, Shadow, Spacing, Fonts } from '@/constants/theme';
import { useSoftTheme, useScaledStyles } from '@/lib/useAppTheme';

// W-D: soft purple→blue severity family. Lighter (mild) → deeper (severe) without
// any red/green alarm connotations. Static — these are intentionally fixed regardless
// of the active theme so the overview chart always reads gently.
const SEVERITY_COLORS = ['#C9D4F0', '#A9B8E8', '#8C9AE0', '#7C82D6', '#6E6BC8'];

function severities() {
  return SEVERITY_COLORS.map((color, i) => ({ value: i + 1, color }));
}

export default function HealthScreen() {
  const router = useRouter();
  const logs = useHealthStore((s) => s.logs);
  const add = useHealthStore((s) => s.add);
  const remove = useHealthStore((s) => s.remove);

  const [adding, setAdding] = useState(false);
  const [ailment, setAilment] = useState('');
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState(2);
  const [date, setDate] = useState(todayStr());
  const [confirm, setConfirm] = useState<string | null>(null);
  const t = useT();
  const theme = useSoftTheme();
  const styles = useScaledStyles(baseStyles);
  const SEVERITIES = severities();
  const severityLabel = (value: number) => t.severityLabels[value - 1] ?? '';

  const today = todayStr();
  const weekDates = getWeekDates(today);

  function save() {
    if (!ailment.trim()) return;
    add({ date, ailment: ailment.trim(), severity, notes: notes.trim() });
    setAilment('');
    setNotes('');
    setSeverity(2);
    setDate(todayStr());
    setAdding(false);
    setConfirm(t.taskSavedSimple);
  }

  // Count occurrences of ailments in last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = logs.filter((l) => new Date(l.date) >= cutoff);
  const counts: Record<string, number> = {};
  recent.forEach((l) => {
    counts[l.ailment] = (counts[l.ailment] ?? 0) + 1;
  });
  const topAilments = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
      <ScreenHeader title={t.healthTitle} onBack={() => router.back()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        <HintCard text={t.hints.health.text} example={t.hints.health.example} />
        {/* Overview */}
        {topAilments.length > 0 && (
          <Surface style={styles.overviewCard}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.last30Days}</Text>
            {topAilments.map(([name, count]) => {
              const weekSeverities = weekDates.map((d) => {
                const dayLogs = logs.filter((l) => l.ailment === name && l.date === d);
                if (dayLogs.length === 0) return null;
                return Math.max(...dayLogs.map((l) => l.severity));
              });
              return (
                <View key={name} style={styles.overviewAilment}>
                  <View style={styles.overviewRow}>
                    <Text style={[styles.overviewName, { color: theme.text }]}>{name}</Text>
                    <View style={[styles.overviewBar, { backgroundColor: theme.grayLight }]}>
                      <View
                        style={[
                          styles.overviewFill,
                          // W-D: soft purple→blue bar instead of orange (matches the gentle severity family).
                          { backgroundColor: SEVERITY_COLORS[2], width: `${Math.min((count / (topAilments[0]?.[1] ?? 1)) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.overviewCount, { color: theme.textLight }]}>{count}×</Text>
                  </View>
                  <View style={styles.ailmentWeekStrip}>
                    {weekDates.map((d, i) => {
                      const sev = weekSeverities[i];
                      const sevColor = sev ? (SEVERITIES.find((s) => s.value === sev)?.color ?? theme.grayLight) : 'transparent';
                      const isFuture = d > today;
                      return (
                        <View key={d} style={styles.ailmentDotCol}>
                          <Text style={[styles.ailmentDayAbbr, { color: theme.textLight }]}>{t.dayLabels[i][0]}</Text>
                          <View style={[
                            styles.ailmentDot,
                            {
                              backgroundColor: sev ? sevColor : 'transparent',
                              borderColor: isFuture ? theme.grayLight : (sev ? sevColor : theme.grayLight),
                              opacity: isFuture ? 0.3 : 1,
                            },
                          ]} />
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Surface>
        )}

        {/* Add form */}
        {adding ? (
          <Surface style={styles.addCard}>
            <Text style={[styles.formLabel, { color: theme.textLight }]}>{t.dateLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={[styles.formLabel, { color: theme.textLight, marginTop: Spacing.sm }]}>{t.ailmentLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={ailment}
              onChangeText={setAilment}
              placeholder={t.ailmentPlaceholder}
              placeholderTextColor={theme.gray}
              autoFocus
            />
            <Text style={[styles.formLabel, { color: theme.textLight, marginTop: Spacing.sm }]}>{t.severityLabel}</Text>
            {/* W-D: 5 large, clearly-labelled tap targets (not a slider). Stored value is 1–5. */}
            <View style={styles.severityRow}>
              {SEVERITIES.map((s) => {
                const active = severity === s.value;
                // Lighter severities (1–2) read better with dark text; deeper ones with white.
                const fg = s.value >= 3 ? theme.white : theme.text;
                return (
                  <PressableScale
                    key={s.value}
                    style={[
                      styles.severityTarget,
                      { backgroundColor: s.color },
                      active && [styles.severityActive, { borderColor: theme.text }],
                    ]}
                    onPress={() => setSeverity(s.value)}
                  >
                    <Text style={[styles.severityNum, { color: fg }]}>{s.value}</Text>
                    <Text style={[styles.severityTargetLabel, { color: fg }]} numberOfLines={1}>
                      {severityLabel(s.value)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={[styles.formLabel, { color: theme.textLight, marginTop: Spacing.sm }]}>{t.notesLabel}</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t.notesPlaceholder}
              placeholderTextColor={theme.gray}
              multiline
            />
            <View style={styles.addActions}>
              <Pressable onPress={() => setAdding(false)}>
                <Text style={[styles.cancelText, { color: theme.textLight }]}>{t.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: theme.green }]} onPress={save}>
                <Text style={styles.saveBtnText}>{t.save}</Text>
              </Pressable>
            </View>
          </Surface>
        ) : (
          <Pressable style={[styles.addTrigger, { borderColor: theme.green }]} onPress={() => setAdding(true)}>
            <Text style={[styles.addTriggerText, { color: theme.green }]}>{t.logSymptomTrigger}</Text>
          </Pressable>
        )}

        {/* W-D: low-weight, affirming self-care note below the log form. */}
        <Text style={[styles.selfCareNote, { color: theme.textLight }]}>{t.healthSelfCareNote}</Text>

        {/* Log list */}
        <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.logSection}</Text>
        {logs.length === 0 && (
          <Surface tint={theme.offWhite} style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noLogsGentle}</Text>
          </Surface>
        )}
        {logs.map((log) => {
          const sev = SEVERITIES.find((s) => s.value === log.severity);
          return (
            <View key={log.id} style={[styles.logCard, { backgroundColor: theme.white, borderLeftColor: sev?.color ?? theme.grayLight }]}>
              <View style={styles.logTop}>
                <View>
                  <Text style={[styles.logAilment, { color: theme.text }]}>{log.ailment}</Text>
                  <Text style={[styles.logDate, { color: theme.textLight }]}>{log.date}</Text>
                </View>
                <View style={styles.logRight}>
                  <View style={[styles.severityBadge, { backgroundColor: sev?.color }]}>
                    <Text style={[styles.severityBadgeText, { color: log.severity >= 3 ? theme.white : theme.text }]}>{severityLabel(log.severity)}</Text>
                  </View>
                  <Pressable onPress={() => remove(log.id)} hitSlop={8}>
                    <Text style={[styles.removeText, { color: theme.gray }]}>×</Text>
                  </Pressable>
                </View>
              </View>
              {log.notes ? <Text style={[styles.logNotes, { color: theme.textLight }]}>{log.notes}</Text> : null}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
  content: { padding: Spacing.md, gap: Spacing.md },
  overviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  sectionLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600', marginBottom: Spacing.xs },
  overviewAilment: { marginTop: Spacing.sm },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ailmentWeekStrip: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 5,
    paddingLeft: 2,
  },
  ailmentDotCol: { alignItems: 'center', gap: 2 },
  ailmentDayAbbr: { fontSize: 7, color: Colors.textLight, fontWeight: '600' },
  ailmentDot: { width: 9, height: 9, borderRadius: Radius.full, borderWidth: 1.5 },
  overviewName: { fontSize: FontSize.sm, color: Colors.text, width: 100 },
  overviewBar: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  overviewFill: { height: 8, borderRadius: Radius.full },
  overviewCount: { fontSize: FontSize.xs, color: Colors.textLight, width: 28, textAlign: 'right' },
  addTrigger: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.green,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addTriggerText: { fontSize: FontSize.md, color: Colors.green, fontWeight: '600' },
  addCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  formLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  input: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: 4,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  severityRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // W-D: large, clearly-labelled severity tap targets (replaces small pills / slider).
  severityTarget: {
    flex: 1,
    minHeight: 60,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    gap: 2,
  },
  severityActive: { borderWidth: 2 },
  severityNum: { fontSize: FontSize.lg, fontFamily: Fonts.bold, fontWeight: '700' },
  severityTargetLabel: { fontSize: 11, fontFamily: Fonts.semibold, fontWeight: '600', textAlign: 'center' },
  selfCareNote: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.xs,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelText: { fontSize: FontSize.md, color: Colors.textLight },
  saveBtn: {
    backgroundColor: Colors.green,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  emptyCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: { fontSize: FontSize.sm, color: Colors.textLight },
  logCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    ...Shadow.card,
  },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logAilment: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  logDate: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  logRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  severityBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  severityBadgeText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  removeText: { fontSize: 20, color: Colors.gray },
  logNotes: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: Spacing.sm },
});
