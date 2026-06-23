/**
 * index.tsx — Home screen
 *
 * The app's daily landing screen: greeting, a unified Plans widget + backlog, a
 * weekly shopping preview (tickable inline, both not-yet-in-cart and in-cart items),
 * gentle completed-count points, and the BottomNav / QuickAddSheet entry points.
 * Honours work mode and essentials (focus) mode, both driven by settings.
 *
 * Connections:
 *   Imports → components/BottomNav, components/DayTimeline, components/EnergyCheckIn, components/HintCard, components/InboxSection, components/NextTaskCard, components/Pet, components/QuickAddSheet, components/ScreenBackground, components/SharedRequestsSection, components/SiteSwipeView, components/Surface, components/TaskItem, components/cover/CoverScreen, constants/theme, lib/date, lib/holidays, lib/i18n, lib/siteNav, lib/taskOrder, lib/taskSuggestion, lib/useCoverScreen, store/useEnergyStore, store/useHabitStore, store/useSettingsStore, store/useShoppingStore, store/useTaskStore, store/useUpdateStore
 *   Used by → Expo Router route "/"
 *   Data    → reads useTaskStore (tasks) + useShoppingStore (shopping_items + pending) + useHabitStore (habits, logs) + useEnergyStore (today's energy level); settings via useSettingsStore; useUpdateStore (updateReady) for the restart banner
 *
 * Edit notes:
 *   - "Daily overview" is a plain section header (t.dailyOverview); the HintCard right
 *     below it is purely the ⭐ focus-mode instruction (t.hints.home.text) — keep these
 *     two separate, don't recombine them into one string.
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
 *   - The Share button navigates to the /share-modal modal with params { kind: 't' }; the link icon next to it goes to /shared (full sent/received history). DayTimeline rows push /task-form (also a modal).
 *   - Cross-site links (settings gear, plans title, shared link, shopping "see all") go through
 *     goToSite() (lib/siteNav.ts), not router.push, so the nav stack stays shallow and hardware/
 *     gesture "back" from any site returns straight to Home. The ScrollView is wrapped in
 *     SiteSwipeView so swiping left/right also moves between sites (vertical scroll still native).
 *   - SharedRequestsSection (kind='task') sits right under InboxSection — inline accept/dismiss for tasks a partner asked for via the scan flow, replacing the old bubble-wheel "Shared" entry.
 *   - Settings gear is absolutely positioned top-right (zIndex 10); navigates to /settings.
 *   - When useCoverScreen() returns true (Galaxy Z Flip cover display), CoverScreen is rendered instead of the full home UI.
 *   - Backlog section uses theme.neutral (not danger/red) — no shame framing.
 *   - Pet companion is shown when settings.petEnabled (set during onboarding step6 or via Settings).
 *   - InboxSection (AP-02) sits right under the home HintCard, above EnergyCheckIn —
 *     lists whatever's currently captured via app/capture.tsx and renders nothing
 *     when the inbox is empty (mirrors the Backlog section's hide-when-empty pattern
 *     further down, since capture is incidental/optional, not a permanent fixture).
 *   - EnergyCheckIn sits above the Plans section; on a 'low' energy day, visibleTodayTasks
 *     is narrowed further to priority === 'high' tasks, strictly on top of the essentials
 *     filter (never as a replacement for it).
 *   - NextTaskCard (AP-04) sits between EnergyCheckIn and the Plans section, fed by
 *     suggestNextTask() (lib/taskSuggestion.ts) — a separate "single best next thing"
 *     ranking from rankTodayTasks()'s whole-list ordering used by the Plans widget below;
 *     mounted unconditionally — it shows its own "caught up" empty state when there's
 *     no suggestion, rather than disappearing.
 *   - `tasks` is selected directly from useTaskStore (not just the tasksForDate/backlogTasks/completedCount
 *     function refs, which are stable and never change identity) — without it, toggling a task wouldn't
 *     re-render this screen at all, since none of the other selected slices change. Keep it even though
 *     it looks unused; it's a re-render trigger + a useMemo dep.
 *   - BubbleMenu is disabled (commented out, not deleted — see the TODO at its old mount point);
 *     BottomNav (Home/Shopping/Meals/Health/Habits) replaces it as the nav entry point. This
 *     also removes BubbleMenu's center-button trigger for QuickAddSheet — quickAddVisible/
 *     setQuickAddVisible and the <QuickAddSheet> mount are kept (task creation still works via
 *     /task-form), but the sheet itself has no UI entry point until the menu is redesigned.
 *   - Shopping preview shows weekly items unchecked-first then checked/in-cart, capped at
 *     PREVIEW_LIMIT total, reading the same `pending`/`checked` state app/shopping.tsx uses —
 *     checking an item here goes through the same pending→Save flow as the rest of the app.
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { useUpdateStore } from '@/store/useUpdateStore';
import * as Updates from 'expo-updates';
import { useT } from '@/lib/i18n';
import { rankTodayTasks } from '@/lib/taskOrder';
import { suggestNextTask } from '@/lib/taskSuggestion';
import TaskItem from '@/components/TaskItem';
import DayTimeline from '@/components/DayTimeline';
// TODO: re-enable bubble menu once redesigned
// import BubbleMenu from '@/components/BubbleMenu';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { goToSite } from '@/lib/siteNav';
import Pet from '@/components/Pet';
import QuickAddSheet from '@/components/QuickAddSheet';
import HintCard from '@/components/HintCard';
import EnergyCheckIn from '@/components/EnergyCheckIn';
import NextTaskCard from '@/components/NextTaskCard';
import InboxSection from '@/components/InboxSection';
import SharedRequestsSection from '@/components/SharedRequestsSection';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import TreeWatermark from '@/components/TreeWatermark';
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
  const pathname = usePathname();
  const today = todayStr();
  const settings = useSettingsStore();
  const t = useT();
  const theme = useAppTheme();
  const { isCoverScreen } = useCoverScreen();
  const isDark = useIsDark();
  const styles = useScaledStyles(baseStyles);
  const { width, height } = useWindowDimensions();

  const tasks = useTaskStore((s) => s.tasks);
  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const backlogTasksFn = useTaskStore((s) => s.backlogTasks);
  const completedCountFn = useTaskStore((s) => s.completedCount);
  const toggleTask = useTaskStore((s) => s.toggle);
  const taskPendingCount = useTaskStore((s) => s.getPendingCount());
  const confirmTasksPending = useTaskStore((s) => s.confirmPending);
  const shoppingItems = useShoppingStore((s) => s.items);
  const shoppingPending = useShoppingStore((s) => s.pending);
  const toggleShoppingItem = useShoppingStore((s) => s.toggleCheck);
  const shoppingPendingCount = useShoppingStore((s) => s.getPendingCount());
  const confirmShoppingPending = useShoppingStore((s) => s.confirmPending);
  const habits = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const energyLevels = useEnergyStore((s) => s.levels);
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
  const allTodayTasks = useMemo(
    () => rankTodayTasks(tasksForDate(today)),
    [tasks, tasksForDate, today]
  );

  const essentialsFilteredTasks = settings.essentialsModeEnabled
    ? allTodayTasks.filter((task) => task.importance === 'essential')
    : allTodayTasks;
  // Low-energy day: narrow further to must-dos only, on top of (never instead
  // of) the essentials/work-mode filter above.
  const todayEnergyLevel = energyLevels[today] ?? null;
  const visibleTodayTasks = todayEnergyLevel === 'low'
    ? essentialsFilteredTasks.filter((task) => task.priority === 'high')
    : essentialsFilteredTasks;

  // The single "best next thing" — separate ranking from the Plans list above,
  // folding in priority + today's energy level (see lib/taskSuggestion.ts).
  const nextTask = useMemo(
    () => suggestNextTask(tasksForDate(today), today, todayEnergyLevel, isWorkModeActive),
    [tasks, tasksForDate, today, todayEnergyLevel, isWorkModeActive]
  );

  // Plans widget: a short 3-item preview by default, expandable in place to the
  // full day via the "•••" strip — no separate cap/overflow-nudge mechanism.
  const planPreviewCount = 3;
  const [plansExpanded, setPlansExpanded] = useState(false);
  const plansTasks = plansExpanded ? visibleTodayTasks : visibleTodayTasks.slice(0, planPreviewCount);

  const backlog = backlogTasksFn(today);
  const completedCount = completedCountFn();
  const doneTodayTasks = useMemo(
    () => allTodayTasks.filter((t) => t.done),
    [allTodayTasks]
  );

  // Progress: completed vs. total tasks for today (including done ones)
  const totalToday = allTodayTasks.length;
  const completedToday = allTodayTasks.filter((t) => t.done).length;
  const progressRatio = totalToday > 0 ? completedToday / totalToday : 0;

  // Shopping preview: unchecked (not-yet-in-cart) items first, then checked
  // (in-cart) ones below, capped to PREVIEW_LIMIT total — lets a full shopping
  // run happen from this widget alone (moving items to cart and back).
  const PREVIEW_LIMIT = 5;
  const weeklyUnchecked = useMemo(
    () => shoppingItems.filter((i) => i.listType === 'weekly' && !i.checked),
    [shoppingItems]
  );
  const weeklyChecked = useMemo(
    () => shoppingItems.filter((i) => i.listType === 'weekly' && i.checked),
    [shoppingItems]
  );
  const weeklyPreview = useMemo(
    () => [...weeklyUnchecked, ...weeklyChecked].slice(0, PREVIEW_LIMIT),
    [weeklyUnchecked, weeklyChecked]
  );
  const weeklyTotal = weeklyUnchecked.length + weeklyChecked.length;

  if (!settings.loaded || !settings.setupComplete) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]} />;
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

  function handleSaveChanges() {
    if (taskPendingCount > 0) {
      confirmTasksPending();
    }
    if (shoppingPendingCount > 0) {
      confirmShoppingPending();
    }
  }

  const totalPendingCount = taskPendingCount + shoppingPendingCount;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <View style={styles.watermarkWrap} pointerEvents="none">
        <TreeWatermark size={Math.min(width, height) * 0.7} opacity={0.08} absolute={false} />
      </View>
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

      <SiteSwipeView>
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
                onPress={() => goToSite(router, pathname, '/settings')}
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

        <Text style={[styles.dailyOverviewHeader, { color: theme.text }]}>{t.dailyOverview}</Text>
        <HintCard text={t.hints.home.text} example={t.hints.home.example} />

        <InboxSection />

        <SharedRequestsSection kind="task" />

        <EnergyCheckIn />

        <NextTaskCard task={nextTask} />

        {/* Plans — unified preview of today's agenda; tap the title for the full /plans screen */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pressable style={{ flex: 1 }} onPress={() => goToSite(router, pathname, '/plans')}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {settings.essentialsModeEnabled ? t.essentialPlansTitle : t.plansTitle}
              </Text>
            </Pressable>
            <View style={styles.sectionActions}>
              <Pressable onPress={() => goToSite(router, pathname, '/shared')} hitSlop={8}>
                <Ionicons name="link-outline" size={16} color={theme.textLight} />
              </Pressable>
              <Pressable
                style={styles.shareBtn}
                onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
                accessibilityLabel={t.shareBtnLabel}
              >
                <Ionicons name="share-outline" size={14} color={theme.orange} />
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
            <Surface tint={theme.offWhite} style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                {settings.essentialsModeEnabled ? t.noEssentialPlansToday : t.noPlansToday}
              </Text>
            </Surface>
          ) : (
            <Surface style={styles.card}>
              <DayTimeline
                tasks={plansTasks}
                onPress={(task) => router.push({ pathname: '/task-form', params: { id: task.id } })}
              />
            </Surface>
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
            <Surface tint={theme.offWhite} style={styles.card}>
              {backlog.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleTask(task.id)}
                  onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
                  muted
                />
              ))}
            </Surface>
            <Text style={[styles.backlogHint, { color: theme.textLight }]}>{t.backlogHint}</Text>
          </View>
        )}

        {/* Done/Finished tasks for today */}
        {doneTodayTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.doneTasksSection}</Text>
            </View>
            <Surface style={styles.card}>
              {doneTodayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleTask(task.id)}
                  onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
                />
              ))}
            </Surface>
          </View>
        )}

        {/* Shopping preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.shoppingPreview}</Text>
            <Pressable onPress={() => goToSite(router, pathname, '/shopping')}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>{t.seeAll}</Text>
            </Pressable>
          </View>
          {weeklyPreview.length === 0 ? (
            <Surface tint={theme.offWhite} style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.shoppingEmpty}</Text>
            </Surface>
          ) : (
            <Surface style={styles.card}>
              {weeklyPreview.map((item) => {
                const isItemPending = shoppingPending.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.shoppingPreviewRow, isItemPending && { opacity: 0.5 }]}
                    onPress={() => toggleShoppingItem(item.id)}
                  >
                    <View
                      style={[
                        styles.shoppingCheck,
                        { borderColor: theme.green },
                        item.checked && { backgroundColor: theme.green },
                      ]}
                    >
                      {item.checked && <Ionicons name="checkmark" size={12} color={theme.white} />}
                    </View>
                    <Text
                      style={[
                        styles.shoppingPreviewName,
                        { color: theme.text },
                        (item.checked || isItemPending) && { color: theme.gray, textDecorationLine: 'line-through' },
                      ]}
                    >
                      {item.amount}{item.unit ? ` ${item.unit}` : ''} {item.name}
                    </Text>
                  </Pressable>
                );
              })}
              {weeklyTotal > weeklyPreview.length && (
                <Text style={[styles.moreText, { color: theme.textLight }]}>
                  {t.moreItems(weeklyTotal - weeklyPreview.length)}
                </Text>
              )}
            </Surface>
          )}
        </View>

        {/* Gentle points */}
        {settings.showPoints && completedCount > 0 && (
          <Surface tint={theme.offWhite} style={styles.pointsCard}>
            <Text style={[styles.pointsText, { color: theme.textLight }]}>
              {t.smallThingsCount(completedCount)}
            </Text>
          </Surface>
        )}

        {totalPendingCount > 0 && (
          <View style={styles.saveButtonSection}>
            <Pressable
              style={[styles.saveButton, { backgroundColor: theme.green }]}
              onPress={handleSaveChanges}
            >
              <Text style={styles.saveButtonText}>{t.save}</Text>
              {totalPendingCount > 0 && (
                <Text style={styles.saveButtonCount}>({totalPendingCount})</Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      </SiteSwipeView>

      <QuickAddSheet visible={quickAddVisible} onClose={() => setQuickAddVisible(false)} />
      {settings.petEnabled && <Pet completedToday={completedCount} />}
      {/* TODO: re-enable bubble menu once redesigned */}
      {/* <BubbleMenu onNewTask={() => setQuickAddVisible(true)} /> */}
      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  watermarkWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
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
  dailyOverviewHeader: { fontSize: FontSize.lg, fontFamily: Fonts.semibold },
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
  shoppingPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: Spacing.sm },
  shoppingCheck: { width: 18, height: 18, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
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
  saveButtonSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  saveButton: { borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.xs },
  saveButtonText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  saveButtonCount: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
});
