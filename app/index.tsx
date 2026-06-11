/**
 * index.tsx — Home screen
 *
 * The app's daily landing screen: greeting, today's tasks + backlog, a weekly
 * shopping preview (tickable inline), gentle completed-count points, and the
 * BubbleMenu / QuickAddSheet entry points. Honours work mode and essentials
 * (focus) mode, both driven by settings.
 *
 * Connections:
 *   Imports → components/BubbleMenu, components/Pet, components/HintCard, components/QuickAddSheet, components/TaskItem, components/cover/CoverScreen, constants/theme, lib/date, lib/holidays, lib/i18n, lib/useCoverScreen, store/useHabitStore, store/useSettingsStore, store/useShoppingStore, store/useTaskStore
 *   Used by → Expo Router route "/"
 *   Data    → reads useTaskStore (tasks) + useShoppingStore (shopping_items) + useHabitStore (habits, logs); settings via useSettingsStore
 *
 * Edit notes:
 *   - All visible strings go through useT(); today is todayStr() (YYYY-MM-DD).
 *   - Work mode auto-activates only within work hours and not on weekends/holidays (isWeekendOrHoliday); session override disables it.
 *   - The Share button navigates to the /share-modal modal with params { kind: 't' }; task rows push /task-form (also a modal).
 *   - Settings gear is absolutely positioned top-right (zIndex 10); navigates to /settings.
 *   - When useCoverScreen() returns true (Galaxy Z Flip cover display), CoverScreen is rendered instead of the full home UI.
 *   - Backlog section uses theme.neutral (not danger/red) — no shame framing.
 *   - Pet renders as a screen-level overlay (bottom-left) when petEnabled; passes completedCount so it triggers excited animation on task completion.
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useT } from '@/lib/i18n';
import TaskItem from '@/components/TaskItem';
import BubbleMenu from '@/components/BubbleMenu';
import Pet from '@/components/Pet';
import QuickAddSheet from '@/components/QuickAddSheet';
import HintCard from '@/components/HintCard';
import CoverScreen from '@/components/cover/CoverScreen';
import { useCoverScreen } from '@/lib/useCoverScreen';
import { todayStr } from '@/lib/date';
import { isWeekendOrHoliday } from '@/lib/holidays';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

function isWithinWorkHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
}

export default function HomeScreen() {
  const router = useRouter();
  const today = todayStr();
  const settings = useSettingsStore();
  const t = useT();
  const theme = useAppTheme();
  const { isCoverScreen } = useCoverScreen();

  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const backlogTasksFn = useTaskStore((s) => s.backlogTasks);
  const completedCountFn = useTaskStore((s) => s.completedCount);
  const toggleTask = useTaskStore((s) => s.toggle);
  const shoppingItems = useShoppingStore((s) => s.items);
  const toggleShoppingItem = useShoppingStore((s) => s.toggleCheck);
  const habits = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const isWorkModeActive = useMemo(() => {
    if (settings.workModeSessionOverride) return false;
    if (settings.workModeEnabled) return true;
    // Auto-activation respects weekends and (optionally) Norwegian holidays —
    // no work mode on days off.
    if (
      settings.enforceWorkHours &&
      isWithinWorkHours(settings.workHoursStart, settings.workHoursEnd) &&
      !isWeekendOrHoliday(new Date(), settings.holidaysEnabled)
    ) {
      return true;
    }
    return false;
  }, [
    settings.workModeSessionOverride,
    settings.workModeEnabled,
    settings.enforceWorkHours,
    settings.workHoursStart,
    settings.workHoursEnd,
    settings.holidaysEnabled,
  ]);

  const allTodayTasks = tasksForDate(today);
  const todayTasks = settings.essentialsModeEnabled
    ? allTodayTasks.filter((task) => task.importance === 'essential')
    : allTodayTasks;

  const backlog = backlogTasksFn(today);
  const completedCount = completedCountFn();

  const weeklyPending = useMemo(
    () => shoppingItems.filter((i) => i.listType === 'weekly' && !i.checked),
    [shoppingItems]
  );
  const pendingShopping = weeklyPending.slice(0, 5);

  if (!settings.loaded || !settings.setupComplete) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: Colors.cream }]} />;
  }

  if (isCoverScreen) {
    return (
      <CoverScreen
        todayTasks={tasksForDate(today)}
        toggleTask={toggleTask}
        habits={habits}
        logs={habitLogs}
      />
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 10) return t.greeting.morning;
    if (h < 17) return t.greeting.day;
    return t.greeting.evening;
  };

  const dateLabel = (() => {
    const d = new Date();
    return `${t.days[d.getDay()]} ${d.getDate()}. ${t.months[d.getMonth()]}`;
  })();

  function handleToggleTask(id: string) {
    toggleTask(id);
  }

  function handleWorkModeOverride() {
    Alert.alert(t.switchModeTitle, t.switchModeBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.switchModeConfirm, onPress: () => settings.setWorkModeSessionOverride(true) },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      {isWorkModeActive && (
        <View style={[styles.workBanner, { backgroundColor: theme.orange }]}>
          <Text style={styles.workBannerText}>{t.workBanner}</Text>
          <Pressable style={styles.overrideBtn} onPress={handleWorkModeOverride}>
            <Text style={styles.overrideBtnText}>{t.switchMode}</Text>
          </Pressable>
        </View>
      )}

      {settings.essentialsModeEnabled && (
        <Pressable
          style={[styles.essentialsBanner, { backgroundColor: theme.orangeLight, borderBottomColor: theme.orange }]}
          onPress={() => settings.update({ essentialsModeEnabled: false })}
        >
          <Text style={[styles.essentialsBannerText, { color: theme.brown }]}>{t.focusBanner}</Text>
        </Pressable>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: theme.text }]}>
              {greeting()}{settings.userName ? `, ${settings.userName}` : ''}!
            </Text>
            <Text style={[styles.dateLabel, { color: theme.textLight }]}>{dateLabel}</Text>
          </View>

          {/* Right column: icon buttons */}
          <View style={styles.headerRight}>
            <View style={styles.headerIcons}>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: theme.grayLight }]}
                onPress={() => settings.update({ essentialsModeEnabled: !settings.essentialsModeEnabled })}
                accessibilityLabel={settings.essentialsModeEnabled ? t.focusActive : t.focusInactive}
              >
                <Ionicons
                  name={settings.essentialsModeEnabled ? 'star' : 'star-outline'}
                  size={20}
                  color={settings.essentialsModeEnabled ? theme.orange : theme.textLight}
                />
              </Pressable>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: theme.grayLight }]}
                onPress={() => router.push('/settings')}
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={20} color={theme.textLight} />
              </Pressable>
            </View>
          </View>
        </View>

        <HintCard text={t.hints.home.text} example={t.hints.home.example} />

        {/* Today's tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {settings.essentialsModeEnabled ? t.essentialTasksToday : t.tasksToday}
            </Text>
            <View style={styles.sectionActions}>
              <Pressable
                style={[styles.shareBtn, { backgroundColor: theme.greenLight }]}
                onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
                accessibilityLabel={t.shareBtnLabel}
              >
                <Text style={styles.shareBtnIcon}>⤴</Text>
              </Pressable>
              <Pressable
                style={[styles.addBtn, { backgroundColor: theme.orange }]}
                onPress={() => router.push('/task-form')}
              >
                <Text style={styles.addBtnText}>{t.addNew}</Text>
              </Pressable>
            </View>
          </View>
          {todayTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                {settings.essentialsModeEnabled ? t.noEssentialTasks : t.noTasks}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.border }]}>
              {todayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleTask(task.id)}
                  onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
                />
              ))}
            </View>
          )}
          {settings.essentialsModeEnabled && allTodayTasks.length > todayTasks.length && (
            <Pressable onPress={() => settings.update({ essentialsModeEnabled: false })}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>
                {t.essentialsHidden(allTodayTasks.length - todayTasks.length)}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Backlog — "waiting for you" phrasing, neutral colour (no red/overdue framing) */}
        {backlog.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.backlogLabelRow}>
                <Text style={[styles.sectionTitle, { color: theme.textLight }]}>{t.backlog}</Text>
                <View style={[styles.backlogBadge, { backgroundColor: theme.neutral }]}>
                  <Text style={styles.backlogBadgeText}>{backlog.length}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: theme.offWhite, borderColor: theme.border }]}>
              {backlog.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleTask(task.id)}
                  onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
                  muted
                />
              ))}
            </View>
            <Text style={[styles.backlogHint, { color: theme.textLight }]}>{t.backlogHint}</Text>
          </View>
        )}

        {/* Shopping preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.shoppingPreview}</Text>
            <Pressable onPress={() => router.push('/shopping')}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>{t.seeAll}</Text>
            </Pressable>
          </View>
          {pendingShopping.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.shoppingEmpty}</Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.border }]}>
              {pendingShopping.map((item) => (
                // OLD: <View key={item.id} style={styles.shoppingPreviewRow}>
                //        <View style={[styles.shoppingDot, { backgroundColor: theme.green }]} />
                //        <Text ...>{item.amount} {item.unit} {item.name}</Text>
                //      </View>
                //      Items were read-only; tapping anywhere navigated to /shopping instead
                //      of acting on the individual item. Changed to a per-item checkbox so
                //      users can tick things off from the home screen while shopping.
                <Pressable key={item.id} style={styles.shoppingPreviewRow} onPress={() => toggleShoppingItem(item.id)}>
                  <View style={[styles.shoppingCheck, { borderColor: theme.green }]} />
                  <Text style={[styles.shoppingPreviewName, { color: theme.text }]}>
                    {item.amount}{item.unit ? ` ${item.unit}` : ''} {item.name}
                  </Text>
                </Pressable>
              ))}
              {weeklyPending.length > 5 && (
                <Text style={[styles.moreText, { color: theme.textLight }]}>
                  {t.moreItems(weeklyPending.length - 5)}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Gentle points */}
        {settings.showPoints && completedCount > 0 && (
          <View style={[styles.pointsCard, { backgroundColor: theme.offWhite }]}>
            <Text style={[styles.pointsText, { color: theme.textLight }]}>
              {t.smallThingsCount(completedCount)}
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <QuickAddSheet visible={quickAddVisible} onClose={() => setQuickAddVisible(false)} />
      {settings.petEnabled && <Pet completedToday={completedCount} />}
      <BubbleMenu onNewTask={() => setQuickAddVisible(true)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  workBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  workBannerText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  overrideBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  overrideBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  essentialsBanner: {
    backgroundColor: '#FFF8E6', borderBottomWidth: 1, borderBottomColor: '#F6C344',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, alignItems: 'center',
  },
  essentialsBannerText: { fontSize: FontSize.xs, color: '#8A6A00', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greeting: { fontSize: FontSize.xxl, fontWeight: '700' },
  dateLabel: { fontSize: FontSize.md, marginTop: 2, textTransform: 'capitalize' },
  headerRight: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600' },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  shareBtn: { borderRadius: Radius.full, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  shareBtnIcon: { fontSize: 14 },
  addBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
  seeAll: { fontSize: FontSize.sm, fontWeight: '600' },
  card: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, ...Shadow.card },
  emptyCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm },
  // OLD: shoppingPreviewRow: { ..., paddingVertical: 4 }  — increased to 6 for easier tap target
  shoppingPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: Spacing.sm },
  // OLD: shoppingDot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: theme.green }
  //      Solid filled dot — purely decorative, gave no hint the row was interactive.
  //      Replaced with an open circle (shoppingCheck) to signal "tap to complete".
  shoppingCheck: { width: 18, height: 18, borderRadius: Radius.full, borderWidth: 2 },
  // OLD: shoppingPreviewName: { fontSize: FontSize.md }  — added flex:1 so long names don't overflow
  shoppingPreviewName: { fontSize: FontSize.md, flex: 1 },
  moreText: { fontSize: FontSize.sm, marginTop: Spacing.xs, textAlign: 'right' },
  backlogHint: { fontSize: FontSize.xs, marginTop: Spacing.xs, textAlign: 'center', fontStyle: 'italic' },
  backlogLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  backlogBadge: {
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backlogBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  pointsCard: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md },
  pointsText: { fontSize: FontSize.sm, fontWeight: '500', textAlign: 'center' },
});
