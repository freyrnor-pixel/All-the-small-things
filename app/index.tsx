/**
 * index.tsx — Home screen
 *
 * The app's daily landing screen: greeting, a unified Plans widget + backlog, a
 * weekly shopping preview (tickable inline, both not-yet-in-cart and in-cart items),
 * gentle completed-count points, and the BottomNav / QuickAddSheet entry points.
 * Honours work mode and essentials (focus) mode, both driven by settings.
 *
 * Connections:
 *   Imports → components/AddFAB, components/AppModal, components/BottomNav, components/DayTimeline, components/InboxSection, components/NextTaskCard, components/Pet, components/QuickAddSheet, components/HomeHeroBackground, components/SharedRequestsSection, components/SiteSwipeView, components/Surface, components/TaskItem, components/cover/CoverScreen, constants/theme, lib/date, lib/holidays, lib/i18n, lib/siteNav, lib/taskOrder, lib/taskSuggestion, lib/useCoverScreen, store/useHabitStore, store/useSettingsStore, store/useShoppingStore, store/useTaskStore, store/useUpdateStore
 *   Used by → Expo Router route "/"
 *   Data    → reads useTaskStore (tasks) + useShoppingStore (shopping_items) + useHabitStore (habits, logs); settings via useSettingsStore; useUpdateStore (updateReady) for the restart banner
 *
 * Edit notes:
 *   - Added ⚙ gear icon (header right) → /settings.
 *   - "Today's Plans" title row is now pressable → /plans (chevron affordance).
 *   - BubbleMenu mount remains commented out — do not remove.
 *   - "Daily overview" is a plain section header (t.dailyOverview).
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
 *   - When useCoverScreen() returns true (Galaxy Z Flip cover display), CoverScreen is rendered instead of the full home UI.
 *   - Backlog section uses theme.neutral (not danger/red) — no shame framing.
 *   - Pet companion is shown when settings.petEnabled (set during onboarding step6 or via Settings).
 *   - InboxSection (AP-02) sits right under the "Daily overview" header —
 *     lists whatever's currently captured via app/capture.tsx and renders nothing
 *     when the inbox is empty (mirrors the Backlog section's hide-when-empty pattern
 *     further down, since capture is incidental/optional, not a permanent fixture).
 *   - `tasks` is selected directly from useTaskStore (not just the tasksForDate/backlogTasks/completedCount
 *     function refs, which are stable and never change identity) — without it, toggling a task wouldn't
 *     re-render this screen at all, since none of the other selected slices change. Keep it even though
 *     it looks unused; it's a re-render trigger + a useMemo dep.
 *   - Shopping preview shows weekly items unchecked-first then checked/in-cart, capped at
 *     PREVIEW_LIMIT total. Tapping a row calls toggleCheck directly — it flips `checked`
 *     immediately (no staging/Save step), same as app/shopping.tsx.
 *   - Tasks also auto-save on toggle (useTaskStore.toggle()) — no Save button for tasks.
 *     The Plans-preview header's "+" is an inline AddFAB (size="sm") → /task-form, the
 *     only "add new" control on this screen.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useUpdateStore } from '@/store/useUpdateStore';
import * as Updates from 'expo-updates';
import { useT } from '@/lib/i18n';
import { rankTodayTasks } from '@/lib/taskOrder';
import TaskItem from '@/components/TaskItem';
import DayTimeline from '@/components/DayTimeline';
// TODO: re-enable bubble menu once redesigned
// import BubbleMenu from '@/components/BubbleMenu';
import BottomNav, { BOTTOM_NAV_HEIGHT } from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { goToSite } from '@/lib/siteNav';
import Pet from '@/components/Pet';
import QuickAddSheet from '@/components/QuickAddSheet';
import InboxSection from '@/components/InboxSection';
import SharedRequestsSection from '@/components/SharedRequestsSection';
import Surface from '@/components/Surface';
import HomeHeroBackground from '@/components/HomeHeroBackground';
import { showAppModal } from '@/components/AppModal';
import TreeWatermark from '@/components/TreeWatermark';
import CoverScreen from '@/components/cover/CoverScreen';
import { useCoverScreen } from '@/lib/useCoverScreen';
import { todayStr, dayOfWeekMon0 } from '@/lib/date';
import { isWeekendOrHoliday } from '@/lib/holidays';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Shadow, Spacing, Layout, Fonts } from '@/constants/theme';
import { useAppTheme, useIsDark, useScaledStyles } from '@/lib/useAppTheme';
import AddFAB from '@/components/AddFAB';
import { StatusBar } from 'expo-status-bar';

// Enable LayoutAnimation on Android for smooth task row animations
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

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
    // no work mode on days off. Also respects the user's configured work days.
    const now = new Date();
    if (
      settings.enforceWorkHours &&
      isWithinWorkHours(settings.workHoursStart, settings.workHoursEnd) &&
      !isWeekendOrHoliday(now, settings.holidaysEnabled) &&
      settings.workDays.includes(dayOfWeekMon0(now))
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
    settings.workDays,
  ]);

  // Single clear purpose on open — "what do I need right now?": surface today's
  // tasks in priority order (undone first, then timed/time-box items earliest,
  // then essentials), so the most actionable things sit at the top.
  const allTodayTasks = useMemo(
    () => rankTodayTasks(tasksForDate(today)),
    [tasks, tasksForDate, today]
  );

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
  const doneTodayTasks = useMemo(
    () => allTodayTasks.filter((t) => t.done),
    [allTodayTasks]
  );
  const [doneTasksExpanded, setDoneTasksExpanded] = useState(false);

  // Get the first undone task for "Neste på tur" section
  const nextUndoneTodayTask = useMemo(
    () => visibleTodayTasks.find((t) => !t.done) || null,
    [visibleTodayTasks]
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
    // Get the current task to check if it's being marked as done
    const task = tasks.find((t) => t.id === id);
    const isMarkingDone = task && !task.done;

    // When marking a task as done, animate the list change smoothly
    // The glow animation (400ms) + row exit (250ms) = 650ms total
    if (isMarkingDone) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    toggleTask(id);
  }

  function handleWorkModeOverride() {
    showAppModal(t.switchModeTitle, t.switchModeBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.switchModeConfirm, onPress: () => settings.setWorkModeSessionOverride(true) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <HomeHeroBackground />
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
          <Text style={[styles.essentialsBannerText, { color: theme.brown, backgroundColor: 'transparent' }]}>{t.focusBanner}</Text>
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
                accessibilityLabel={t.nav.settingsLabel}
                hitSlop={12}
              >
                <Ionicons name="settings-outline" size={22} color={theme.textLight} />
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

        <InboxSection />

        <SharedRequestsSection kind="task" />

        {/* Unified Plans card: Neste på tur + Dagens planer + Ferdig i dag */}
        {plansTasks.length === 0 && doneTodayTasks.length === 0 ? (
          <View style={styles.section}>
            <Surface tint={theme.offWhite} style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                {settings.essentialsModeEnabled ? t.noEssentialPlansToday : t.noPlansToday}
              </Text>
            </Surface>
          </View>
        ) : (
          <View style={styles.section}>
            <Surface style={styles.card}>
              {/* Section A: Neste på tur (next upcoming task) */}
              {nextUndoneTodayTask && (
                <View>
                  <View style={styles.nextTaskSection}>
                    <View>
                      <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.nextTaskLabel}</Text>
                      <Text style={[styles.nextTaskTitle, { color: theme.text }]}>{nextUndoneTodayTask.title}</Text>
                      {nextUndoneTodayTask.time && (
                        <Text style={[styles.nextTaskTime, { color: theme.textLight }]}>{nextUndoneTodayTask.time}</Text>
                      )}
                    </View>
                    <Pressable
                      style={[styles.markDoneBtn, { backgroundColor: theme.green }]}
                      onPress={() => handleToggleTask(nextUndoneTodayTask.id)}
                    >
                      <Text style={styles.markDoneBtnText}>✓ {t.done}</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
                </View>
              )}

              {/* Section B: Dagens planer (timeline) */}
              <View>
                <View style={styles.plansHeader}>
                  <Pressable
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
                    onPress={() => goToSite(router, pathname, '/plans')}
                    accessibilityRole="button"
                    accessibilityLabel={t.home.seeAllPlans}
                  >
                    <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.currentPlansLabel}</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textLight} />
                  </Pressable>
                  <View style={styles.plansActions}>
                    <Pressable onPress={() => goToSite(router, pathname, '/shared')} hitSlop={8}>
                      <Ionicons name="link-outline" size={14} color={theme.textLight} />
                    </Pressable>
                    <Pressable
                      style={[styles.shareBtnSmall, { backgroundColor: theme.orangeLight }]}
                      onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
                      accessibilityLabel={t.shareBtnLabel}
                    >
                      <Text style={[styles.shareBtnSmallText, { color: theme.text }]}>{t.shareBtnLabel}</Text>
                    </Pressable>
                    <AddFAB size="sm" onPress={() => router.push('/task-form')} />
                  </View>
                </View>
                {plansTasks.length > 0 && (
                  <View style={styles.timelineContainer}>
                    <DayTimeline
                      tasks={plansTasks}
                      onPress={(task) => router.push({ pathname: '/task-form', params: { id: task.id } })}
                      onToggle={(task) => handleToggleTask(task.id)}
                    />
                  </View>
                )}
                <Pressable
                  style={styles.seeWeekBtn}
                  onPress={() => goToSite(router, pathname, '/plans')}
                >
                  <Text style={[styles.seeWeekBtnText, { color: theme.orange }]}>{t.seeAllWeekPlans}</Text>
                </Pressable>
              </View>

              {/* Section C: Ferdig i dag (completed, collapsible) */}
              {doneTodayTasks.length > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.grayLight }]} />
                  <Pressable
                    style={styles.doneHeaderToggle}
                    onPress={() => setDoneTasksExpanded(!doneTasksExpanded)}
                  >
                    <Ionicons
                      name={doneTasksExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={18}
                      color={theme.text}
                    />
                    <Text style={[styles.sectionLabel, { color: theme.text }]}>
                      {t.doneTasksLabel} ({doneTodayTasks.length})
                    </Text>
                  </Pressable>
                  {doneTasksExpanded && (
                    <View style={styles.doneTasksList}>
                      {doneTodayTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={() => handleToggleTask(task.id)}
                          onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
            </Surface>
            {/* Expand/collapse strip for preview → full day */}
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
        )}

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
              {weeklyPreview.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.shoppingPreviewRow, item.checked && { opacity: 0.5 }]}
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
                      item.checked && { color: theme.gray, textDecorationLine: 'line-through' },
                    ]}
                  >
                    {item.amount}{item.unit ? ` ${item.unit}` : ''} {item.name}
                  </Text>
                </Pressable>
              ))}
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

        <View style={{ height: BOTTOM_NAV_HEIGHT }} />
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
  workBannerText: { color: '#ffffff', fontFamily: Fonts.semibold, fontSize: FontSize.sm },
  overrideBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  overrideBtnText: { color: '#ffffff', fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  essentialsBanner: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, alignItems: 'center',
  },
  essentialsBannerText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  // Calm greeting: rounded semibold (not heavy bold) keeps it low-weight; the
  // muted date label sits quietly beneath it.
  greeting: { fontSize: FontSize.xxl, fontFamily: Fonts.semibold },
  dateLabel: { fontSize: FontSize.sm, marginTop: Spacing.xs, textTransform: 'capitalize', fontFamily: Fonts.regular },
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
    width: 44, height: 44, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  focusBtn: {
    width: 'auto', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, flexDirection: 'row', gap: Spacing.xs, borderWidth: 1.5,
  },
  focusBtnLabel: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  progressTrack: {
    height: 4, borderRadius: Radius.full, marginBottom: Spacing.md, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontFamily: Fonts.semibold },
  dailyOverviewHeader: { fontSize: FontSize.md, fontFamily: Fonts.semibold, marginBottom: Spacing.md },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 },
  seeAll: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  card: { borderRadius: Radius.md, padding: Layout.cardPadding, borderWidth: 1, ...Shadow.card },
  // Empty/ahead state: generous padding so a gentle prompt never reads as cramped.
  emptyCard: { borderRadius: Radius.md, padding: Layout.cardPadding, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, fontFamily: Fonts.regular, textAlign: 'center' },
  // "•••" expand/collapse strip beneath the Plans preview — low-weight, centred,
  // toggles plansExpanded in place rather than navigating anywhere.
  expandStrip: { paddingVertical: Spacing.md, alignItems: 'center' },
  expandStripText: { fontSize: FontSize.md, fontFamily: Fonts.semibold, letterSpacing: 1 },
  shoppingPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm, minHeight: 44 },
  shoppingCheck: { width: 18, height: 18, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  shoppingPreviewName: { fontSize: FontSize.md, flex: 1, fontFamily: Fonts.regular },
  moreText: { fontSize: FontSize.sm, marginTop: Spacing.md, textAlign: 'right', fontFamily: Fonts.regular },
  backlogHint: { fontSize: FontSize.xs, marginTop: Spacing.md, textAlign: 'center', fontStyle: 'italic', fontFamily: Fonts.regular },
  backlogLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backlogBadge: {
    borderRadius: Radius.full,
    minWidth: 24,
    height: 24,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backlogBadgeText: { color: '#ffffff', fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  // Merged Dagens planer card sections
  sectionLabel: { fontSize: FontSize.xs, fontFamily: Fonts.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
  nextTaskSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md },
  nextTaskTitle: { fontSize: FontSize.md, fontFamily: Fonts.semibold, marginVertical: Spacing.xs },
  nextTaskTime: { fontSize: FontSize.sm, fontFamily: Fonts.regular },
  markDoneBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 40 },
  markDoneBtnText: { color: '#ffffff', fontFamily: Fonts.semibold, fontSize: FontSize.sm },
  divider: { height: 1, marginVertical: Spacing.md },
  plansHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, paddingVertical: Spacing.sm },
  plansActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  shareBtnSmall: { borderRadius: Radius.full, paddingHorizontal: Spacing.xs, paddingVertical: 4 },
  shareBtnSmallText: { fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  timelineContainer: { marginVertical: Spacing.md },
  seeWeekBtn: { paddingVertical: Spacing.md, alignItems: 'center' },
  seeWeekBtnText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  doneHeaderToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  doneTasksList: { marginTop: Spacing.sm },
  pointsCard: { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg },
  pointsText: { fontSize: FontSize.sm, fontFamily: Fonts.medium, textAlign: 'center' },
});
