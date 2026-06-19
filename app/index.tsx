/**
 * index.tsx — Home screen
 *
 * The app's daily landing screen: greeting, a unified Plans widget + backlog, a
 * weekly shopping preview (tickable inline), gentle completed-count points, and
 * the BubbleMenu / QuickAddSheet entry points. Honours work mode and essentials
 * (focus) mode, both driven by settings.
 *
 * Connections:
 *   Imports → components/BubbleMenu, components/DayTimeline, components/HintCard, components/QuickAddSheet, components/TaskItem, components/cover/CoverScreen, constants/theme, lib/date, lib/holidays, lib/i18n, lib/useCoverScreen, store/useHabitStore, store/useSettingsStore, store/useShoppingStore, store/useTaskStore, store/useUpdateStore
 *   Used by → Expo Router route "/"
 *   Data    → reads useTaskStore (tasks) + useShoppingStore (shopping_items) + useHabitStore (habits, logs); settings via useSettingsStore; useUpdateStore (updateReady) for the restart banner
 *
 * Edit notes:
 *   - The update-ready banner mirrors the work-mode banner's look (theme.green
 *     pill) and calls Updates.reloadAsync() directly on tap — app/_layout.tsx
 *     only sets the updateReady flag, never auto-reloads or pops an Alert.
 *   - Plans are ranked "what do I need right now?": undone first, then
 *     time-anchored (time-box/time) earliest, then essentials. The Plans widget
 *     shows a 3-item preview (planPreviewCount) via DayTimeline; tapping the
 *     "•••" strip toggles plansExpanded to show the full day in place. Tapping
 *     the section title navigates to the full /plans screen (same ranking logic
 *     duplicated there by design — see app/plans.tsx).
 *   - Greeting is intentionally low-weight (Fonts.semibold, FontSize.xl); cards use
 *     Layout.cardPadding for a consistent calm rhythm.
 *   - All visible strings go through useT(); today is todayStr() (YYYY-MM-DD).
 *   - Work mode auto-activates only within work hours and not on weekends/holidays (isWeekendOrHoliday); session override disables it.
 *   - The Share button navigates to the /share-modal modal with params { kind: 't' }; DayTimeline rows push /task-form (also a modal).
 *   - Settings gear is absolutely positioned top-right (zIndex 10); navigates to /settings.
 *   - When useCoverScreen() returns true (Galaxy Z Flip cover display), CoverScreen is rendered instead of the full home UI.
 *   - Backlog section uses theme.neutral (not danger/red) — no shame framing.
 *   - Pet feature is currently disabled (code intact on feature branch).
 *   - `tasks` is selected directly from useTaskStore (not just the tasksForDate/backlogTasks/completedCount
 *     function refs, which are stable and never change identity) — without it, toggling a task wouldn't
 *     re-render this screen at all, since none of the other selected slices change. Keep it even though
 *     it looks unused; it's a re-render trigger + a useMemo dep.
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
import { useUpdateStore } from '@/store/useUpdateStore';
import * as Updates from 'expo-updates';
import { useT } from '@/lib/i18n';
import TaskItem from '@/components/TaskItem';
import DayTimeline from '@/components/DayTimeline';
import BubbleMenu from '@/components/BubbleMenu';
// import Pet from '@/components/Pet'; // Disabled for now
import QuickAddSheet from '@/components/QuickAddSheet';
import HintCard from '@/components/HintCard';
import CoverScreen from '@/components/cover/CoverScreen';
import { useCoverScreen } from '@/lib/useCoverScreen';
import { todayStr } from '@/lib/date';
import { isWeekendOrHoliday } from '@/lib/holidays';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Shadow, Spacing, Layout, Fonts } from '@/constants/theme';
import { useAppTheme, useIsDark, useScaledStyles } from '@/lib/useAppTheme';
import { StatusBar } from 'expo-status-bar';

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
  const isDark = useIsDark();
  const styles = useScaledStyles(baseStyles);

  const tasks = useTaskStore((s) => s.tasks);
  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const backlogTasksFn = useTaskStore((s) => s.backlogTasks);
  const completedCountFn = useTaskStore((s) => s.completedCount);
  const toggleTask = useTaskStore((s) => s.toggle);
  const shoppingItems = useShoppingStore((s) => s.items);
  const toggleShoppingItem = useShoppingStore((s) => s.toggleCheck);
  const habits = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const updateReady = useUpdateStore((s) => s.updateReady);
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

  // Single clear purpose on open — "what do I need right now?": surface today's
  // tasks in priority order (undone first, then timed/time-box items earliest,
  // then essentials), so the most actionable things sit at the top.
  const allTodayTasks = useMemo(() => {
    const list = tasksForDate(today);
    const rank = (task: typeof list[number]) => {
      let r = 0;
      if (task.done) r += 1000;                              // done sinks to the bottom
      if (task.taskType === 'time-box' || task.time) r -= 100; // time-anchored rises
      if (task.importance === 'essential') r -= 10;          // essentials rise
      return r;
    };
    return [...list].sort((a, b) => {
      const dr = rank(a) - rank(b);
      if (dr !== 0) return dr;
      // Within the same rank, order by time when present (earliest first).
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }, [tasks, tasksForDate, today]);

  const visibleTodayTasks = settings.essentialsModeEnabled
    ? allTodayTasks.filter((task) => task.importance === 'essential')
    : allTodayTasks;

  // Plans widget: a short 3-item preview by default, expandable in place to the
  // full day via the "•••" strip — no separate cap/overflow-nudge mechanism.
  const planPreviewCount = 3;
  const [plansExpanded, setPlansExpanded] = useState(false);
  const plansTasks = plansExpanded ? visibleTodayTasks : visibleTodayTasks.slice(0, planPreviewCount);

  const backlog = backlogTasksFn(today);
  const completedCount = completedCountFn();

  // Progress: completed vs. total tasks for today (including done ones)
  const totalToday = allTodayTasks.length;
  const completedToday = allTodayTasks.filter((t) => t.done).length;
  const progressRatio = totalToday > 0 ? completedToday / totalToday : 0;

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
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {updateReady && (
        <View style={[styles.workBanner, { backgroundColor: theme.green }]}>
          <Text style={styles.workBannerText}>{t.updateReadyBanner}</Text>
          <Pressable style={styles.overrideBtn} onPress={() => Updates.reloadAsync()}>
            <Text style={styles.overrideBtnText}>{t.updateRestartBtn}</Text>
          </Pressable>
        </View>
      )}
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
                style={[
                  styles.iconBtn,
                  styles.focusBtn,
                  {
                    backgroundColor: settings.essentialsModeEnabled ? theme.orangeLight : theme.grayLight,
                    borderColor: settings.essentialsModeEnabled ? theme.orange : 'transparent',
                  },
                ]}
                onPress={() => settings.update({ essentialsModeEnabled: !settings.essentialsModeEnabled })}
                accessibilityLabel={settings.essentialsModeEnabled ? t.focusActive : t.focusInactive}
              >
                <Ionicons
                  name={settings.essentialsModeEnabled ? 'star' : 'star-outline'}
                  size={16}
                  color={settings.essentialsModeEnabled ? theme.orange : theme.textLight}
                />
                <Text style={[styles.focusBtnLabel, { color: settings.essentialsModeEnabled ? theme.orange : theme.textLight }]}>
                  {t.focusLabel}
                </Text>
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

        {/* Daily progress bar — 4px line, fills as tasks complete */}
        {totalToday > 0 && (
          <View style={[styles.progressTrack, { backgroundColor: theme.grayLight }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.green, width: `${Math.round(progressRatio * 100)}%` }]} />
          </View>
        )}

        <HintCard text={t.hints.home.text} example={t.hints.home.example} />

        {/* Plans — unified preview of today's agenda; tap the title for the full /plans screen */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pressable style={{ flex: 1 }} onPress={() => router.push('/plans')}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {settings.essentialsModeEnabled ? t.essentialPlansTitle : t.plansTitle}
              </Text>
            </Pressable>
            <View style={styles.sectionActions}>
              <Pressable
                style={[styles.shareBtn, { backgroundColor: theme.greenLight }]}
                onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
                accessibilityLabel={t.shareBtnLabel}
              >
                <Ionicons name="share-outline" size={14} color={theme.green} />
              </Pressable>
              <Pressable
                style={[styles.addBtn, { backgroundColor: theme.orange }]}
                onPress={() => router.push('/task-form')}
              >
                <Text style={styles.addBtnText}>{t.addNew}</Text>
              </Pressable>
            </View>
          </View>
          {plansTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                {settings.essentialsModeEnabled ? t.noEssentialPlansToday : t.noPlansToday}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.border }]}>
              <DayTimeline
                tasks={plansTasks}
                onPress={(task) => router.push({ pathname: '/task-form', params: { id: task.id } })}
              />
            </View>
          )}
          {/* Expand/collapse strip — only shown when there's more than the 3-item
              preview to reveal; toggles plansExpanded in place (no navigation). */}
          {visibleTodayTasks.length > planPreviewCount && (
            <Pressable onPress={() => setPlansExpanded((v) => !v)} style={styles.expandStrip}>
              <Text style={[styles.expandStripText, { color: theme.textLight }]}>
                {plansExpanded ? t.plansCollapse : '•••'}
              </Text>
            </Pressable>
          )}
          {settings.essentialsModeEnabled && allTodayTasks.length > visibleTodayTasks.length && (
            <Pressable onPress={() => settings.update({ essentialsModeEnabled: false })}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>
                {t.plansEssentialsHidden(allTodayTasks.length - visibleTodayTasks.length)}
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
      {/* Pets disabled for now */}
      {/* {settings.petEnabled && <Pet completedToday={completedCount} />} */}
      <BubbleMenu onNewTask={() => setQuickAddVisible(true)} />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
  // Calm greeting: rounded semibold (not heavy bold) keeps it low-weight; the
  // muted date label sits quietly beneath it.
  greeting: { fontSize: FontSize.xl, fontFamily: Fonts.semibold },
  dateLabel: { fontSize: FontSize.md, marginTop: 2, textTransform: 'capitalize', fontFamily: Fonts.regular },
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
  focusBtn: {
    width: 'auto', paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full, flexDirection: 'row', gap: 3, borderWidth: 1.5,
  },
  focusBtnLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  progressTrack: {
    height: 4, borderRadius: Radius.full, marginBottom: Spacing.md, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600' },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  shareBtn: { borderRadius: Radius.full, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  addBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
  seeAll: { fontSize: FontSize.sm, fontWeight: '600' },
  card: { borderRadius: Radius.md, padding: Layout.cardPadding, borderWidth: 1, ...Shadow.card },
  // Empty/ahead state: generous padding so a gentle prompt never reads as cramped.
  emptyCard: { borderRadius: Radius.md, padding: Layout.cardPadding, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, fontFamily: Fonts.regular, textAlign: 'center' },
  // "•••" expand/collapse strip beneath the Plans preview — low-weight, centred,
  // toggles plansExpanded in place rather than navigating anywhere.
  expandStrip: { paddingVertical: Spacing.xs, alignItems: 'center' },
  expandStripText: { fontSize: FontSize.md, fontWeight: '600', letterSpacing: 2 },
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
