/**
 * plans.tsx — Plans screen: two drag-sortable Important/General sections, plus Done and "Unsaved".
 *
 * Renders today's undone tasks as two manually-ordered stacks — Important (importance ===
 * 'essential') and General (importance === 'regular') — each a column of components/
 * PlanTaskCard.tsx accordions wrapped in components/DraggableTaskRow.tsx, which lets a collapsed
 * card be long-pressed and dragged to reorder within its section or move to the other section.
 * Done tasks stay in one combined list below (unchanged, ranked via lib/taskOrder.ts) since
 * dragging only applies to the still-actionable stacks. Closed: title/time/checkbox. Open: the
 * full task-form field set, edited via screen-lifted state (not SQLite) until a save pill is
 * tapped — same lifted-state-over-padlock pattern as app/shopping.tsx's Week list Containers,
 * but with a durable draft buffer (store/useTaskDraftStore.ts) instead of a lock, since a task
 * Container has no "locked, read-only" resting state to fall back to. An inline "+" before every
 * card creates a new task and opens its Container immediately.
 *
 * Connections:
 *   Imports → components/BottomNav, components/DraggableTaskRow,
 *             components/PlanTaskCard, components/ScreenHeader, components/SiteSwipeView,
 *             constants/theme, lib/date, lib/haptics, lib/i18n, lib/taskOrder, lib/useAppTheme,
 *             store/useEnergyStore, store/useTaskDraftStore, store/useTaskStore
 *   Used by → Expo Router route "/plans" (BottomNav tab — see lib/siteNav.ts), also reached
 *             via app/index.tsx's Plans widget "See everything" link (same as shopping's preview link)
 *   Data    → reads/writes useTaskStore (tasks) directly on save/delete/done-toggle/drag-drop
 *             (update() for an importance/section change, reorderTasks() for sort_order); reads/
 *             writes useTaskDraftStore (task_drafts) for any task with unsaved field edits
 *
 * Edit notes:
 *   - No back button or screen-level add FAB in the header/body — each section (Important,
 *     General) is anchored by dividers at the top and bottom; done tasks have no add affordance.
 *     When both undone stacks are empty, one divider appears as a stable anchor.
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
 *     app/task-form.tsx (Home's task entry point) has no way to clear a draft row when it
 *     deletes a task, so this is the self-heal for that gap (still true even though task-form.tsx
 *     is no longer left unmodified in general — this particular gap was never closed there).
 *   - handleAddTask seeds `edits`/`openIds` directly from useTaskStore.add()'s return value
 *     instead of going through ensureEdit/the `tasks` selector, which is still stale in the same
 *     render pass right after calling add(). A fresh task defaults into General (importance:
 *     'regular', sortOrder: 0) at the top of that section.
 *   - nextHourStr() is duplicated from app/task-form.tsx (same duplication PlanTaskCard.tsx's
 *     header already notes) — both files need it locally; neither is a natural shared home for
 *     such a small helper.
 *   - No dedicated empty state for the whole screen: the inline "+" is always visible as a stable
 *     anchor, same simplification app/shopping.tsx made for an empty-but-unlocked Week list.
 *     t.noPlansToday stays defined for app/index.tsx's widget. Each of the two drag sections
 *     shows t.emptySectionHint instead when it has zero tasks, so there's always a visible drop
 *     target to drag a task onto.
 *   - PlanTaskCard's Steps section (steps/onAddStep/onToggleStep/onRemoveStep/onReorderStep) is
 *     wired straight to useTaskStore's step actions, not through `edits`/the draft system —
 *     steps persist immediately on every tap, with no save pill involved.
 *   - Drag-and-drop: `rowLayoutsRef` collects every row's (and each section header anchor's)
 *     onLayout y/height, keyed by task id (anchors use a `__anchor_<section>__` key) — these only
 *     stay comparable because rows and headers are flat siblings in the ScrollView's content view
 *     with no per-section wrapping View (onLayout's `.y` is relative to the immediate parent).
 *     `livePreview` is a transient reordering of baseImportant/baseGeneral while a drag is active
 *     (mutated via splice + LayoutAnimation, same idiom ExpandableCard.tsx uses for its own
 *     expand/collapse reflow); it's null when no drag is in progress, in which case render falls
 *     back to the persisted sortOrder. handleDragEnd commits the final preview via reorderTasks
 *     (plus update() on a cross-section move), then clears the preview. Haptics: selection() on
 *     each hit-test change while dragging, heavy() once on drop only if the task actually moved.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTaskStore, type Task } from '@/store/useTaskStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { useTaskDraftStore, TaskDraftFields } from '@/store/useTaskDraftStore';
import PlanTaskCard, { TaskFormFields, fieldsFromTask, fieldsToTaskPayload } from '@/components/PlanTaskCard';
import DraggableTaskRow, { Section } from '@/components/DraggableTaskRow';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { useT } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import { rankTodayTasks } from '@/lib/taskOrder';
import { selection, heavy } from '@/lib/haptics';
import { FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

type EditState = { fields: TaskFormFields; dirty: Record<string, boolean> };

function nextHourStr(): string {
  const h = (new Date().getHours() + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

function bySortOrder(a: Task, b: Task): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id.localeCompare(b.id);
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
  const reorderTasks = useTaskStore((s) => s.reorderTasks);
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

  const [livePreview, setLivePreview] = useState<{ important: Task[]; general: Task[] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ taskId: string; fromSection: Section; fromIndex: number; overSection: Section; overIndex: number } | null>(null);
  const rowLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});

  // Self-heal: a task deleted via app/task-form.tsx leaves its task_drafts row behind (that
  // screen has no draft-clearing logic) — clear any draft whose task no longer exists so
  // "Unsaved" never points at nothing.
  useEffect(() => {
    for (const taskId of Object.keys(useTaskDraftStore.getState().drafts)) {
      if (!tasks.some((tk) => tk.id === taskId)) clearDraft(taskId);
    }
  }, [tasks, clearDraft]);

  const energyFilteredTasks =
    todayEnergyLevel === 'low' ? tasksForDate(today).filter((tk) => tk.importance === 'essential') : tasksForDate(today);
  const doneTasks = rankTodayTasks(energyFilteredTasks.filter((tk) => tk.done));
  const undone = energyFilteredTasks.filter((tk) => !tk.done);
  const baseImportant = undone.filter((tk) => tk.importance === 'essential').sort(bySortOrder);
  const baseGeneral = undone.filter((tk) => tk.importance === 'regular').sort(bySortOrder);
  const importantTasks = livePreview ? livePreview.important : baseImportant;
  const generalTasks = livePreview ? livePreview.general : baseGeneral;

  function registerLayout(key: string, layout: { y: number; height: number }) {
    rowLayoutsRef.current[key] = layout;
  }

  function applyPreview(
    prev: { important: Task[]; general: Task[] },
    taskId: string,
    targetSection: Section,
    targetIndex: number
  ): { important: Task[]; general: Task[] } {
    const dragged = prev.important.find((tk) => tk.id === taskId) ?? prev.general.find((tk) => tk.id === taskId);
    if (!dragged) return prev;
    const important = prev.important.filter((tk) => tk.id !== taskId);
    const general = prev.general.filter((tk) => tk.id !== taskId);
    if (targetSection === 'important') important.splice(targetIndex, 0, dragged);
    else general.splice(targetIndex, 0, dragged);
    return { important, general };
  }

  function hitTest(preview: { important: Task[]; general: Task[] }, taskId: string, centerY: number): { section: Section; index: number } {
    const entries: { section: Section; index: number; center: number }[] = [];
    (['important', 'general'] as Section[]).forEach((section) => {
      const anchor = rowLayoutsRef.current[`__anchor_${section}__`];
      if (anchor) entries.push({ section, index: 0, center: anchor.y + anchor.height / 2 });
      const rows = (section === 'important' ? preview.important : preview.general).filter((tk) => tk.id !== taskId);
      rows.forEach((tk, i) => {
        const l = rowLayoutsRef.current[tk.id];
        if (l) entries.push({ section, index: i, center: l.y + l.height / 2 });
      });
    });
    for (const entry of entries) {
      if (centerY < entry.center) return { section: entry.section, index: entry.index };
    }
    const last = entries[entries.length - 1];
    if (!last) return { section: 'important', index: 0 };
    const count = (last.section === 'important' ? preview.important : preview.general).filter((tk) => tk.id !== taskId).length;
    return { section: last.section, index: count };
  }

  function handleDragStart(taskId: string, fromSection: Section) {
    const fromIndex = (fromSection === 'important' ? baseImportant : baseGeneral).findIndex((tk) => tk.id === taskId);
    dragRef.current = { taskId, fromSection, fromIndex, overSection: fromSection, overIndex: fromIndex };
    setLivePreview({ important: baseImportant, general: baseGeneral });
    setIsDragging(true);
  }

  function handleDragMove(taskId: string, centerY: number) {
    setLivePreview((prev) => {
      if (!prev || !dragRef.current) return prev;
      const target = hitTest(prev, taskId, centerY);
      if (dragRef.current.overSection === target.section && dragRef.current.overIndex === target.index) return prev;
      dragRef.current.overSection = target.section;
      dragRef.current.overIndex = target.index;
      selection();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      return applyPreview(prev, taskId, target.section, target.index);
    });
  }

  function handleDragEnd() {
    const d = dragRef.current;
    const preview = livePreview;
    dragRef.current = null;
    setIsDragging(false);
    setLivePreview(null);
    if (!d || !preview) return;
    if (d.overSection !== d.fromSection) {
      updateTask(d.taskId, { importance: d.overSection === 'important' ? 'essential' : 'regular' });
    }
    reorderTasks(preview.important.map((tk) => tk.id));
    reorderTasks(preview.general.map((tk) => tk.id));
    if (d.overSection !== d.fromSection || d.overIndex !== d.fromIndex) {
      heavy();
    }
  }

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

  function handleDiscardDraft(taskId: string) {
    clearDraft(taskId);
    // If the task itself has no title and was never saved to the store with real content,
    // also delete it so it doesn't linger as a phantom task.
    const task = tasks.find((tk) => tk.id === taskId);
    if (task && !task.title.trim()) {
      removeTask(taskId);
    }
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
      sortOrder: 0,
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
            {anyDirty && (
              <Pressable style={[styles.savePill, { backgroundColor: theme.orange }]} onPress={handleSaveAll}>
                <Text style={[styles.savePillText, { color: theme.white }]}>{t.save}</Text>
              </Pressable>
            )}
            <Pressable onPress={handleAddTask} hitSlop={8} accessibilityLabel={t.newTask}>
              <Ionicons name="add" size={24} color={theme.text} />
            </Pressable>
          </View>
        }
      />
      <SiteSwipeView>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} scrollEnabled={!isDragging}>
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
                <View
                  key={taskId}
                  style={[styles.unsavedRow, { backgroundColor: theme.white }]}
                >
                  <Pressable style={styles.unsavedRowMain} onPress={() => openTask(taskId)}>
                    <Text style={[styles.unsavedRowTitle, { color: theme.text }]} numberOfLines={1}>
                      {draft.fields.title || t.taskTitlePlaceholder}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDiscardDraft(taskId)}
                    hitSlop={8}
                    accessibilityLabel="Discard draft"
                  >
                    <Ionicons name="close-circle-outline" size={20} color={theme.textLight} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {importantTasks.length === 0 && generalTasks.length === 0 && doneTasks.length === 0 && (
            <Text style={[styles.emptySectionHint, { color: theme.textLight }]}>{t.newTask}</Text>
          )}

          <View
            style={[styles.sectionLabelBox, { backgroundColor: theme.grayLight }]}
            onLayout={(e) => registerLayout('__anchor_important__', e.nativeEvent.layout)}
          >
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>
              {t.importantSectionLabel}
            </Text>
          </View>
          {importantTasks.length === 0 && (
            <View style={[styles.emptySectionDropZone, { backgroundColor: theme.grayLight, borderColor: theme.gray }]}>
              <Text style={[styles.emptySectionHint, { color: theme.textLight }]}>{t.emptySectionHint}</Text>
            </View>
          )}
          {importantTasks.map((task) => (
            <DraggableTaskRow
              key={task.id}
              task={task}
              section="important"
              isOpen={!!openIds[task.id]}
              onRowLayout={(layout) => registerLayout(task.id, layout)}
              onDragStart={() => handleDragStart(task.id, 'important')}
              onDragMove={(centerY) => handleDragMove(task.id, centerY)}
              onDragEnd={handleDragEnd}
              cardProps={{
                theme,
                open: !!openIds[task.id],
                onToggleOpen: () => toggleOpen(task.id),
                fields: edits[task.id]?.fields ?? fieldsFromTask(task),
                dirty: Object.values(edits[task.id]?.dirty ?? {}).some(Boolean),
                onFieldChange: (field, value) => handleFieldChange(task.id, field, value),
                onToggleDone: () => toggleTask(task.id),
                onSave: () => handleSave(task.id),
                onDelete: () => handleDelete(task.id),
                steps: task.steps,
                onAddStep: (title) => addStep(task.id, title),
                onToggleStep: toggleStep,
                onRemoveStep: removeStep,
                onReorderStep: reorderStep,
              }}
            />
          ))}
          <View
            style={[styles.sectionLabelBox, { backgroundColor: theme.grayLight }]}
            onLayout={(e) => registerLayout('__anchor_general__', e.nativeEvent.layout)}
          >
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>
              {t.generalSectionLabel}
            </Text>
          </View>
          {generalTasks.length === 0 && (
            <View style={[styles.emptySectionDropZone, { backgroundColor: theme.grayLight, borderColor: theme.gray }]}>
              <Text style={[styles.emptySectionHint, { color: theme.textLight }]}>{t.emptySectionHint}</Text>
            </View>
          )}
          {generalTasks.map((task) => (
            <DraggableTaskRow
              key={task.id}
              task={task}
              section="general"
              isOpen={!!openIds[task.id]}
              onRowLayout={(layout) => registerLayout(task.id, layout)}
              onDragStart={() => handleDragStart(task.id, 'general')}
              onDragMove={(centerY) => handleDragMove(task.id, centerY)}
              onDragEnd={handleDragEnd}
              cardProps={{
                theme,
                open: !!openIds[task.id],
                onToggleOpen: () => toggleOpen(task.id),
                fields: edits[task.id]?.fields ?? fieldsFromTask(task),
                dirty: Object.values(edits[task.id]?.dirty ?? {}).some(Boolean),
                onFieldChange: (field, value) => handleFieldChange(task.id, field, value),
                onToggleDone: () => toggleTask(task.id),
                onSave: () => handleSave(task.id),
                onDelete: () => handleDelete(task.id),
                steps: task.steps,
                onAddStep: (title) => addStep(task.id, title),
                onToggleStep: toggleStep,
                onRemoveStep: removeStep,
                onReorderStep: reorderStep,
              }}
            />
          ))}
          {doneTasks.map((task) => (
            <PlanTaskCard
              key={task.id}
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
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.xs },
  unsavedSection: { gap: Spacing.xs, marginBottom: Spacing.sm },
  sectionLabel: { fontSize: FontSize.sm, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLabelBox: { borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xs },
  emptySectionDropZone: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySectionHint: { fontSize: FontSize.md, fontFamily: Fonts.medium },
  unsavedBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.md, padding: Spacing.sm },
  unsavedBannerText: { flex: 1, fontSize: FontSize.sm, fontFamily: Fonts.semibold },
  unsavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  unsavedRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  unsavedRowTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
});
