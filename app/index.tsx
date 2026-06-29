/**
 * index.tsx — Home screen
 *
 * The app's daily landing screen: greeting, a unified Plans widget + backlog, a
 * Shopping widget scoped to the current week's list (tickable inline, both
 * not-yet-in-cart and in-cart items), an expandable Notes preview,
 * gentle completed-count points, and the BottomNav / QuickAddSheet entry points.
 * Honours work mode and essentials (focus) mode, both driven by settings.
 *
 * Connections:
 *   Imports → components/AddFAB, components/AppModal, components/BottomNav, components/DayTimeline, components/ExpandableCard, components/InboxSection, components/NextTaskCard, components/ParticleBackground, components/Pet, components/QuickAddSheet, components/SharedRequestsSection, components/ShoppingRow, components/SiteSwipeView, components/Surface, components/TaskItem, components/cover/CoverScreen, constants/theme, lib/date, lib/holidays, lib/i18n, lib/shoppingGroups (computeListGroups), lib/siteNav, lib/taskOrder, lib/taskSuggestion, lib/useCoverScreen, store/useHabitStore, store/useNotesStore, store/useSettingsStore, store/useShoppingListStore, store/useShoppingStore, store/useTaskStore, store/useUpdateStore
 *   Used by → Expo Router route "/"
 *   Data    → reads useTaskStore (tasks) + useShoppingStore (shopping_items) + useShoppingListStore (lists, for currentList(today)) + useHabitStore (habits, logs) + useNotesStore (notes, preview only); settings via useSettingsStore; useUpdateStore (updateReady) for the restart banner
 *
 * Edit notes:
 *   - ⚙ gear icon (header right) → /settings is the only header icon — Health is a
 *     BottomNav tab again (see lib/siteNav.ts), so it no longer needs one here; habits is
 *     still reached via health's inline summary → /habits, not from this screen directly.
 *   - Notes preview section sits between Backlog and the Shopping preview: up to
 *     NOTES_PREVIEW_LIMIT (3) active notes with a tap-to-toggle checkbox (same interaction
 *     as the Shopping preview rows right below it). Only active notes are shown — checked-off
 *     notes drop out. The section itself ALWAYS renders (title + "See all" link → /notes,
 *     matching the Shopping preview's title+link layout); only the inner body switches
 *     between an empty-state card (t.notes.emptyState) and the note rows — same
 *     always-render-header pattern as Plans/Shopping, not Backlog's hide-when-empty one.
 *     Notes has no BottomNav tab (see lib/siteNav.ts).
 *   - The Plans section header is a plain title + a right-aligned "See everything"
 *     link (t.seeEverythingLink) → /plans, matching the Shopping preview section's
 *     title+link layout — replaces the old pressable-title/chevron + bottom link.
 *   - BubbleMenu mount remains commented out — do not remove.
 *   - "Daily overview" section header now has a "Se alt" link → /plans (same
 *     pattern as Notes and Shopping preview sections).
 *   - The update-ready banner mirrors the work-mode banner's look (theme.green
 *     pill) and calls Updates.reloadAsync() directly on tap — app/_layout.tsx
 *     only sets the updateReady flag, never auto-reloads or pops an Alert.
 *   - Plans are ranked "what do I need right now?": undone first, then
 *     time-anchored (time-box/time) earliest, then essentials. The Plans widget
 *     shows a 3-item preview (planPreviewCount) via DayTimeline; tapping the
 *     "•••" strip toggles plansExpanded to show the full day in place. Tapping
 *     the "See everything" link navigates to the full /plans screen (same ranking
 *     logic duplicated there by design — see app/plans.tsx).
 *   - Greeting is intentionally low-weight (Fonts.semibold, FontSize.xl); cards use
 *     Layout.cardPadding for a consistent calm rhythm.
 *   - All visible strings go through useT(); today is todayStr() (YYYY-MM-DD).
 *   - Work mode auto-activates only within work hours and not on weekends/holidays (isWeekendOrHoliday); session override disables it.
 *   - The Share button navigates to the /share-modal modal with params { kind: 't' }; the link icon next to it goes to /shared (full sent/received history). DayTimeline rows push /task-form (also a modal).
 *   - Cross-site links (settings gear, plans "see everything" link, shared link, shopping "see all") go through
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
 *   - Shopping widget is scoped to useShoppingListStore.currentList(today) (in-range else
 *     most-recent fallback) — collapsed shows just that list's name; expanded renders its
 *     dish groups (ExpandableCard, via lib/shoppingGroups.computeListGroups), then
 *     ungrouped-unchecked (reorderable via reorder()), then checked/in-cart (with
 *     onCollect → toggleCollected), each row a ShoppingRow with the same
 *     toggle/remove(fromCatalog→putBackToInventory else removeWithSource) wiring
 *     app/shopping.tsx uses for WeekListCard. No current list → t.shoppingEmpty.
 *   - Notes preview's "•••"/t.notesCollapse strip below the card toggles notesExpanded
 *     the same way the Plans "•••"/t.plansCollapse strip toggles plansExpanded.
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
import { useShoppingStore, ShoppingItem } from '@/store/useShoppingStore';
import { useShoppingListStore } from '@/store/useShoppingListStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useNotesStore } from '@/store/useNotesStore';
import { useUpdateStore } from '@/store/useUpdateStore';
import * as Updates from 'expo-updates';
import { useT } from '@/lib/i18n';
import { rankTodayTasks } from '@/lib/taskOrder';
import { computeListGroups } from '@/lib/shoppingGroups';
import TaskItem from '@/components/TaskItem';
import ShoppingRow from '@/components/ShoppingRow';
import ExpandableCard from '@/components/ExpandableCard';
import DayTimeline from '@/components/DayTimeline';
// TODO: re-enable bubble menu once redesigned
// import BubbleMenu from '@/components/BubbleMenu';
import ParticleBackground from '@/components/ParticleBackground';
import BottomNav, { BOTTOM_NAV_HEIGHT } from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { goToSite } from '@/lib/siteNav';
import Pet from '@/components/Pet';
import QuickAddSheet from '@/components/QuickAddSheet';
import InboxSection from '@/components/InboxSection';
import SharedRequestsSection from '@/components/SharedRequestsSection';
import Surface from '@/components/Surface';
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
  const toggleShoppingCollected = useShoppingStore((s) => s.toggleCollected);
  const putShoppingItemBackToInventory = useShoppingStore((s) => s.putBackToInventory);
  const removeShoppingItemWithSource = useShoppingStore((s) => s.removeWithSource);
  const reorderShoppingItem = useShoppingStore((s) => s.reorder);
  const shoppingLists = useShoppingListStore((s) => s.lists);
  const currentShoppingListFn = useShoppingListStore((s) => s.currentList);
  const habits = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const notes = useNotesStore((s) => s.notes);
  const toggleNoteChecked = useNotesStore((s) => s.toggleChecked);
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

  // Shopping widget: scoped to the current week's list only (not a global merge
  // across every list) — collapsed shows just that list's name, expanded shows its
  // dish groups / ungrouped unchecked / checked sections with the same row
  // interactivity as app/shopping.tsx's Week lists tab.
  const [shoppingExpanded, setShoppingExpanded] = useState(false);
  const currentShoppingList = useMemo(
    () => currentShoppingListFn(today),
    [currentShoppingListFn, shoppingLists, today]
  );
  const { dishGroups: shoppingDishGroups, ungroupedUnchecked: shoppingUngroupedUnchecked, checked: shoppingChecked } = useMemo(
    () => (currentShoppingList ? computeListGroups(shoppingItems, currentShoppingList.id) : { dishGroups: [], ungroupedUnchecked: [], checked: [] }),
    [shoppingItems, currentShoppingList]
  );

  // Notes preview: only active (unchecked) notes — same tap-to-toggle interaction
  // as the Shopping preview below it, and hidden entirely when there's nothing
  // active to show (mirrors the Backlog section's hide-when-empty pattern).
  const NOTES_PREVIEW_LIMIT = 3;
  const activeNotes = useMemo(() => notes.filter((n) => !n.checked), [notes]);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const notesPreview = useMemo(
    () => (notesExpanded ? activeNotes : activeNotes.slice(0, NOTES_PREVIEW_LIMIT)),
    [activeNotes, notesExpanded]
  );

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

  // Mirrors app/shopping.tsx's handleRemoveWeeklyItem: rows sourced from the Monthly
  // catalog go back to inventory instead of being deleted outright.
  function handleRemoveShoppingItem(item: ShoppingItem) {
    if (item.fromCatalog) {
      putShoppingItemBackToInventory(item.id);
    } else {
      removeShoppingItemWithSource(item.id);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ParticleBackground />
      <View style={styles.watermarkWrap} pointerEvents="none">
        <TreeWatermark size={Math.min(width, height) * 0.7} opacity={0.18} absolute={false} />
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

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.dailyOverview}</Text>
          <Pressable onPress={() => goToSite(router, pathname, '/plans')}>
            <Text style={[styles.seeAll, { color: theme.orange }]}>{t.seeAll}</Text>
          </Pressable>
        </View>

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
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.currentPlansLabel}</Text>
                  <Pressable
                    onPress={() => goToSite(router, pathname, '/plans')}
                    accessibilityRole="button"
                    accessibilityLabel={t.home.seeAllPlans}
                  >
                    <Text style={[styles.seeAll, { color: theme.orange }]}>{t.seeEverythingLink}</Text>
                  </Pressable>
                </View>
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
                {plansTasks.length > 0 && (
                  <View style={styles.timelineContainer}>
                    <DayTimeline
                      tasks={plansTasks}
                      onPress={(task) => router.push({ pathname: '/task-form', params: { id: task.id } })}
                      onToggle={(task) => handleToggleTask(task.id)}
                    />
                  </View>
                )}
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

        {/* Habits preview */}
        {habits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.nav.habits}</Text>
              <Pressable onPress={() => goToSite(router, pathname, '/habits')}>
                <Text style={[styles.seeAll, { color: theme.orange }]}>{t.seeAll}</Text>
              </Pressable>
            </View>
            <Surface style={styles.card}>
              {habits.slice(0, 3).map((habit) => {
                const log = habitLogs.find((l) => l.habitId === habit.id && l.logDate === today);
                const count = log?.count ?? 0;
                const isDone = count >= habit.dailyGoal;
                const accent = habit.kind === 'break' ? '#4A8EC2' : theme.green;
                return (
                  <Pressable
                    key={habit.id}
                    style={styles.habitPreviewRow}
                    onPress={() => router.push('/habits')}
                  >
                    <View style={styles.habitPreviewLeft}>
                      <Text style={[styles.habitPreviewName, { color: theme.text }]} numberOfLines={1}>
                        {habit.title}
                      </Text>
                      <Text style={[styles.habitPreviewProgress, { color: isDone ? accent : theme.textLight }]}>
                        {count}/{habit.dailyGoal}
                      </Text>
                    </View>
                    {isDone && (
                      <View style={[styles.habitDoneBadge, { backgroundColor: accent }]}>
                        <Text style={styles.habitDoneBadgeText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Surface>
          </View>
        )}

        {/* Notes preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.notes.title}</Text>
            <Pressable onPress={() => goToSite(router, pathname, '/notes')}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>{t.seeAll}</Text>
            </Pressable>
          </View>
          {activeNotes.length === 0 ? (
            <Surface tint={theme.offWhite} style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.notes.emptyState}</Text>
            </Surface>
          ) : (
            <Surface style={styles.card}>
              {notesPreview.map((note) => (
                <Pressable
                  key={note.id}
                  style={styles.notePreviewRow}
                  onPress={() => toggleNoteChecked(note.id)}
                >
                  <View style={[styles.noteCheck, { borderColor: theme.orange }]} />
                  <Text style={[styles.notePreviewName, { color: theme.text }]} numberOfLines={1}>
                    {note.header.trim() || t.notes.headerPlaceholder}
                  </Text>
                </Pressable>
              ))}
            </Surface>
          )}
          {activeNotes.length > NOTES_PREVIEW_LIMIT && (
            <Pressable onPress={() => setNotesExpanded((v) => !v)} style={styles.expandStrip}>
              <Text style={[styles.expandStripText, { color: theme.textLight }]}>
                {notesExpanded ? t.notesCollapse : '•••'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Shopping widget — scoped to the current week's list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.shoppingPreview}</Text>
            <Pressable onPress={() => goToSite(router, pathname, '/shopping')}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>{t.seeAll}</Text>
            </Pressable>
          </View>
          {!currentShoppingList ? (
            <Surface tint={theme.offWhite} style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.shoppingEmpty}</Text>
            </Surface>
          ) : (
            <Surface style={styles.card}>
              <Pressable style={styles.shoppingWidgetHeader} onPress={() => setShoppingExpanded((v) => !v)}>
                <Text style={[styles.shoppingWidgetListName, { color: theme.text }]} numberOfLines={1}>
                  {currentShoppingList.name}
                </Text>
                <Ionicons name={shoppingExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textLight} />
              </Pressable>

              {shoppingExpanded && (
                <View style={styles.shoppingWidgetBody}>
                  {shoppingDishGroups.length > 0 && (
                    <View style={styles.dishGroupsWrap}>
                      {shoppingDishGroups.map(([dishName, groupItems]) => (
                        <ExpandableCard
                          key={dishName}
                          title={dishName}
                          subtitle={t.ingredientsCount(groupItems.length)}
                          accentColor={theme.green}
                          defaultOpen={false}
                        >
                          {groupItems.map((item, idx) => (
                            <View key={item.id}>
                              <ShoppingRow
                                item={item}
                                theme={theme}
                                variant="planned"
                                onToggle={() => toggleShoppingItem(item.id)}
                                onRemove={() => handleRemoveShoppingItem(item)}
                                inStockLabel={t.inStockLabel}
                              />
                              {idx < groupItems.length - 1 && (
                                <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                              )}
                            </View>
                          ))}
                        </ExpandableCard>
                      ))}
                    </View>
                  )}

                  {shoppingUngroupedUnchecked.length > 0 && (
                    <View style={styles.shoppingSection}>
                      <Text style={[styles.sectionLabel, { color: theme.green }]}>{t.inWeeklyListSection}</Text>
                      {shoppingUngroupedUnchecked.map((item, idx) => (
                        <View key={item.id}>
                          <ShoppingRow
                            item={item}
                            theme={theme}
                            variant="planned"
                            onToggle={() => toggleShoppingItem(item.id)}
                            onRemove={() => handleRemoveShoppingItem(item)}
                            onMoveUp={idx > 0 ? () => reorderShoppingItem(item.id, 'up') : undefined}
                            onMoveDown={idx < shoppingUngroupedUnchecked.length - 1 ? () => reorderShoppingItem(item.id, 'down') : undefined}
                            inStockLabel={t.inStockLabel}
                          />
                          {idx < shoppingUngroupedUnchecked.length - 1 && (
                            <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {shoppingChecked.length > 0 && (
                    <View style={styles.shoppingSection}>
                      <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.inKurvenSection(shoppingChecked.length)}</Text>
                      {shoppingChecked.map((item, idx) => (
                        <View key={item.id}>
                          <ShoppingRow
                            item={item}
                            theme={theme}
                            variant="cart"
                            onToggle={() => toggleShoppingItem(item.id)}
                            onCollect={() => toggleShoppingCollected(item.id)}
                            onRemove={() => handleRemoveShoppingItem(item)}
                          />
                          {idx < shoppingChecked.length - 1 && (
                            <View style={[styles.rowDivider, { backgroundColor: theme.grayLight }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {shoppingDishGroups.length === 0 && shoppingUngroupedUnchecked.length === 0 && shoppingChecked.length === 0 && (
                    <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.shoppingEmpty}</Text>
                  )}
                </View>
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
  shoppingWidgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  shoppingWidgetListName: { fontSize: FontSize.md, fontFamily: Fonts.semibold, flex: 1 },
  shoppingWidgetBody: { gap: Spacing.md, marginTop: Spacing.sm },
  shoppingSection: { gap: Spacing.xs },
  dishGroupsWrap: { gap: Spacing.xs },
  rowDivider: { height: 1 },
  notePreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm, minHeight: 44 },
  noteCheck: { width: 18, height: 18, borderRadius: Radius.full, borderWidth: 2 },
  notePreviewName: { fontSize: FontSize.md, flex: 1, fontFamily: Fonts.regular },
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
  doneHeaderToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  doneTasksList: { marginTop: Spacing.sm },
  habitPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  habitPreviewLeft: {
    flex: 1,
    gap: 2,
  },
  habitPreviewName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semibold,
  },
  habitPreviewProgress: {
    fontSize: FontSize.xs,
  },
  habitDoneBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitDoneBadgeText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontFamily: Fonts.bold,
  },
  pointsCard: { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg },
  pointsText: { fontSize: FontSize.sm, fontFamily: Fonts.medium, textAlign: 'center' },
});
