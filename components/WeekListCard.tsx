/**
 * WeekListCard.tsx — one padlock-gated Container per week ShoppingList row.
 *
 * Replaces ListSwitcherHeader's single-active-list view: every non-template
 * shopping_lists row now gets its own Container in the Week lists tab, instead of
 * stepping through one "selected" list with prev/next chevrons. Owns this list's
 * inline rename (ported from the now-deleted ListSwitcherHeader, minus the prev/next
 * stepping) — Container's React.ReactNode `title` prop is what makes this possible:
 * a plain string renders inside Container's own styled <Text>, this TextInput/Pressable
 * renders un-wrapped. Renders that list's three sections (From meals / Shopping list /
 * In cart) plus its own "Shopping done!" button — every item/group is pre-computed and
 * scoped to this list's id by the parent (app/shopping.tsx); this is a dumb
 * presentational component, same divide as ShoppingRow/MonthlyTableRow.
 *
 * Connections:
 *   Imports → components/Container, components/ShoppingRow, components/AddDivider, components/ExpandableCard, components/Surface, components/PressableScale, constants/theme, lib/i18n, lib/useAppTheme, store/useShoppingListStore (ShoppingList type), store/useShoppingStore (ShoppingItem type), store/useMealStore (Dish type)
 *   Used by → app/shopping.tsx
 *   Data    → none directly — every item/group/callback is owned by the parent
 *
 * Edit notes:
 *   - Rename commits on submit/blur via onRename(trimmed); empty/unchanged input is a
 *     no-op, identical semantics to the old ListSwitcherHeader.
 *   - `list.locked` only gates add/remove/edit: every ShoppingRow gets locked={list.locked}
 *     (dims remove/move buttons; checkmark/collect/undo stay interactive regardless), and
 *     the AddDivider below the Shopping list section is disabled via its own `disabled` prop —
 *     but the "Shopping done!" button is NEVER lock-gated (finishing a trip isn't an edit).
 *   - The "Shopping list" section always renders, even with zero items, so the AddDivider
 *     always has a stable anchor — there's no per-list illustrated empty state here; that
 *     only exists at the screen level for the zero-lists case.
 *   - "From meals" dish groups are each an uncontrolled ExpandableCard (defaultOpen={false}) —
 *     gives every dish its own independent collapse state with no parent-tracked key needed.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Container from '@/components/Container';
import ShoppingRow from '@/components/ShoppingRow';
import AddDivider from '@/components/AddDivider';
import ExpandableCard from '@/components/ExpandableCard';
import Surface from '@/components/Surface';
import PressableScale from '@/components/PressableScale';
import { ShoppingList } from '@/store/useShoppingListStore';
import { ShoppingItem } from '@/store/useShoppingStore';
import { Dish } from '@/store/useMealStore';
import { AppColors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';

type Props = {
  list: ShoppingList;
  theme: AppColors;
  dishGroups: [string, ShoppingItem[]][];
  dishes: Dish[];
  ungroupedUnchecked: ShoppingItem[];
  checked: ShoppingItem[];
  onToggleLock: () => void;
  onRename: (name: string) => void;
  onOpenSettings: () => void;
  onOpenSavedLists: () => void;
  onToggleItem: (item: ShoppingItem) => void;
  onCollectItem: (item: ShoppingItem) => void;
  onRemoveItem: (item: ShoppingItem) => void;
  onMoveItem: (item: ShoppingItem, direction: 'up' | 'down') => void;
  onAddPress: () => void;
  onDoneShopping: () => void;
};

export default function WeekListCard({
  list,
  theme,
  dishGroups,
  dishes,
  ungroupedUnchecked,
  checked,
  onToggleLock,
  onRename,
  onOpenSettings,
  onOpenSavedLists,
  onToggleItem,
  onCollectItem,
  onRemoveItem,
  onMoveItem,
  onAddPress,
  onDoneShopping,
}: Props) {
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(list.name);

  useEffect(() => {
    setEditing(false);
    setNameInput(list.name);
  }, [list.id, list.name]);

  function commitRename() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== list.name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <Container
      title={
        editing ? (
          <TextInput
            style={[styles.nameInput, { color: theme.text, borderColor: theme.grayLight }]}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder={t.listRenamePlaceholder}
            placeholderTextColor={theme.gray}
            autoFocus
            onSubmitEditing={commitRename}
            onBlur={commitRename}
            returnKeyType="done"
          />
        ) : (
          <Pressable onPress={() => setEditing(true)} style={styles.nameTapTarget}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{list.name}</Text>
            {list.isRecurring && (
              <Ionicons name="repeat" size={14} color={theme.green} style={styles.repeatIcon} />
            )}
          </Pressable>
        )
      }
      locked={list.locked}
      onToggleLock={onToggleLock}
      accentColor={theme.green}
      rightAction={
        <View style={styles.iconRow}>
          <Pressable onPress={onOpenSettings} hitSlop={8}>
            <Ionicons name="options-outline" size={20} color={theme.textLight} />
          </Pressable>
          <Pressable onPress={onOpenSavedLists} hitSlop={8}>
            <Ionicons name="bookmark-outline" size={20} color={theme.textLight} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.bodyGap}>
        {dishGroups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: theme.green }]}>{t.fromMealsSection}</Text>
              <View style={[styles.sectionRule, { backgroundColor: theme.green }]} />
            </View>
            {dishGroups.map(([dishName, groupItems]) => {
              const dish = dishes.find((d) => d.name === dishName);
              const subtitle = `${t.ingredientsCount(groupItems.length)}${dish && dish.estimatedPriceNok > 0 ? ` · ${t.dishPriceLabel(String(dish.estimatedPriceNok))}` : ''}`;
              return (
                <ExpandableCard key={dishName} title={dishName} subtitle={subtitle} accentColor={theme.green} defaultOpen={false}>
                  {groupItems.map((item, idx) => (
                    <View key={item.id}>
                      <ShoppingRow
                        item={item}
                        theme={theme}
                        variant="planned"
                        onToggle={() => onToggleItem(item)}
                        onRemove={() => onRemoveItem(item)}
                        inStockLabel={t.inStockLabel}
                        locked={list.locked}
                      />
                      {idx < groupItems.length - 1 && (
                        <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                      )}
                    </View>
                  ))}
                </ExpandableCard>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: theme.green }]}>{t.inWeeklyListSection}</Text>
            <View style={[styles.sectionRule, { backgroundColor: theme.green }]} />
          </View>
          {ungroupedUnchecked.length > 0 && (
            <View style={[styles.card, styles.cardAccent, { backgroundColor: theme.white, borderLeftColor: theme.green }]}>
              {ungroupedUnchecked.map((item, idx) => (
                <View key={item.id}>
                  <ShoppingRow
                    item={item}
                    theme={theme}
                    variant="planned"
                    onToggle={() => onToggleItem(item)}
                    onRemove={() => onRemoveItem(item)}
                    onMoveUp={idx > 0 ? () => onMoveItem(item, 'up') : undefined}
                    onMoveDown={idx < ungroupedUnchecked.length - 1 ? () => onMoveItem(item, 'down') : undefined}
                    inStockLabel={t.inStockLabel}
                    locked={list.locked}
                  />
                  {idx < ungroupedUnchecked.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                  )}
                </View>
              ))}
            </View>
          )}
          <AddDivider onPress={onAddPress} disabled={list.locked} />
        </View>

        {checked.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.inKurvenSection(checked.length)}</Text>
            <Surface style={styles.card}>
              {checked.map((item, idx) => (
                <View key={item.id}>
                  <ShoppingRow
                    item={item}
                    theme={theme}
                    variant="cart"
                    onToggle={() => onToggleItem(item)}
                    onCollect={() => onCollectItem(item)}
                    onRemove={() => onRemoveItem(item)}
                    locked={list.locked}
                  />
                  {idx < checked.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                  )}
                </View>
              ))}
            </Surface>
          </View>
        )}

        <PressableScale
          style={[
            styles.doneShoppingBtn,
            { backgroundColor: theme.green },
            checked.length === 0 && { opacity: 0.4 },
          ]}
          onPress={onDoneShopping}
          disabled={checked.length === 0}
          pointerEvents={checked.length === 0 ? 'none' : 'auto'}
        >
          <Text style={styles.doneShoppingText}>{t.doneShoppingBtn}</Text>
        </PressableScale>
      </View>
    </Container>
  );
}

const baseStyles = StyleSheet.create({
  nameTapTarget: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  repeatIcon: { marginLeft: 2 },
  nameInput: {
    fontSize: FontSize.md,
    fontFamily: Fonts.semibold,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bodyGap: { gap: Spacing.md },
  section: { gap: Spacing.xs },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  sectionRule: { flex: 1, height: 2, borderRadius: Radius.full, opacity: 0.4 },
  sectionLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: Radius.md, paddingHorizontal: Spacing.md },
  cardAccent: { borderLeftWidth: 3 },
  rowDivider: { height: 1 },
  doneShoppingBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', minHeight: 44 },
  doneShoppingText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.md },
});
