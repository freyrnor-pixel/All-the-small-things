/**
 * CoverHeader.tsx — time, greeting, and date for the cover screen
 *
 * Displays live clock, a time-of-day greeting, user name, and a compact date
 * label. Designed for the ~360×374dp Galaxy Z Flip cover display — no scroll,
 * fixed height ~72dp.
 *
 * Connections:
 *   Imports → react-native, constants/theme, lib/i18n
 *   Used by → components/cover/CoverScreen
 *   Data    → none (receives props); scaled fontSize via useScaledStyles()
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, FontSize, Spacing } from '@/constants/theme';
import { Translations } from '@/lib/i18n';
import { useScaledStyles } from '@/lib/useAppTheme';

type Props = {
  theme: AppColors;
  t: Translations;
  userName: string;
};

export default function CoverHeader({ theme, t, userName }: Props) {
  const [now, setNow] = useState(new Date());
  const styles = useScaledStyles(baseStyles);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const greeting = h < 10 ? t.greeting.morning : h < 17 ? t.greeting.day : t.greeting.evening;
  const timeStr = `${String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${now.getDate()} ${t.months[now.getMonth()]}`;

  return (
    <View style={styles.container}>
      <Text style={[styles.time, { color: theme.text }]}>{timeStr}</Text>
      <Text style={[styles.greeting, { color: theme.textLight }]}>
        {greeting}{userName ? `, ${userName}` : ''}
      </Text>
      <Text style={[styles.date, { color: theme.textLight }]}>{dateStr}</Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  time: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    letterSpacing: 1,
  },
  greeting: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  date: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
