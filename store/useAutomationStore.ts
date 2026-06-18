/**
 * useAutomationStore.ts — simple IFTTT-style "when X, do Y" rules
 *
 * Zustand store for user-defined automation rules: a trigger (something that
 * already happens in the app) paired with an action (something the app does
 * in response). Deliberately minimal — two trigger types, two action types —
 * per the "don't over-engineer" project guideline. fireTrigger() is called by
 * the trigger sites themselves (useTaskStore's toggle, app/shopping.tsx's
 * mount effect), not the other way around, so this store has no knowledge of
 * when its triggers fire.
 *
 * Connections:
 *   Imports → lib/db, lib/i18n, lib/id, store/useSettingsStore, store/useShoppingStore
 *   Used by → app/automations.tsx, app/shopping.tsx, store/useTaskStore.ts
 *   Data    → defines a Zustand store; owns SQLite table ifttt_rules
 *
 * Edit notes:
 *   - trigger_params is left at its DB default ('{}') — neither trigger type takes
 *     parameters today. Add a column-backed field only when a trigger actually needs one.
 *   - executeAction's 'show_message' branch uses Alert.alert directly (not
 *     ConfirmationBanner) because it must work from non-component call sites
 *     (store methods), where there's no screen-owned banner state to set.
 *   - New trigger/action types go through TriggerType/ActionType here AND the
 *     automations.tsx picker UI AND the call site that should fire them.
 */
import { Alert } from 'react-native';
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';
import { getTranslations } from '@/lib/i18n';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useShoppingStore } from '@/store/useShoppingStore';

export type TriggerType = 'task_completed' | 'shopping_opened';
export type ActionType = 'show_message' | 'add_shopping_item';

export type AutomationRule = {
  id: string;
  triggerType: TriggerType;
  actionType: ActionType;
  actionParams: Record<string, string>;
  active: boolean;
  createdAt: number;
};

type AutomationStore = {
  rules: AutomationRule[];
  load: () => void;
  add: (triggerType: TriggerType, actionType: ActionType, actionParams: Record<string, string>) => void;
  toggleActive: (id: string) => void;
  remove: (id: string) => void;
  fireTrigger: (type: TriggerType) => void;
};

function rowToRule(row: Record<string, unknown>): AutomationRule {
  return {
    id: row.id as string,
    triggerType: row.trigger_type as TriggerType,
    actionType: row.action_type as ActionType,
    actionParams: (() => {
      try { return JSON.parse((row.action_params as string) || '{}'); } catch { return {}; }
    })(),
    active: row.active === 1,
    createdAt: (row.created_at as number) || 0,
  };
}

function executeAction(rule: AutomationRule) {
  if (rule.actionType === 'show_message') {
    const message = rule.actionParams.message?.trim();
    if (!message) return;
    const t = getTranslations(useSettingsStore.getState().language);
    Alert.alert(t.automations.alertTitle, message);
  } else if (rule.actionType === 'add_shopping_item') {
    const name = rule.actionParams.name?.trim();
    if (!name) return;
    useShoppingStore.getState().add({
      name,
      amount: '1',
      unit: '',
      listType: rule.actionParams.listType === 'monthly' ? 'monthly' : 'weekly',
      store: '',
      price: 0,
      inventoryQty: 0,
    });
  }
}

export const useAutomationStore = create<AutomationStore>((set, get) => ({
  rules: [],

  load() {
    try {
      const rows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM ifttt_rules ORDER BY created_at'
      );
      set({ rules: rows.map(rowToRule) });
    } catch {
      set({ rules: [] });
    }
  },

  add(triggerType, actionType, actionParams) {
    const id = generateId();
    const createdAt = Date.now();
    db.runSync(
      `INSERT INTO ifttt_rules (id, trigger_type, action_type, action_params, active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [id, triggerType, actionType, JSON.stringify(actionParams), createdAt]
    );
    set((s) => ({
      rules: [...s.rules, { id, triggerType, actionType, actionParams, active: true, createdAt }],
    }));
  },

  toggleActive(id) {
    const rule = get().rules.find((r) => r.id === id);
    if (!rule) return;
    const active = !rule.active;
    db.runSync('UPDATE ifttt_rules SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, active } : r)) }));
  },

  remove(id) {
    db.runSync('DELETE FROM ifttt_rules WHERE id = ?', [id]);
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },

  fireTrigger(type) {
    get().rules.filter((r) => r.active && r.triggerType === type).forEach(executeAction);
  },
}));
