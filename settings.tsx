/**
 * UnFocus — Settings Screen
 *
 * Two sections:
 *  1. Colour scheme — SchemePicker (same as Onboarding), live re-skins entire app
 *  2. Appearance — Dark mode Switch
 *
 * Both selections are persisted automatically by ThemeProvider.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from 'react-native';

import { useTheme } from '@/components/ThemeProvider';
import { SchemePicker } from '@/components/SchemePicker';
import { Card, HintCard, Switch } from '@/components/ui';
import { FontFamily, FontSize, FontWeight, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { colors, scheme, setScheme, darkMode, setDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgApp }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.textBody }]}>Settings</Text>

        {/* ── Colour scheme ─────────────────────────────────────────── */}
        <Text style={[styles.sectionHeading, { color: colors.textBody }]}>
          Colour scheme
        </Text>
        <Card>
          <SchemePicker value={scheme} onChange={setScheme} />
        </Card>
        <HintCard
          text="Pick a look that feels right — it recolours the whole app, the bubble wheel and all."
        />

        {/* ── Appearance ────────────────────────────────────────────── */}
        <Text style={[styles.sectionHeading, { color: colors.textBody }]}>
          Appearance
        </Text>
        <Card>
          <Switch
            label="Dark mode"
            checked={darkMode}
            onChange={setDarkMode}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: Spacing.screenPadding, paddingBottom: Spacing.s64 },

  screenTitle: {
    fontFamily:   FontFamily.sans,
    fontWeight:   FontWeight.semibold,
    fontSize:     FontSize.xl,
    marginTop:    Spacing.s8,
    marginBottom: Spacing.s20,
    includeFontPadding: false,
  },
  sectionHeading: {
    fontFamily:   FontFamily.sans,
    fontWeight:   FontWeight.semibold,
    fontSize:     FontSize.lg,
    marginTop:    Spacing.s20,
    marginBottom: Spacing.s8,
    includeFontPadding: false,
  },
});
