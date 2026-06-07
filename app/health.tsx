import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useHealthStore } from '@/store/useHealthStore';
import HintCard from '@/components/HintCard';
import { useT } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const SEVERITIES = [
  { value: 1, label: 'Mild', color: Colors.greenLight },
  { value: 2, label: 'Litt', color: '#D4EDDA' },
  { value: 3, label: 'Moderat', color: Colors.orangeLight },
  { value: 4, label: 'Kraftig', color: '#FADADD' },
  { value: 5, label: 'Alvorlig', color: Colors.dangerLight },
];

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
  const t = useT();

  function save() {
    if (!ailment.trim()) return;
    add({ date, ailment: ailment.trim(), severity, notes: notes.trim() });
    setAilment('');
    setNotes('');
    setSeverity(2);
    setDate(todayStr());
    setAdding(false);
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Hjem</Text>
        </Pressable>
        <Text style={styles.title}>Helse</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <HintCard text={t.hints.health.text} example={t.hints.health.example} />
        {/* Overview */}
        {topAilments.length > 0 && (
          <View style={styles.overviewCard}>
            <Text style={styles.sectionLabel}>Siste 30 dager</Text>
            {topAilments.map(([name, count]) => (
              <View key={name} style={styles.overviewRow}>
                <Text style={styles.overviewName}>{name}</Text>
                <View style={styles.overviewBar}>
                  <View
                    style={[
                      styles.overviewFill,
                      {
                        width: `${Math.min((count / (topAilments[0]?.[1] ?? 1)) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.overviewCount}>{count}×</Text>
              </View>
            ))}
          </View>
        )}

        {/* Add form */}
        {adding ? (
          <View style={styles.addCard}>
            <Text style={styles.formLabel}>Dato (ÅÅÅÅ-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={[styles.formLabel, { marginTop: Spacing.sm }]}>Plage / symptom</Text>
            <TextInput
              style={styles.input}
              value={ailment}
              onChangeText={setAilment}
              placeholder="f.eks. Hodepine, Angst, Magesmerter…"
              placeholderTextColor={Colors.gray}
              autoFocus
            />
            <Text style={[styles.formLabel, { marginTop: Spacing.sm }]}>Alvorlighet</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((s) => (
                <Pressable
                  key={s.value}
                  style={[
                    styles.severityBtn,
                    { backgroundColor: s.color },
                    severity === s.value && styles.severityActive,
                  ]}
                  onPress={() => setSeverity(s.value)}
                >
                  <Text style={styles.severityBtnText}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.formLabel, { marginTop: Spacing.sm }]}>Notater (valgfritt)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Eventuelle notater…"
              placeholderTextColor={Colors.gray}
              multiline
            />
            <View style={styles.addActions}>
              <Pressable onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Avbryt</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveBtnText}>Lagre</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addTrigger} onPress={() => setAdding(true)}>
            <Text style={styles.addTriggerText}>+ Logg symptom</Text>
          </Pressable>
        )}

        {/* Log list */}
        <Text style={styles.sectionLabel}>Logg</Text>
        {logs.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Ingen loggede symptomer enda</Text>
          </View>
        )}
        {logs.map((log) => {
          const sev = SEVERITIES.find((s) => s.value === log.severity);
          return (
            <View key={log.id} style={[styles.logCard, { borderLeftColor: sev?.color ?? Colors.grayLight }]}>
              <View style={styles.logTop}>
                <View>
                  <Text style={styles.logAilment}>{log.ailment}</Text>
                  <Text style={styles.logDate}>{log.date}</Text>
                </View>
                <View style={styles.logRight}>
                  <View style={[styles.severityBadge, { backgroundColor: sev?.color }]}>
                    <Text style={styles.severityBadgeText}>{sev?.label}</Text>
                  </View>
                  <Pressable onPress={() => remove(log.id)} hitSlop={8}>
                    <Text style={styles.removeText}>×</Text>
                  </Pressable>
                </View>
              </View>
              {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
            </View>
          );
        })}

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
  content: { padding: Spacing.md, gap: Spacing.md },
  overviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  sectionLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600', marginBottom: Spacing.xs },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  overviewName: { fontSize: FontSize.sm, color: Colors.text, width: 100 },
  overviewBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.grayLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  overviewFill: { height: 8, backgroundColor: Colors.orange, borderRadius: Radius.full },
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
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  severityBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  severityActive: { borderColor: Colors.brown },
  severityBtnText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
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
