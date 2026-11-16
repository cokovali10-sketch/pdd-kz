import type { ExamProfile, Question } from './types';

export interface AnswerRecord {
  questionId: string;
  chosenOptionId: string | null;
  correct: boolean;
  ms: number;
}

export interface SessionResult {
  profileId: string;
  correct: number;
  total: number;
  errors: number;
  skipped: number;
  accuracy: number;
  passed: boolean;
  durationMs: number;
  failedQuestionIds: string[];
  timedOut: boolean;
}

export function isCorrect(question: Question, chosenOptionId: string | null): boolean {
  return chosenOptionId !== null && chosenOptionId === question.correctOptionId;
}

export function scoreSession(
  questions: readonly Question[],
  answers: readonly AnswerRecord[],
  profile: ExamProfile,
  durationMs: number,
  timedOut = false,
): SessionResult {
  const total = questions.length;
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let correct = 0;
  let skipped = 0;
  const failedQuestionIds: string[] = [];

  for (const q of questions) {
    const answer = byId.get(q.id);
    if (!answer || answer.chosenOptionId === null) {
      skipped += 1;
      failedQuestionIds.push(q.id);
      continue;
    }
    if (answer.correct) correct += 1;
    else failedQuestionIds.push(q.id);
  }

  const errors = total - correct;
  const passed =
    profile.passRule === 'none'
      ? true
      : !timedOut && errors <= profile.maxErrors && skipped === 0;

  return {
    profileId: profile.id,
    correct,
    total,
    errors,
    skipped,
    accuracy: total === 0 ? 0 : correct / total,
    passed,
    durationMs,
    failedQuestionIds,
    timedOut,
  };
}