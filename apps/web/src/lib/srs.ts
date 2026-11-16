/**
 * Lightweight spaced-repetition scheduler (SM-2 inspired).
 *
 * A question answered correctly moves further into the future; a wrong answer
 * brings it back almost immediately and lowers the ease factor, so the "weak
 * spots" mode naturally surfaces the questions that keep failing.
 */

export const DAY_MS = 86_400_000;

export interface SrsState {
  questionId: string;
  /** Ease factor, 1.3 (hardest) .. 2.8 (easiest). */
  ease: number;
  /** Current interval in days. */
  intervalDays: number;
  /** Epoch ms when the question should be reviewed again. */
  dueAt: number;
  /** How many times the question was answered incorrectly. */
  lapses: number;
  /** Consecutive correct answers. */
  streak: number;
  lastReviewedAt: number;
  /** Rolling accuracy 0..1 used for sorting weak questions. */
  accuracy: number;
}

export const DEFAULT_SRS: Omit<SrsState, 'questionId' | 'dueAt' | 'lastReviewedAt'> = {
  ease: 2.3,
  intervalDays: 0,
  lapses: 0,
  streak: 0,
  accuracy: 0.5,
};

export function createSrsState(questionId: string, now = Date.now()): SrsState {
  return { questionId, ...DEFAULT_SRS, dueAt: now, lastReviewedAt: 0 };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function reviewSrs(previous: SrsState | undefined, questionId: string, correct: boolean, now = Date.now()): SrsState {
  const state: SrsState = previous
    ? { ...previous }
    : { questionId, ...DEFAULT_SRS, dueAt: now, lastReviewedAt: 0 };

  const total = state.streak + state.lapses + 1;
  state.accuracy = clamp((state.accuracy * (total - 1) + (correct ? 1 : 0)) / total, 0, 1);

  if (correct) {
    state.streak += 1;
    state.ease = clamp(state.ease + 0.06, 1.3, 2.8);
    const base = state.streak <= 1 ? 1 : state.streak === 2 ? 3 : state.intervalDays * state.ease;
    state.intervalDays = clamp(Math.round(base), 1, 180);
    state.dueAt = now + state.intervalDays * DAY_MS;
  } else {
    state.lapses += 1;
    state.streak = 0;
    state.ease = clamp(state.ease - 0.22, 1.3, 2.8);
    state.intervalDays = 0;
    // Bring it back within ten minutes so the same session can retry it.
    state.dueAt = now + 10 * 60 * 1000;
  }

  state.lastReviewedAt = now;
  return state;
}

export function isDue(state: SrsState, now = Date.now()): boolean {
  return state.dueAt <= now;
}

/** Sort helper: weakest first (low accuracy, then most lapses, then earliest due). */
export function byWeakness(a: SrsState, b: SrsState): number {
  if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
  if (a.lapses !== b.lapses) return b.lapses - a.lapses;
  return a.dueAt - b.dueAt;
}

export function pickWeak(state: SrsState): boolean {
  return state.accuracy < 0.75 || state.lapses > 0;
}