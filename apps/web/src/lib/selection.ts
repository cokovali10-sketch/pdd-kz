import type { ContentBundle, ExamMode, ExamProfile, Localized, Question } from './types';
import { hashString, shuffleWithSeed, todayKey } from './utils';

export interface Ticket {
  id: string;
  number: number;
  questionIds: string[];
}

const TICKET_SIZE = 20;
const TICKET_COUNT = 2;

/**
 * Deterministic ticket builder: every question of the current pool appears
 * exactly once across the tickets, so the set stays stable between builds as
 * long as the content version does not change.
 */
export function buildTickets(questions: readonly Question[], size = TICKET_SIZE, count = TICKET_COUNT): Ticket[] {
  const ordered = shuffleWithSeed(questions, hashString('tickets-v1'));
  const tickets: Ticket[] = [];
  for (let i = 0; i < count; i += 1) {
    const slice = ordered.slice(i * size, i * size + size);
    if (slice.length === 0) break;
    tickets.push({
      id: `b_${String(i + 1).padStart(2, '0')}`,
      number: i + 1,
      questionIds: slice.map((q) => q.id),
    });
  }
  return tickets;
}

export interface SessionOptions {
  mode: ExamMode;
  bundle: ContentBundle;
  topicId?: string;
  ticketId?: string;
  weakQuestionIds?: string[];
  profileOverride?: ExamProfile;
}

export interface SessionPlan {
  mode: ExamMode;
  profile: ExamProfile;
  questions: Question[];
  topicId?: string;
  ticketId?: string;
  title: Localized;
}

export const BLITZ_PROFILE: Omit<ExamProfile, 'id' | 'name' | 'sourceNote'> = {
  category: 'B',
  questions: 10,
  minutes: 0,
  maxErrors: 0,
  passRule: 'none',
  revealAnswers: false,
  shuffleQuestions: true,
  shuffleOptions: false,
};

function profileFor(bundle: ContentBundle, id: string): ExamProfile {
  const found = bundle.examProfiles.find((p) => p.id === id);
  if (!found) throw new Error(`unknown exam profile "${id}"`);
  return found;
}

function take(list: readonly Question[], count: number, seed = hashString('session')): Question[] {
  return shuffleWithSeed(list, seed).slice(0, count);
}

export function buildSession(options: SessionOptions): SessionPlan {
  const { bundle, mode } = options;
  const examProfile = profileFor(bundle, 'kz_b');
  const trainingProfile = profileFor(bundle, 'kz_b_training');

  switch (mode) {
    case 'exam':
      return {
        mode,
        profile: examProfile,
        questions: take(bundle.questions, examProfile.questions),
        title: examProfile.name,
      };

    case 'training':
      return {
        mode,
        profile: trainingProfile,
        questions: take(bundle.questions, trainingProfile.questions),
        title: trainingProfile.name,
      };

    case 'blitz':
      return {
        mode,
        profile: {
          id: 'blitz',
          name: { ru: 'Блиц', kk: 'Блиц', en: 'Blitz' },
          category: 'B',
          questions: 10,
          minutes: 0,
          maxErrors: 0,
          passRule: 'none',
          revealAnswers: false,
          shuffleQuestions: true,
          shuffleOptions: false,
        },
        questions: take(bundle.questions, 10, hashString(`blitz-${todayKey()}`)),
        title: { ru: 'Блиц', kk: 'Блиц', en: 'Blitz' },
      };

    case 'daily': {
      const tickets = buildTickets(bundle.questions);
      const seed = hashString(`daily-${todayKey()}`);
      const ticket = tickets[seed % tickets.length] ?? tickets[0];
      const questions = (ticket?.questionIds ?? [])
        .map((id) => bundle.questions.find((q) => q.id === id))
        .filter((q): q is Question => Boolean(q));
      return {
        mode,
        profile: trainingProfile,
        questions,
        ticketId: ticket?.id,
        title: { ru: 'Билет дня', kk: 'Күн билеті', en: 'Ticket of the day' },
      };
    }

    case 'ticket': {
      const tickets = buildTickets(bundle.questions);
      const ticket = tickets.find((t) => t.id === options.ticketId) ?? tickets[0];
      const questions = (ticket?.questionIds ?? [])
        .map((id) => bundle.questions.find((q) => q.id === id))
        .filter((q): q is Question => Boolean(q));
      return {
        mode,
        profile: trainingProfile,
        questions,
        ticketId: ticket?.id,
        title: { ru: `Билет ${ticket?.number ?? 1}`, kk: `Билет ${ticket?.number ?? 1}`, en: `Ticket ${ticket?.number ?? 1}` },
      };
    }

    case 'topic': {
      const pool = bundle.questions.filter((q) => q.topicIds.includes(options.topicId ?? ''));
      const topic = bundle.topics.find((t) => t.id === options.topicId);
      const count = Math.min(pool.length, trainingProfile.questions);
      return {
        mode,
        profile: trainingProfile,
        questions: take(pool, count, hashString(`topic-${options.topicId}`)),
        topicId: options.topicId,
        title: topic?.title ?? { ru: 'Тема', kk: 'Тақырып', en: 'Topic' },
      };
    }

    case 'signs': {
      const pool = bundle.questions.filter((q) => (q.signIds?.length ?? 0) > 0);
      return {
        mode,
        profile: trainingProfile,
        questions: take(pool, Math.min(pool.length, trainingProfile.questions)),
        title: { ru: 'Только знаки', kk: 'Тек белгілер', en: 'Signs only' },
      };
    }

    case 'situations': {
      const pool = bundle.questions.filter((q) => Boolean(q.diagram));
      return {
        mode,
        profile: trainingProfile,
        questions: take(pool, Math.min(pool.length, trainingProfile.questions)),
        title: { ru: 'Только ситуации', kk: 'Тек жағдаяттар', en: 'Situations only' },
      };
    }

    case 'weak': {
      const weak = (options.weakQuestionIds ?? [])
        .map((id) => bundle.questions.find((q) => q.id === id))
        .filter((q): q is Question => Boolean(q));
      const pool = weak.length >= 5 ? weak : [...weak, ...bundle.questions.filter((q) => !weak.includes(q))];
      return {
        mode,
        profile: trainingProfile,
        questions: take(pool, Math.min(pool.length, trainingProfile.questions), hashString('weak')),
        title: { ru: 'Слабые места', kk: 'Әлсіз тұстар', en: 'Weak spots' },
      };
    }

    case 'mistakes': {
      const pool = (options.weakQuestionIds ?? [])
        .map((id) => bundle.questions.find((q) => q.id === id))
        .filter((q): q is Question => Boolean(q));
      return {
        mode,
        profile: trainingProfile,
        questions: pool.slice(0, Math.max(1, trainingProfile.questions)),
        title: { ru: 'Работа над ошибками', kk: 'Қателермен жұмыс', en: 'Fix your mistakes' },
      };
    }

    case 'marathon': {
      const questions = [...bundle.questions];
      return {
        mode,
        profile: { ...trainingProfile, questions: questions.length, name: { ru: 'Марафон', kk: 'Марафон', en: 'Marathon' } },
        questions,
        title: { ru: 'Марафон', kk: 'Марафон', en: 'Marathon' },
      };
    }

    default:
      return {
        mode: 'training',
        profile: trainingProfile,
        questions: take(bundle.questions, trainingProfile.questions),
        title: trainingProfile.name,
      };
  }
}

export const MODE_ORDER: ExamMode[] = [
  'exam',
  'training',
  'blitz',
  'weak',
  'mistakes',
  'daily',
  'signs',
  'situations',
  'marathon',
  'ticket',
];