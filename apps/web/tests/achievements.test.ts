import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, evaluateAchievements, practisedDates } from '../src/lib/achievements';

const NOW = 1_700_000_000_000;

const attempt = (overrides: Partial<Parameters<typeof evaluateAchievements>[0]['attempts'][number]> = {}) => ({
  at: NOW,
  mode: 'exam',
  total: 20,
  correct: 20,
  accuracy: 1,
  passed: true,
  durationMs: 60_000,
  answers: Array.from({ length: 20 }).map((_, index) => ({ questionId: `q_${index}`, correct: true })),
  failedQuestionIds: [],
  ...overrides,
});

const ctx = (attempts: Parameters<typeof evaluateAchievements>[0]['attempts'], extra = {}) => ({
  attempts,
  srs: [],
  xp: 0,
  streakDays: 0,
  ...extra,
});

const find = (states: ReturnType<typeof evaluateAchievements>, id: string) => {
  const state = states.find((item) => item.achievement.id === id);
  if (!state) throw new Error(`missing achievement ${id}`);
  return state;
};

describe('achievements', () => {
  it('locks everything with no attempts', () => {
    const states = evaluateAchievements(ctx([]));
    expect(states.every((state) => !state.unlocked)).toBe(true);
    expect(states).toHaveLength(ACHIEVEMENTS.length);
  });

  it('unlocks the first attempt', () => {
    const states = evaluateAchievements(ctx([attempt()]));
    expect(find(states, 'first_test').unlocked).toBe(true);
    expect(find(states, 'first_test').ratio).toBe(1);
  });

  it('requires 20+ questions for a perfect run', () => {
    const small = evaluateAchievements(ctx([attempt({ total: 10, correct: 10, answers: [] })]));
    expect(find(small, 'perfect_1').unlocked).toBe(false);

    const full = evaluateAchievements(ctx([attempt()]));
    expect(find(full, 'perfect_1').unlocked).toBe(true);
  });

  it('counts only perfect attempts for perfectionist', () => {
    const states = evaluateAchievements(ctx([
      attempt(),
      attempt({ correct: 19, accuracy: 0.95, passed: false, failedQuestionIds: ['q_1'] }),
      attempt(),
    ]));
    expect(find(states, 'perfect_5').value).toBe(2);
  });

  it('uses the stored streak and xp', () => {
    const states = evaluateAchievements(ctx([attempt()], { xp: 1200, streakDays: 7 }));
    expect(find(states, 'streak_7').unlocked).toBe(true);
    expect(find(states, 'xp_1000').unlocked).toBe(true);
    expect(find(states, 'streak_7').ratio).toBe(1);
  });

  it('counts sign questions from the answers', () => {
    const withSigns = attempt({
      total: 3,
      correct: 3,
      answers: [
        { questionId: 'q_signs_01', correct: true },
        { questionId: 'q_signs_02', correct: true },
        { questionId: 'q_rules_01', correct: true },
      ],
    });
    const states = evaluateAchievements(ctx([withSigns]));
    expect(find(states, 'signs_25').value).toBe(2);
  });

  it('groups attempts into practice days', () => {
    const today = Date.now();
    const counts = practisedDates([
      attempt({ at: today }),
      attempt({ at: today + 60_000 }),
      attempt({ at: today - 86_400_000 }),
    ]);
    expect(counts.size).toBe(2);
  });

  it('never reports a ratio above 1', () => {
    const states = evaluateAchievements(ctx([attempt(), attempt()], { xp: 5000, streakDays: 90 }));
    for (const state of states) {
      expect(state.ratio).toBeLessThanOrEqual(1);
      expect(state.value).toBeLessThanOrEqual(state.achievement.goal);
    }
  });
});