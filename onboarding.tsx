/**
 * UnFocus — Onboarding Screen
 *
 * First-launch flow:
 *  1. Hero: app logo + headline + shame-free intro paragraph
 *  2. Feature list: five benefit rows (icon + copy)
 *  3. "Choose your look": SchemePicker — selecting re-skins the whole app live
 *  4. "Get started" primary CTA → navigate to Home
 *
 * All copy is from the design handoff spec.
 * Scheme selection is persisted automatically by ThemeProvider.
 */

import React from 'react';
import {
  ScrollView, View, Text, StyleSheet, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/components/ThemeProvider';
import { SchemePicker } from '@/components/SchemePicker';
import { Button, Card, HintCard } from '@/components/ui';
import {
  FontFamily, FontSize, FontWeight,
  Spacing, Radius,
} from '@/constants/theme';
import { gradientHero } from '@/constants/colors';

const FEATURES: Array<{ icon: string; text: string }> = [
  { icon: 'checkbox-outline',   text: "Stay on top of today's plans — without remembering everything yourself" },
  { icon: 'cart-outline',       text: 'Shopping lists that reset themselves each week' },
  { icon: 'restaurant-outline', text: 'Recipes you can push straight to the shopping list' },
  { icon: 'heart-outline',      text: 'A simple health journal for symptoms and observations' },
  { icon: 'briefcase-outline',  text: 'Work mode to keep personal and work separate' },
];

export default function OnboardingScreen() {
  const { colors, shadows, scheme, setScheme } = useTheme();
  const heroGradient = gradientHero(colors);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgApp }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={[styles.logoWrap, shadows.cardHeavy, { backgroundColor: colors.surfaceCard }]}>
            <LinearGradient
              colors={heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              {/* Replace with your actual watercolour-tree SVG / Image */}
              <Ionicons name="leaf" size={52} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.headline, { color: colors.textBody }]}>UnFocus</Text>
          <Text style={[styles.subheader, { color: colors.textMuted }]}>
            An app for all the small things
          </Text>
          <Text style={[styles.intro, { color: colors.textMuted }]}>
            Life is hard to manage when your brain works differently.{'\n'}
            UnFocus doesn't shame you for struggle.{'\n'}
            It celebrates every tiny win.
          </Text>
        </View>

        {/* ── Feature list ─────────────────────────────────────────────── */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureRow, { backgroundColor: colors.surfaceCard, borderColor: colors.borderCard }, shadows.card]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={f.icon as any} size={20} color={colors.accentDeep} />
              </View>
              <Text style={[styles.featureText, { color: colors.textBody }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Scheme picker ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textBody }]}>
          Choose your look
        </Text>
        <Card>
          <SchemePicker value={scheme} onChange={setScheme} />
        </Card>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            full
            iconRight="arrow-forward"
            onPress={() => router.replace('/(tabs)/')}
          >
            Get started
          </Button>
        </View>

        <Text style={[styles.privacy, { color: colors.textMuted }]}>
          Your data stays with you — nothing leaves your phone.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: Spacing.screenPadding, paddingBottom: Spacing.s40 },

  hero: {
    alignItems: 'center',
    paddingTop: Spacing.s16,
    marginBottom: Spacing.s24,
  },
  logoWrap: {
    width: 120, height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: Spacing.s20,
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.extrabold,
    fontSize:   FontSize['5xl'],
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  subheader: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.regular,
    fontSize:   FontSize.lg,
    marginTop:  Spacing.s6,
    includeFontPadding: false,
  },
  intro: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.regular,
    fontSize:   FontSize.base,
    lineHeight: FontSize.base * 1.6,
    textAlign:  'center',
    marginTop:  Spacing.s12,
    maxWidth:   300,
    includeFontPadding: false,
  },

  featureList: { gap: Spacing.s8, marginBottom: Spacing.s24 },
  featureRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.s14,
    borderRadius:  Radius.xl,
    borderWidth:   1,
    padding:       Spacing.s12,
  },
  featureIcon: {
    width: 38, height: 38, flexShrink: 0,
    borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.medium,
    fontSize:   FontSize.smmd,
    lineHeight: FontSize.smmd * 1.5,
    includeFontPadding: false,
  },

  sectionLabel: {
    fontFamily:   FontFamily.sans,
    fontWeight:   FontWeight.bold,
    fontSize:     FontSize.base,
    marginTop:    Spacing.s20,
    marginBottom: Spacing.s12,
    includeFontPadding: false,
  },

  cta: { marginTop: Spacing.s20 },

  privacy: {
    fontFamily:  FontFamily.sans,
    fontSize:    FontSize.xs,
    textAlign:   'center',
    marginTop:   Spacing.s14,
    includeFontPadding: false,
  },
});
