import { describe, expect, it } from 'vitest';
import { buildSession, buildTickets, BLITZ_PROFILE } from '../src/lib/selection';
import { isCorrect, scoreSession } from '../src/lib/scoring';
import type { ContentBundle, Question } from '../src/lib/types';

const L = (value: string) => ({ ru: value, kk: value, en: value });

const questions: Question[] = Array.from({ length: 45 }).map((_, index) => ({
  id: `q_${index}`,
  category: 'B',
  topicIds: [index % 2 === 0 ? 'common' : 'speed'],
  text: L(`Question ${index}`),
  options: [
    { id: 'a', text: L('A') },
    { id: 'b', text: L('B') },
  ],
  correctOptionId: index % 2 === 0 ? 'a' : 'b',
  explanation: L('Because.'),
  pdDRefs: [{ chapter: '1', point: '1.2' }],
  difficulty: 1,
  source: 'test',
  ...(index % 3 === 0
    ? { signIds: ['s_1.22'], diagram: { type: 'cross' as const, vehicles: [{ id: 'A', arm: 's' as const, pos: 0.5 }] } }
    : {}),
}));

const bundle: ContentBundle = {
  version: 'test',
  topics: [
    { id: 'common', order: 1, icon: 'BookOpen', accent: 'violet', title: L('Common'), short: L('Common') },
    { id: 'speed', order: 2, icon: 'Gauge', accent: 'amber', title: L('Speed'), short: L('Speed') },
  ],
  examProfiles: [
    {
      id: 'kz_b',
      category: 'B',
      name: L('Exam'),
      questions: 20,
      minutes: 20,
      maxErrors: 2,
      passRule: 'maxErrorsExceededOrTime',
      revealAnswers: true,
      shuffleQuestions: true,
      shuffleOptions: false,
    },
    {
      id: 'kz_b_training',
      category: 'B',
      name: L('Training'),
      questions: 20,
      minutes: 0,
      maxErrors: 0,
      passRule: 'none',
      revealAnswers: true,
      shuffleQuestions: true,
      shuffleOptions: false,
    },
  ],
  signs: [],
  markings: [],
  chapters: [{ id: '1', title: L('General'), points: [{ id: '1.2', text: L('Point') }] }],
  fines: [],
  questions,
};

describe('buildTickets', () => {
  it('is deterministic and covers the pool exactly once', () => {
    const first = buildTickets(questions);
    const second = buildTickets(questions);
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    const all = first.flatMap((ticket) => ticket.questionIds);
    expect(all).toHaveLength(40);
    expect(new Set(all).size).toBe(40);
    expect(all).not.toEqual([...all].sort());
  });

  it('returns fewer tickets when the pool is small', () => {
    const tickets = buildTickets(questions.slice(0, 25));
    expect(tickets).toHaveLength(2);
    expect(tickets[1]?.questionIds).toHaveLength(5);
  });
});

describe('buildSession', () => {
  it('picks the exam profile with 20 questions', () => {
    const plan = buildSession({ mode: 'exam', bundle });
    expect(plan.profile.id).toBe('kz_b');
    expect(plan.questions).toHaveLength(20);
    expect(new Set(plan.questions.map((q) => q.id)).size).toBe(20);
  });

  it('is stable for the ticket of the day', () => {
    const a = buildSession({ mode: 'daily', bundle });
    const b = buildSession({ mode: 'daily', bundle });
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });

  it('filters by topic', () => {
    const plan = buildSession({ mode: 'topic', bundle, topicId: 'speed' });
    expect(plan.questions.length).toBeGreaterThan(0);
    expect(plan.questions.every((q) => q.topicIds.includes('speed'))).toBe(true);
  });

  it('keeps weak questions when the pool is large enough', () => {
    const plan = buildSession({
      mode: 'weak',
      bundle,
      weakQuestionIds: ['q_1', 'q_3', 'q_5', 'q_7', 'q_9'],
    });
    for (const id of ['q_1', 'q_3', 'q_5', 'q_7', 'q_9']) {
      expect(plan.questions.some((q) => q.id === id)).toBe(true);
    }
  });

  it('selects only questions with diagrams in situations mode', () => {
    const plan = buildSession({ mode: 'situations', bundle });
    expect(plan.questions.every((q) => Boolean(q.diagram))).toBe(true);
    expect(plan.questions.length).toBe(15);
  });

  it('blitz profile is fixed', () => {
    expect(BLITZ_PROFILE.questions).toBe(10);
    const plan = buildSession({ mode: 'blitz', bundle });
    expect(plan.questions).toHaveLength(10);
  });

  it('mistakes mode returns only the supplied questions, in order', () => {
    const plan = buildSession({
      mode: 'mistakes',
      bundle,
      weakQuestionIds: ['q_7', 'q_3', 'q_9'],
    });
    expect(plan.questions.map((q) => q.id)).toEqual(['q_7', 'q_3', 'q_9']);
    expect(plan.profile.questions).toBe(20);
  });

  it('mistakes mode falls back to an empty set without weak questions', () => {
    const plan = buildSession({ mode: 'mistakes', bundle, weakQuestionIds: [] });
    expect(plan.questions).toHaveLength(0);
  });

  it('marathon mode returns every question', () => {
    const plan = buildSession({ mode: 'marathon', bundle });
    expect(plan.questions).toHaveLength(questions.length);
    expect(plan.profile.questions).toBe(questions.length);
  });
});

describe('scoring', () => {
  const profile = bundle.examProfiles[0] as ContentBundle['examProfiles'][number];
  const sessionIds = questions.slice(0, 20).map((q) => q.id);

  const buildAnswers = (correctIds: string[], missingIds: string[] = []) =>
    sessionIds.map((id) => {
      const question = questions.find((q) => q.id === id) as Question;
      const missing = missingIds.includes(id);
      const correct = correctIds.includes(id);
      return {
        questionId: id,
        chosenOptionId: missing ? null : correct ? question.correctOptionId : question.options[0]!.id,
        correct,
        ms: 1000,
      };
    });

  it('passes with up to maxErrors mistakes', () => {
    const answers = buildAnswers(sessionIds.slice(0, 18));
    const result = scoreSession(questions.slice(0, 20), answers, profile, 60_000);
    expect(result.errors).toBe(2);
    expect(result.passed).toBe(true);
    expect(result.accuracy).toBeCloseTo(0.9);
  });

  it('fails when the error limit is exceeded', () => {
    const answers = buildAnswers(sessionIds.slice(0, 17));
    const result = scoreSession(questions.slice(0, 20), answers, profile, 60_000);
    expect(result.errors).toBe(3);
    expect(result.passed).toBe(false);
  });

  it('fails on timeout regardless of accuracy', () => {
    const answers = buildAnswers(sessionIds);
    const result = scoreSession(questions.slice(0, 20), answers, profile, 1_200_000, true);
    expect(result.passed).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it('counts skipped questions as failures', () => {
    const answers = buildAnswers(sessionIds.slice(0, 19), [sessionIds[19] as string]);
    const result = scoreSession(questions.slice(0, 20), answers, profile, 60_000);
    expect(result.skipped).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.failedQuestionIds).toHaveLength(1);
    expect(result.passed).toBe(false);
  });

  it('training profile never fails', () => {
    const training = bundle.examProfiles[1] as ContentBundle['examProfiles'][number];
    const answers = buildAnswers([]);
    const result = scoreSession(questions.slice(0, 20), answers, training, 1000);
    expect(result.passed).toBe(true);
    expect(result.errors).toBe(20);
  });

  it('compares chosen option with the correct one', () => {
    const question = questions[0] as Question;
    expect(isCorrect(question, question.correctOptionId)).toBe(true);
    expect(isCorrect(question, null)).toBe(false);
  });
});