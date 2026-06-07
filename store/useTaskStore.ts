import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type TaskType = 'start-at' | 'time-box';
export type Recurring = 'none' | 'weekly';
export type Importance = 'regular' | 'essential';

export type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  taskType: TaskType;
  durationMinutes?: number;
  done: boolean;
  recurring: Recurring;
  recurringDays: number[]; // 0=Mon … 6=Sun
  importance: Importance;
};

type TaskStore = {
  tasks: Task[];
  load: () => void;
  add: (t: Omit<Task, 'id'>) => Task;
  update: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
  tasksForDate: (date: string) => Task[];
  backlogTasks: (today: string) => Task[];
  completedCount: () => number;
};

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.task_date as string,
    time: (row.task_time as string) || undefined,
    taskType: (row.task_type as TaskType) ?? 'start-at',
    durationMinutes: (row.duration_minutes as number) || undefined,
    done: row.done === 1,
    recurring: (row.recurring as Recurring) ?? 'none',
    recurringDays: JSON.parse((row.recurring_days as string) || '[]'),
    importance: (row.importance as Importance) ?? 'regular',
  };
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],

  load() {
    const rows = db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM tasks ORDER BY task_date, task_time'
    );
    set({ tasks: rows.map(rowToTask) });
  },

  add(t) {
    const id = generateId();
    db.runSync(
      `INSERT INTO tasks (id, title, task_date, task_time, task_type, duration_minutes, done, recurring, recurring_days, importance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        t.title,
        t.date,
        t.time ?? null,
        t.taskType,
        t.durationMinutes ?? null,
        0,
        t.recurring,
        JSON.stringify(t.recurringDays),
        t.importance ?? 'regular',
      ]
    );
    const task: Task = { ...t, id, done: false };
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  update(id, patch) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const next = { ...task, ...patch };
    db.runSync(
      `UPDATE tasks SET title=?, task_date=?, task_time=?, task_type=?, duration_minutes=?,
       done=?, recurring=?, recurring_days=?, importance=? WHERE id=?`,
      [
        next.title,
        next.date,
        next.time ?? null,
        next.taskType,
        next.durationMinutes ?? null,
        next.done ? 1 : 0,
        next.recurring,
        JSON.stringify(next.recurringDays),
        next.importance ?? 'regular',
        id,
      ]
    );
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? next : t)) }));
  },

  toggle(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    get().update(id, { done: !task.done });
  },

  remove(id) {
    db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  clearAll() {
    db.runSync('DELETE FROM tasks');
    set({ tasks: [] });
  },

  tasksForDate(date) {
    const { tasks } = get();
    const dayOfWeek = new Date(date).getDay(); // 0=Sun, convert to 0=Mon
    const mon0 = (dayOfWeek + 6) % 7;
    return tasks.filter((t) => {
      if (t.date === date) return true;
      if (t.recurring === 'weekly' && t.recurringDays.includes(mon0)) return true;
      return false;
    });
  },

  backlogTasks(today) {
    const { tasks } = get();
    return tasks
      .filter((t) => t.date < today && !t.done && t.recurring === 'none')
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  completedCount() {
    return get().tasks.filter((t) => t.done).length;
  },
}));
