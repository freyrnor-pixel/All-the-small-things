/**
 * DatePickerCalendar.tsx — collapsible week-strip / month-grid calendar for picking a YYYY-MM-DD date.
 *
 * Defaults to a single-row week strip (Mon–Sun) centered on the selected date, with
 * prev/next week navigation. A chevron toggle expands it into the full month grid
 * (and back), so the common case (one tap, nearby day) stays compact while the full
 * month is still reachable.
 *
 * Connections:
 *   Imports → constants/theme
 *   Used by → app/task-form.tsx
 *   Data    → none (presentational); value/onChange/theme/labels all come from props
 *
 * Edit notes:
 *   - dayLabels must be Mon–Sun ordered (7 entries); the grid/strip offsets weeks so Monday is column 0.
 *   - Dates are handled as YYYY-MM-DD strings via toDateStr/parseDateParts — avoid raw Date math to dodge timezone shifts.
 *   - expandLabel/collapseLabel are plain strings (not from useT directly) so this stays presentational; pass t.showFullMonth / t.showWeekOnly.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, FontSize, Radius, Spacing } from '@/constants/theme';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  theme: AppColors;
  dayLabels: string[]; // Mon–Sun (7 entries)
  monthLabels: string[]; // 12 month names
  expandLabel: string;
  collapseLabel: string;
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

/** Monday (Mon=0 offset) of the week containing the given YYYY-MM-DD string. */
function weekStart(s: string): Date {
  const [y, m, d] = parseDateParts(s);
  const dt = new Date(y, m, d);
  const mon0 = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - mon0);
  return dt;
}

export default function DatePickerCalendar({
  value,
  onChange,
  theme,
  dayLabels,
  monthLabels,
  expandLabel,
  collapseLabel,
}: Props) {
  const [selY, selM, selD] = parseDateParts(value);
  const [expanded, setExpanded] = useState(false);
  const [viewYear, setViewYear] = useState(selY);
  const [viewMonth, setViewMonth] = useState(selM);
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => weekStart(value));

  const today = todayStr();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function prevWeek() {
    setWeekAnchor((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 7);
      return nd;
    });
  }

  function nextWeek() {
    setWeekAnchor((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 7);
      return nd;
    });
  }

  function toggleExpanded() {
    if (!expanded) {
      // Jump the month grid to whichever month the week view is currently showing.
      setViewYear(weekAnchor.getFullYear());
      setViewMonth(weekAnchor.getMonth());
    } else {
      // Collapse back to the week containing the selected date.
      setWeekAnchor(weekStart(value));
    }
    setExpanded((e) => !e);
  }

  function renderDay(ds: string, dayNum: number, key: React.Key) {
    const isSelected = ds === value;
    const isToday = ds === today;
    return (
      <Pressable key={key} style={styles.cell} onPress={() => onChange(ds)} hitSlop={2}>
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
            {dayNum}
          </Text>
        </View>
      </Pressable>
    );
  }

  const weekDays: { ds: string; day: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + i);
    weekDays.push({ ds: toDateStr(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate() });
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
        <Pressable onPress={expanded ? prevMonth : prevWeek} hitSlop={12} style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: theme.orange }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthYear, { color: theme.text }]}>
          {expanded ? `${monthLabels[viewMonth]} ${viewYear}` : `${monthLabels[weekAnchor.getMonth()]} ${weekAnchor.getFullYear()}`}
        </Text>
        <Pressable onPress={expanded ? nextMonth : nextWeek} hitSlop={12} style={styles.navBtn}>
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

      {!expanded && (
        <View style={styles.weekRow}>
          {weekDays.map(({ ds, day }) => renderDay(ds, day, ds))}
        </View>
      )}

      {expanded && weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.cell} />;
            const ds = toDateStr(viewYear, viewMonth, day);
            return renderDay(ds, day, di);
          })}
        </View>
      ))}

      <Pressable onPress={toggleExpanded} style={styles.toggleRow} hitSlop={8}>
        <Text style={[styles.toggleText, { color: theme.orange }]}>
          {expanded ? collapseLabel : expandLabel}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.orange} />
      </Pressable>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  toggleText: { fontSize: FontSize.sm, fontWeight: '600' },
});
