/**
 * DatePickerCalendar.tsx — month-grid calendar for picking a YYYY-MM-DD date.
 *
 * Self-contained month calendar with prev/next navigation that highlights the
 * selected day and today. Day/month names and theme colors are injected via
 * props so the parent owns localization and theming.
 *
 * Connections:
 *   Imports → constants/theme
 *   Used by → app/task-form.tsx
 *   Data    → none (presentational); value/onChange/theme/labels all come from props
 *
 * Edit notes:
 *   - dayLabels must be Mon–Sun ordered (7 entries); the grid offsets weeks so Monday is column 0.
 *   - Dates are handled as YYYY-MM-DD strings via toDateStr/parseDateParts — avoid raw Date math to dodge timezone shifts.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, FontSize, Radius, Spacing } from '@/constants/theme';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  theme: AppColors;
  dayLabels: string[]; // Mon–Sun (7 entries)
  monthLabels: string[]; // 12 month names
}

function parseDateParts(s: string): [number, number, number] {
  const parts = s.split('-').map(Number);
  return [parts[0] ?? new Date().getFullYear(), (parts[1] ?? 1) - 1, parts[2] ?? 1];
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayStr(): string {
  const n = new Date();
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
}

export default function DatePickerCalendar({ value, onChange, theme, dayLabels, monthLabels }: Props) {
  const [selY, selM, selD] = parseDateParts(value);
  const [viewYear, setViewYear] = useState(selY);
  const [viewMonth, setViewMonth] = useState(selM);

  const today = todayStr();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // shift so Mon=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={[styles.container, { backgroundColor: theme.white }]}>
      <View style={styles.header}>
        <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: theme.orange }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthYear, { color: theme.text }]}>
          {monthLabels[viewMonth]} {viewYear}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: theme.orange }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {dayLabels.map((label, i) => (
          <View key={i} style={styles.cell}>
            <Text style={[styles.weekLabel, { color: theme.textLight }]}>{label.slice(0, 2)}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.cell} />;
            const ds = toDateStr(viewYear, viewMonth, day);
            const isSelected = ds === value;
            const isToday = ds === today;
            return (
              <Pressable key={di} style={styles.cell} onPress={() => onChange(ds)} hitSlop={2}>
                <View style={[
                  styles.dayCircle,
                  isSelected && { backgroundColor: theme.orange },
                  !isSelected && isToday && { borderWidth: 1.5, borderColor: theme.orange },
                ]}>
                  <Text style={[
                    styles.dayText,
                    { color: theme.text },
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                    !isSelected && isToday && { color: theme.orange, fontWeight: '600' },
                  ]}>
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  navBtn: { padding: Spacing.sm },
  navArrow: { fontSize: 26, lineHeight: 30, fontWeight: '300' },
  monthYear: { fontSize: FontSize.md, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around' },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: FontSize.sm },
});
