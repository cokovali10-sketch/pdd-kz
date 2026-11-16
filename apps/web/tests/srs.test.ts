import { describe, expect, it } from 'vitest';
import { DAY_MS, byWeakness, createSrsState, isDue, pickWeak, reviewSrs } from '../src/lib/srs';

const NOW = 1_700_000_000_000;

describe('srs', () => {
  it('creates a state that is immediately due', () => {
    const state = createSrsState('q1', NOW);
    expect(state.dueAt).toBe(NOW);
    expect(state.ease).toBeCloseTo(2.3);
    expect(isDue(state, NOW)).toBe(true);
  });

  it('pushes a correct answer into the future', () => {
    const first = reviewSrs(undefined, 'q1', true, NOW);
    expect(first.streak).toBe(1);
    expect(first.intervalDays).toBe(1);
    expect(first.dueAt).toBe(NOW + DAY_MS);
    expect(isDue(first, NOW + 1)).toBe(false);

    const second = reviewSrs(first, 'q1', true, NOW + DAY_MS);
    expect(second.intervalDays).toBe(3);
  });

  it('brings a wrong answer back within the same session and lowers ease', () => {
    const afterTwo = reviewSrs(reviewSrs(undefined, 'q1', true, NOW), 'q1', true, NOW + DAY_MS);
    const afterWrong = reviewSrs(afterTwo, 'q1', false, NOW + 2 * DAY_MS);
    expect(afterWrong.streak).toBe(0);
    expect(afterWrong.intervalDays).toBe(0);
    expect(afterWrong.lapses).toBe(1);
    expect(afterWrong.ease).toBeLessThan(afterTwo.ease);
    expect(afterWrong.dueAt - (NOW + 2 * DAY_MS)).toBe(10 * 60 * 1000);
    expect(pickWeak(afterWrong)).toBe(true);
  });

  it('clamps the ease factor to sane bounds', () => {
    let state = createSrsState('q1', NOW);
    for (let i = 0; i < 50; i += 1) state = reviewSrs(state, 'q1', true, NOW + i);
    expect(state.ease).toBeLessThanOrEqual(2.8);
    for (let i = 0; i < 50; i += 1) state = reviewSrs(state, 'q1', false, NOW + 100 + i);
    expect(state.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('sorts weakest first', () => {
    const a = reviewSrs(undefined, 'a', false, NOW);
    const b = reviewSrs(undefined, 'b', true, NOW);
    const [first, second] = [a, b].sort(byWeakness);
    expect(first.questionId).toBe('a');
    expect(second.questionId).toBe('b');
  });
});