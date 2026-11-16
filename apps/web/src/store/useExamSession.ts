import { create } from 'zustand';
import type { AnswerRecord, SessionResult } from '../lib/scoring';
import { scoreSession } from '../lib/scoring';
import type { SessionPlan } from '../lib/selection';
import { addAttempt } from '../lib/storage';

type Status = 'idle' | 'running' | 'paused' | 'finished';

interface ExamSessionState {
  plan: SessionPlan | null;
  index: number;
  answers: Record<string, string | null>;
  revealed: Record<string, boolean>;
  status: Status;
  startedAt: number;
  accumulatedMs: number;
  resumedAt: number | null;
  result: SessionResult | null;
  saved: boolean;
  saving: boolean;
  start: (plan: SessionPlan) => void;
  answer: (questionId: string, optionId: string) => void;
  reveal: (questionId: string) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  pause: () => void;
  resume: () => void;
  finish: (timedOut?: boolean) => Promise<void>;
  reset: () => void;
}

const now = () => Date.now();

export const useExamSession = create<ExamSessionState>((set, get) => ({
  plan: null,
  index: 0,
  answers: {},
  revealed: {},
  status: 'idle',
  startedAt: 0,
  accumulatedMs: 0,
  resumedAt: null,
  result: null,
  saved: false,
  saving: false,

  start: (plan) =>
    set({
      plan,
      index: 0,
      answers: {},
      revealed: {},
      status: 'running',
      startedAt: now(),
      accumulatedMs: 0,
      resumedAt: now(),
      result: null,
      saved: false,
      saving: false,
    }),

  answer: (questionId, optionId) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: optionId },
      revealed: state.plan?.profile.revealAnswers ? { ...state.revealed, [questionId]: true } : state.revealed,
    })),

  reveal: (questionId) => set((state) => ({ revealed: { ...state.revealed, [questionId]: true } })),

  goTo: (index) =>
    set((state) => ({
      index: state.plan ? Math.min(Math.max(0, index), state.plan.questions.length - 1) : 0,
    })),

  next: () =>
    set((state) => ({
      index: state.plan ? Math.min(state.index + 1, state.plan.questions.length - 1) : 0,
    })),

  prev: () => set((state) => ({ index: Math.max(0, state.index - 1) })),

  pause: () =>
    set((state) => {
      if (state.status !== 'running') return state;
      const extra = state.resumedAt ? now() - state.resumedAt : 0;
      return { status: 'paused', accumulatedMs: state.accumulatedMs + extra, resumedAt: null };
    }),

  resume: () => set((state) => (state.status === 'paused' ? { status: 'running', resumedAt: now() } : state)),

  finish: async (timedOut = false) => {
    const state = get();
    if (!state.plan || state.status === 'finished' || state.saving) return;

    const extra = state.resumedAt ? now() - state.resumedAt : 0;
    const durationMs = state.accumulatedMs + extra;

    const records: AnswerRecord[] = state.plan.questions.map((q) => {
      const chosen = state.answers[q.id] ?? null;
      return {
        questionId: q.id,
        chosenOptionId: chosen,
        correct: chosen === q.correctOptionId,
        ms: 0,
      };
    });

    const result = scoreSession(state.plan.questions, records, state.plan.profile, durationMs, timedOut);

    set({ status: 'finished', result, accumulatedMs: durationMs, resumedAt: null });

    if (!state.saved) {
      set({ saving: true });
      try {
        await addAttempt({
          at: now(),
          mode: state.plan.mode,
          profileId: state.plan.profile.id,
          total: result.total,
          correct: result.correct,
          errors: result.errors,
          accuracy: result.accuracy,
          passed: result.passed,
          durationMs,
          answers: records,
          failedQuestionIds: result.failedQuestionIds,
        });
        set({ saved: true });
      } catch (error) {
        console.error('failed to persist attempt', error);
      } finally {
        set({ saving: false });
      }
    }
  },

  reset: () =>
    set({
      plan: null,
      index: 0,
      answers: {},
      revealed: {},
      status: 'idle',
      startedAt: 0,
      accumulatedMs: 0,
      resumedAt: null,
      result: null,
      saved: false,
      saving: false,
    }),
}));

/** Elapsed milliseconds excluding pauses; recomputes on every render tick. */
export function elapsedMs(state: ExamSessionState, tick: number): number {
  void tick;
  if (state.status === 'running') {
    return state.accumulatedMs + (state.resumedAt ? now() - state.resumedAt : 0);
  }
  return state.accumulatedMs;
}