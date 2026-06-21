/**
 * ScreenHeader.tsx — the standard screen top bar (back link + title + right slot).
 *
 * Replaces the back/title/spacer header markup that was copy-pasted across every
 * non-modal screen. Reproduces the exact previous tree and styling: a "back"
 * link (theme.orange), a centred-by-space-between title (theme.text), and a right
 * slot that defaults to a 60px spacer so the title stays optically centred.
 * Pass `right` for header actions, and `bordered` for the white/grayLight bottom
 * border that the shopping/settings/scan/budget/share screens use.
 *
 * Connections:
 *   Imports → constants/theme, lib/i18n, lib/useAppTheme
 *   Used by → app screens (the header row)
 *   Data    → none (presentational)
 *
 * Edit notes:
 *   - Render as a direct child of SafeAreaView, after <ScreenBackground />.
 *   - Defaults `onBack` to router.back via the caller — pass onBack to override
 *     (e.g. meals' "drill back out of a category").
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { FontSize, Spacing } from '@/constants/theme';
import { useT } from '@/lib/i18n';
import { useAppTheme } from '@/lib/useAppTheme';

type Props = {
  title: string;
  onBack: () => void;
  /** Right-hand element (header actions). Defaults to a spacer that balances the back link. */
  right?: React.ReactNode;
  /** Override the back link label (defaults to the localised "back"). */
  backLabel?: string;
  /** Adds the white background + grayLight bottom border used by some screens. */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenHeader({ title, onBack, right, backLabel, bordered, style }: Props) {
  const t = useT();
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.header,
        bordered && { backgroundColor: theme.white, borderBottomWidth: 1, borderBottomColor: theme.grayLight },
        style,
      ]}
    >
      <Pressable onPress={onBack}>
        <Text style={[styles.back, { color: theme.orange }]}>{backLabel ?? t.back}</Text>
      </Pressable>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  spacer: { width: 60 },
});
