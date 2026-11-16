import type { Locale } from './types';

export type Tri = Record<Locale, string>;

export interface AttemptLike {
  at: number;
  mode: string;
  total: number;
  correct: number;
  accuracy: number;
  passed: boolean;
  durationMs: number;
  answers: { questionId: string; correct: boolean }[];
  failedQuestionIds: string[];
}

export interface SrsLike {
  questionId: string;
  lapses: number;
  streak: number;
  accuracy: number;
}

export interface AchievementContext {
  attempts: AttemptLike[];
  srs: SrsLike[];
  xp: number;
  streakDays: number;
}

export type AchievementIcon =
  | 'spark'
  | 'target'
  | 'flame'
  | 'trophy'
  | 'zap'
  | 'book'
  | 'sign'
  | 'shield'
  | 'crown'
  | 'clock';

export interface Achievement {
  id: string;
  title: Tri;
  description: Tri;
  icon: AchievementIcon;
  goal: number;
  value: (ctx: AchievementContext) => number;
  unit?: string;
}

export interface AchievementState {
  achievement: Achievement;
  value: number;
  unlocked: boolean;
  ratio: number;
}

const DAY = 86_400_000;

function distinctDays(attempts: AttemptLike[]): number {
  const days = new Set<string>();
  for (const attempt of attempts) {
    const date = new Date(attempt.at);
    days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  }
  return days.size;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_test',
    title: { ru: 'Первый шаг', kk: 'Алғашқы қадам', en: 'First step' },
    description: { ru: 'Пройти первую попытку', kk: 'Алғашқы әрекетті өту', en: 'Finish your first attempt' },
    icon: 'spark',
    goal: 1,
    value: (ctx) => ctx.attempts.length,
  },
  {
    id: 'tests_10',
    title: { ru: 'Разогрев', kk: 'Жылыту', en: 'Warm-up' },
    description: { ru: 'Пройти 10 попыток', kk: '10 әрекетті өту', en: 'Finish 10 attempts' },
    icon: 'target',
    goal: 10,
    value: (ctx) => ctx.attempts.length,
  },
  {
    id: 'tests_50',
    title: { ru: 'Марафонец', kk: 'Марафоншы', en: 'Marathoner' },
    description: { ru: 'Пройти 50 попыток', kk: '50 әрекетті өту', en: 'Finish 50 attempts' },
    icon: 'crown',
    goal: 50,
    value: (ctx) => ctx.attempts.length,
  },
  {
    id: 'answers_100',
    title: { ru: 'Сотня', kk: 'Жүздік', en: 'Century' },
    description: { ru: 'Ответить на 100 вопросов', kk: '100 сұраққа жауап беру', en: 'Answer 100 questions' },
    icon: 'book',
    goal: 100,
    value: (ctx) => ctx.attempts.reduce((sum, attempt) => sum + attempt.total, 0),
  },
  {
    id: 'answers_500',
    title: { ru: 'Полтысячи', kk: 'Жарты мың', en: 'Five hundred' },
    description: { ru: 'Ответить на 500 вопросов', kk: '500 сұраққа жауап беру', en: 'Answer 500 questions' },
    icon: 'book',
    goal: 500,
    value: (ctx) => ctx.attempts.reduce((sum, attempt) => sum + attempt.total, 0),
  },
  {
    id: 'perfect_1',
    title: { ru: 'Без ошибок', kk: 'Қатесіз', en: 'Flawless' },
    description: {
      ru: 'Пройти попытку из 20+ вопросов без единой ошибки',
      kk: '20+ сұрақтан тұратын әрекетті қатесіз өту',
      en: 'Finish a 20+ question attempt with no mistakes',
    },
    icon: 'shield',
    goal: 1,
    value: (ctx) => ctx.attempts.filter((attempt) => attempt.total >= 20 && attempt.correct === attempt.total).length,
  },
  {
    id: 'perfect_5',
    title: { ru: 'Перфекционист', kk: 'Перфекционист', en: 'Perfectionist' },
    description: { ru: 'Пять идеальных попыток', kk: 'Бес идеал әрекет', en: 'Five perfect attempts' },
    icon: 'trophy',
    goal: 5,
    value: (ctx) => ctx.attempts.filter((attempt) => attempt.total >= 20 && attempt.correct === attempt.total).length,
  },
  {
    id: 'fast_exam',
    title: { ru: 'Быстрее ветра', kk: 'Желден жылдам', en: 'Faster than wind' },
    description: {
      ru: 'Сдать экзамен быстрее чем за 10 минут',
      kk: 'Емтиханды 10 минуттан аз уақытта тапсыру',
      en: 'Pass an exam in under 10 minutes',
    },
    icon: 'zap',
    goal: 1,
    value: (ctx) =>
      ctx.attempts.filter(
        (attempt) => attempt.mode === 'exam' && attempt.passed && attempt.durationMs < 10 * 60 * 1000,
      ).length,
  },
  {
    id: 'streak_3',
    title: { ru: 'Три дня подряд', kk: 'Үш күн қатарынан', en: 'Three in a row' },
    description: { ru: 'Заниматься 3 дня подряд', kk: 'Үш күн қатарынан жаттығу', en: 'Practise 3 days in a row' },
    icon: 'flame',
    goal: 3,
    value: (ctx) => ctx.streakDays,
  },
  {
    id: 'streak_7',
    title: { ru: 'Неделя', kk: 'Апта', en: 'Week' },
    description: { ru: 'Заниматься 7 дней подряд', kk: '7 күн қатарынан жаттығу', en: 'Practise 7 days in a row' },
    icon: 'flame',
    goal: 7,
    value: (ctx) => ctx.streakDays,
  },
  {
    id: 'streak_30',
    title: { ru: 'Месяц', kk: 'Ай', en: 'Month' },
    description: { ru: 'Заниматься 30 дней подряд', kk: '30 күн қатарынан жаттығу', en: 'Practise 30 days in a row' },
    icon: 'flame',
    goal: 30,
    value: (ctx) => ctx.streakDays,
  },
  {
    id: 'xp_1000',
    title: { ru: 'Тысяча XP', kk: 'Мың XP', en: 'Thousand XP' },
    description: { ru: 'Набрать 1000 XP', kk: '1000 XP жинау', en: 'Earn 1000 XP' },
    icon: 'spark',
    goal: 1000,
    value: (ctx) => ctx.xp,
  },
  {
    id: 'signs_25',
    title: { ru: 'Знаток знаков', kk: 'Белгі білгіші', en: 'Sign expert' },
    description: {
      ru: 'Правильно ответить на 25 вопросов со знаками',
      kk: 'Белгілер бар 25 сұраққа дұрыс жауап беру',
      en: 'Answer 25 sign questions correctly',
    },
    icon: 'sign',
    goal: 25,
    value: (ctx) =>
      ctx.attempts.reduce(
        (sum, attempt) => sum + attempt.answers.filter((answer) => answer.correct && answer.questionId.includes('sign')).length,
        0,
      ),
  },
  {
    id: 'days_7',
    title: { ru: 'Неделя практики', kk: 'Апталық тәжірибе', en: 'Week of practice' },
    description: { ru: 'Заниматься 7 разных дней', kk: '7 әртүрлі күн жаттығу', en: 'Practise on 7 different days' },
    icon: 'clock',
    goal: 7,
    value: (ctx) => distinctDays(ctx.attempts),
  },
];

export function evaluateAchievements(ctx: AchievementContext): AchievementState[] {
  return ACHIEVEMENTS.map((achievement) => {
    const raw = achievement.value(ctx);
    const value = Math.max(0, Math.min(raw, achievement.goal));
    return {
      achievement,
      value,
      unlocked: raw >= achievement.goal,
      ratio: achievement.goal === 0 ? 1 : Math.min(1, raw / achievement.goal),
    };
  });
}

export function achievementProgressLabel(state: AchievementState): string {
  return `${state.value} / ${state.achievement.goal}`;
}

/** Days practised in the trailing window, used by the activity strip. */
export function practisedDates(attempts: AttemptLike[], windowDays = 84): Map<string, number> {
  const counts = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = today.getTime() - (windowDays - 1) * DAY;

  for (const attempt of attempts) {
    if (attempt.at < from) continue;
    const date = new Date(attempt.at);
    date.setHours(0, 0, 0, 0);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}