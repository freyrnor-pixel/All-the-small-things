/**
 * plans.tsx — Plans screen: one padlock-free Container per task, plus an "Unsaved" section.
 *
 * Renders the day's ranked tasks (rankTodayTasks, same energy-level high-priority filter as
 * app/index.tsx) as a stack of components/PlanTaskCard.tsx accordions instead of the old
 * single DayTimeline agenda. Closed: title/time/checkbox. Open: the full task-form field set,
 * edited via screen-lifted state (not SQLite) until a save pill is tapped — same
 * lifted-state-over-padlock pattern as app/shopping.tsx's Week list Containers, but with a
 * durable draft buffer (store/useTaskDraftStore.ts) instead of a lock, since a task Container
 * has no "locked, read-only" resting state to fall back to. An inline "+" between the undone
 * and done stacks creates a new task and opens its Container immediately.
 *
 * Connections:
 *   Imports → components/AddDivider, components/BottomNav, components/PlanTaskCard,
 *             components/ScreenHeader, components/SiteSwipeView,
 *             constants/theme, lib/date, lib/i18n, lib/taskOrder, lib/useAppTheme,
 *             store/useEnergyStore, store/useTaskDraftStore, store/useTaskStore
 *   Used by → Expo Router route "/plans" (BottomNav tab — see lib/siteNav.ts), also reached
 *             via app/index.tsx's Plans widget "See everything" link (same as shopping's preview link)
 *   Data    → reads/writes useTaskStore (tasks) directly on save/delete/done-toggle; reads/
 *             writes useTaskDraftStore (task_drafts) for any task with unsaved field edits
 *
 * Edit notes:
 *   - No back button or screen-level add FAB in the header/body — every task list spot uses an
 *     AddDivider instead (one leading each card, plus a lone one when both stacks are empty),
 *     all wired to the same handleAddTask.
 *   - `edits` (taskId -> { fields, dirty }) is this screen's lifted edit state, mirroring
 *     app/shopping.tsx's per-list state but keyed by task instead of gated by a lock. A task's
 *     Container always renders from `edits[id]` once touched; `fieldsFromTask(task)` is only
 *     the fallback for an untouched task.
 *   - Draft persistence fires on Container close (toggleOpen) AND on screen blur
 *     (useFocusEffect's cleanup, mirroring shopping.tsx's pattern) — both call persistDraft,
 *     which is a no-op SQLite-wise when nothing is dirty (saveDraft's own clear-if-empty logic).
 *     This is the durability net described in useTaskDraftStore.ts's header: an abandoned edit
 *     survives navigating away or an app restart, resurfacing in the "Unsaved" section below.
 *   - The mount/tasks-change effect clears any task_drafts row whose task no longer exists —
 *     app/task-form.tsx (Home's task entry point) is intentionally left unmodified and has no
 *     way to clear a draft row when it deletes a task, so this is the self-heal for that gap.
 *   - handleAddTask seeds `edits`/`openIds` directly from useTaskStore.add()'s return value
 *     instead of going through ensureEdit/the `tasks` selector, which is still stale in the same
 *     render pass right after calling add().
 *   - nextHourStr() is duplicated from app/task-form.tsx (same duplication PlanTaskCard.tsx's
 *     header already notes) — task-form.tsx stays unmodified, so there's no shared home for it.
 *   - No dedicated empty state: the inline "+" is always visible as a stable anchor, same
 *     simplification app/shopping.tsx made for an empty-but-unlocked Week list. t.noPlansToday
 *     stays defined for app/index.tsx's widget.
 *   - PlanTaskCard's Steps section (steps/onAddStep/onToggleStep/onRemoveStep/onReorderStep) is
 *     wired straight to useTaskStore's step actions, not through `edits`/the draft system —
 *     steps persist immediately on every tap, with no save pill involved.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { useTaskDraftStore, TaskDraftFields } from '@/store/useTaskDraftStore';
import PlanTaskCard, { TaskFormFields, fieldsFromTask, fieldsToTaskPayload } from '@/components/PlanTaskCard';
import ScreenHeader from '@/components/ScreenHeader';
import AddDivider from '@/components/AddDivider';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { useT } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import { rankTodayTasks } from '@/lib/taskOrder';
import { FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

type EditState = { fields: TaskFormFields; dirty: Record<string, boolean> };

function nextHourStr(): string {
  const h = (new Date().getHours() + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

function draftFieldsToFormFields(d: TaskDraftFields): TaskFormFields {
  return {
    title: d.title,
    date: d.date,
    timeEnabled: d.timeEnabled,
    time: d.time || nextHourStr(),
    taskType: d.taskType,
    duration: String(d.durationMinutes || 30),
    recurring: d.recurring,
    recurringDays: d.recurringDays,
    importance: d.importance,
    priority: d.priority,
  };
}

function fieldsToDraftFields(f: TaskFormFields): TaskDraftFields {
  return {
    title: f.title,
    date: f.date,
    time: f.time,
    timeEnabled: f.timeEnabled,
    taskType: f.taskType,
    durationMinutes: Number(f.duration) || 0,
    recurring: f.recurring,
    recurringDays: f.recurringDays,
    importance: f.importance,
    priority: f.priority,
  };
}

export default function PlansScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const t = useT();
  const today = todayStr();

  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTask = useTaskStore((s) => s.toggle);
  const addTask = useTaskStore((s) => s.add);
  const updateTask = useTaskStore((s) => s.update);
  const removeTask = useTaskStore((s) => s.remove);
  const addStep = useTaskStore((s) => s.addStep);
  const removeStep = useTaskStore((s) => s.removeStep);
  const toggleStep = useTaskStore((s) => s.toggleStep);
  const reorderStep = useTaskStore((s) => s.reorderStep);
  const energyLevels = useEnergyStore((s) => s.levels);
  const todayEnergyLevel = energyLevels[today] ?? null;

  const drafts = useTaskDraftStore((s) => s.drafts);
  const saveDraft = useTaskDraftStore((s) => s.saveDraft);
  const clearDraft = useTaskDraftStore((s) => s.clearDraft);
  const draftEntries = Object.entries(drafts);

  const [edits, setEdits] = useState<Record<string, EditState>>(() => {
    const initialDrafts = useTaskDraftStore.getState().drafts;
    const initialTasks = useTaskStore.getState().tasks;
    const result: Record<string, EditState> = {};
    for (const [taskId, draft] of Object.entries(initialDrafts)) {
      if (!initialTasks.some((tk) => tk.id === taskId)) continue;
      result[taskId] = {
        fields: draftFieldsToFormFields(draft.fields),
        dirty: Object.fromEntries(draft.dirtyFields.map((f) => [f, true])),
      };
    }
    return result;
  });
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  // Self-heal: a task deleted via app/task-form.tsx (unmodified) leaves its task_drafts
  // row behind — clear any draft whose task no longer exists so "Unsaved" never points at nothing.
  useEffect(() => {
    for (const taskId of Object.keys(useTaskDraftStore.getState().drafts)) {
      if (!tasks.some((tk) => tk.id === taskId)) clearDraft(taskId);
    }
  }, [tasks, clearDraft]);

  const rankedTasks = rankTodayTasks(tasksForDate(today));
  const visibleTasks = todayEnergyLevel === 'low' ? rankedTasks.filter((tk) => tk.priority === 'high') : rankedTasks;
  const undoneTasks = visibleTasks.filter((tk) => !tk.done);
  const doneTasks = visibleTasks.filter((tk) => tk.done);

  function ensureEdit(taskId: string) {
    if (edits[taskId]) return;
    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    setEdits((prev) => ({ ...prev, [taskId]: { fields: fieldsFromTask(task), dirty: {} } }));
  }

  function persistDraft(taskId: string) {
    const edit = edits[taskId];
    if (!edit) return;
    saveDraft(taskId, fieldsToDraftFields(edit.fields), Object.keys(edit.dirty));
  }

  function toggleOpen(taskId: string) {
    const wasOpen = !!openIds[taskId];
    if (wasOpen) {
      persistDraft(taskId);
    } else {
      ensureEdit(taskId);
    }
    setOpenIds((prev) => ({ ...prev, [taskId]: !wasOpen }));
  }

  function openTask(taskId: string) {
    ensureEdit(taskId);
    setOpenIds((prev) => (prev[taskId] ? prev : { ...prev, [taskId]: true }));
  }

  function handleFieldChange<K extends keyof TaskFormFields>(taskId: string, field: K, value: TaskFormFields[K]) {
    setEdits((prev) => {
      const edit = prev[taskId];
      if (!edit) return prev;
      return {
        ...prev,
        [taskId]: {
          fields: { ...edit.fields, [field]: value },
          dirty: { ...edit.dirty, [field]: true },
        },
      };
    });
  }

  function handleSave(taskId: string) {
    const edit = edits[taskId];
    if (!edit) return;
    updateTask(taskId, fieldsToTaskPayload(edit.fields));
    clearDraft(taskId);
    setEdits((prev) => ({ ...prev, [taskId]: { fields: edit.fields, dirty: {} } }));
  }

  function handleSaveAll() {
    for (const [taskId, edit] of Object.entries(edits)) {
      if (Object.values(edit.dirty).some(Boolean)) handleSave(taskId);
    }
  }

  function handleDelete(taskId: string) {
    removeTask(taskId);
    clearDraft(taskId);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setOpenIds((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }

  function handleAddTask() {
    const task = addTask({
      title: '',
      date: today,
      time: nextHourStr(),
      taskType: 'start-at',
      durationMinutes: undefined,
      done: false,
      recurring: 'none',
      recurringDays: [],
      importance: 'regular',
      priority: 'medium',
    });
    setEdits((prev) => ({ ...prev, [task.id]: { fields: fieldsFromTask(task), dirty: {} } }));
    setOpenIds((prev) => ({ ...prev, [task.id]: true }));
  }

  // Net for "left a Container's edits dirty and navigated away" — fires regardless of
  // whether that Container was open or closed at the time (mirrors app/shopping.tsx's pattern).
  useFocusEffect(
    useCallback(() => {
      return () => {
        for (const [taskId, edit] of Object.entries(edits)) {
          if (Object.values(edit.dirty).some(Boolean)) persistDraft(taskId);
        }
      };
    }, [edits])
  );

  const anyDirty = Object.values(edits).some((edit) => Object.values(edit.dirty).some(Boolean));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={t.plansTitle}
        right={
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: theme.orangeLight }]}
              onPress={() => router.push({ pathname: '/share-modal', params: { kind: 't' } })}
              accessibilityLabel={t.shareBtnLabel}
            >
              <Text style={[styles.shareBtnText, { color: theme.text }]}>{t.shareBtnLabel}</Text>
            </Pressable>
            {anyDirty ? (
              <Pressable style={[styles.savePill, { backgroundColor: theme.orange }]} onPress={handleSaveAll}>
                <Text style={[styles.savePillText, { color: theme.white }]}>{t.save}</Text>
              </Pressable>
            ) : (
              <View style={[styles.savePill, { backgroundColor: theme.orange, opacity: 0.5 }]}>
                <Text style={[styles.savePillText, { color: theme.white }]}>{t.save}</Text>
              </View>
            )}
          </View>
        }
      />
      <SiteSwipeView>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {draftEntries.length > 0 && (
            <View style={styles.unsavedSection}>
              <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.unsavedTasksSection}</Text>
              <View style={[styles.unsavedBanner, { backgroundColor: theme.orangeLight }]}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.orange} />
                <Text style={[styles.unsavedBannerText, { color: theme.orange }]}>
                  {t.unsavedTasksBanner(draftEntries.length)}
                </Text>
              </View>
              {draftEntries.map(([taskId, draft]) => (
                <Pressable
                  key={taskId}
                  style={[styles.unsavedRow, { backgroundColor: theme.white }]}
                  onPress={() => openTask(taskId)}
                >
                  <Text style={[styles.unsavedRowTitle, { color: theme.text }]} numberOfLines={1}>
                    {draft.fields.title || t.taskTitlePlaceholder}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
                </Pressable>
              ))}
            </View>
          )}

          {undoneTasks.length === 0 && doneTasks.length === 0 && <AddDivider onPress={handleAddTask} />}

          {undoneTasks.map((task) => (
            <React.Fragment key={task.id}>
              <AddDivider onPress={handleAddTask} />
              <PlanTaskCard
                task={task}
                theme={theme}
                open={!!openIds[task.id]}
                onToggleOpen={() => toggleOpen(task.id)}
                fields={edits[task.id]?.fields ?? fieldsFromTask(task)}
                dirty={Object.values(edits[task.id]?.dirty ?? {}).some(Boolean)}
                onFieldChange={(field, value) => handleFieldChange(task.id, field, value)}
                onToggleDone={() => toggleTask(task.id)}
                onSave={() => handleSave(task.id)}
                onDelete={() => handleDelete(task.id)}
                steps={task.steps}
                onAddStep={(title) => addStep(task.id, title)}
                onToggleStep={toggleStep}
                onRemoveStep={removeStep}
                onReorderStep={reorderStep}
              />
            </React.Fragment>
          ))}

          {doneTasks.map((task) => (
            <React.Fragment key={task.id}>
              <AddDivider onPress={handleAddTask} />
              <PlanTaskCard
                task={task}
                theme={theme}
                open={!!openIds[task.id]}
                onToggleOpen={() => toggleOpen(task.id)}
                fields={edits[task.id]?.fields ?? fieldsFromTask(task)}
                dirty={Object.values(edits[task.id]?.dirty ?? {}).some(Boolean)}
                onFieldChange={(field, value) => handleFieldChange(task.id, field, value)}
                onToggleDone={() => toggleTask(task.id)}
                onSave={() => handleSave(task.id)}
                onDelete={() => handleDelete(task.id)}
                steps={task.steps}
                onAddStep={(title) => addStep(task.id, title)}
                onToggleStep={toggleStep}
                onRemoveStep={removeStep}
                onReorderStep={reorderStep}
              />
            </React.Fragment>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SiteSwipeView>
      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  shareBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  shareBtnText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  savePill: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  savePillText: { fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  unsavedSection: { gap: Spacing.xs, marginBottom: Spacing.sm },
  sectionLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  unsavedBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.md, padding: Spacing.sm },
  unsavedBannerText: { flex: 1, fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  unsavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  unsavedRowTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
});
