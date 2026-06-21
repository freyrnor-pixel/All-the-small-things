import { rankTodayTasks } from '@/lib/taskOrder';
import type { Task } from '@/store/useTaskStore';

/** Minimal Task factory — only the fields rankTodayTasks reads need to be real. */
function task(partial: Partial<Task>): Task {
  return {
    id: 'id',
    title: 't',
    date: '2026-06-21',
    taskType: 'start-at',
    done: false,
    recurring: 'none',
    recurringDays: [],
    importance: 'regular',
    priority: 'medium',
    ...partial,
  };
}

describe('lib/taskOrder.rankTodayTasks', () => {
  it('sinks done tasks to the bottom', () => {
    const done = task({ id: 'done', done: true });
    const todo = task({ id: 'todo' });
    expect(rankTodayTasks([done, todo]).map((t) => t.id)).toEqual(['todo', 'done']);
  });

  it('raises time-anchored tasks above plain ones', () => {
    const plain = task({ id: 'plain' });
    const timed = task({ id: 'timed', time: '09:00' });
    expect(rankTodayTasks([plain, timed]).map((t) => t.id)).toEqual(['timed', 'plain']);
  });

  it('orders essential above regular at the same anchoring', () => {
    const regular = task({ id: 'regular' });
    const essential = task({ id: 'essential', importance: 'essential' });
    expect(rankTodayTasks([regular, essential]).map((t) => t.id)).toEqual(['essential', 'regular']);
  });

  it('breaks rank ties by earliest time first', () => {
    const late = task({ id: 'late', time: '10:00' });
    const early = task({ id: 'early', time: '08:00' });
    expect(rankTodayTasks([late, early]).map((t) => t.id)).toEqual(['early', 'late']);
  });

  it('applies the full ranking order', () => {
    const a = task({ id: 'done', done: true });
    const b = task({ id: 'plain' });
    const c = task({ id: 'timed', time: '09:00' });
    const d = task({ id: 'essential', importance: 'essential' });
    const e = task({ id: 'box-essential', taskType: 'time-box', importance: 'essential' });
    // ranks: e=-110, c=-100, d=-10, b=0, a=1000
    expect(rankTodayTasks([a, b, c, d, e]).map((t) => t.id)).toEqual([
      'box-essential',
      'timed',
      'essential',
      'plain',
      'done',
    ]);
  });

  it('does not mutate its input', () => {
    const input = [task({ id: 'a', done: true }), task({ id: 'b' })];
    const copy = [...input];
    rankTodayTasks(input);
    expect(input).toEqual(copy);
  });
});
