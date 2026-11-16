import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Clock,
  Crown,
  Flame,
  ShieldCheck,
  Signpost,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { useBundle } from '../app/providers';
import { db } from '../lib/storage';
import { ACHIEVEMENTS, evaluateAchievements, type AchievementIcon } from '../lib/achievements';
import { formatDuration, pickLocalized } from '../lib/utils';

const ICONS: Record<AchievementIcon, typeof Sparkles> = {
  spark: Sparkles,
  target: Target,
  flame: Flame,
  trophy: Trophy,
  zap: Zap,
  book: BookOpen,
  sign: Signpost,
  shield: ShieldCheck,
  crown: Crown,
  clock: Clock,
};

const MODE_KEY: Record<string, string> = {
  exam: 'exam.mode.exam',
  training: 'exam.mode.training',
  blitz: 'exam.mode.blitz',
  weak: 'exam.mode.weak',
  mistakes: 'exam.mode.mistakes',
  daily: 'exam.mode.daily',
  signs: 'exam.mode.signs',
  situations: 'exam.mode.situations',
  marathon: 'exam.mode.marathon',
  ticket: 'exam.mode.tickets',
  topic: 'nav.topics',
};

export function TopPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const attempts = useLiveQuery(() => db.attempts.orderBy('at').reverse().limit(300).toArray(), [], []);
  const srs = useLiveQuery(() => db.srs.toArray(), [], []);
  const profile = useLiveQuery(() => db.profile.get('main'), [], undefined);

  const states = useMemo(
    () =>
      evaluateAchievements({
        attempts: attempts ?? [],
        srs: srs ?? [],
        xp: profile?.xp ?? 0,
        streakDays: profile?.streakDays ?? 0,
      }),
    [attempts, profile?.streakDays, profile?.xp, srs],
  );

  const unlocked = states.filter((state) => state.unlocked).length;

  const records = useMemo(() => {
    const rows = attempts ?? [];
    const byMode = new Map<string, { best: number; fastest: number; count: number }>();
    for (const attempt of rows) {
      const entry = byMode.get(attempt.mode) ?? { best: 0, fastest: Number.POSITIVE_INFINITY, count: 0 };
      entry.best = Math.max(entry.best, Math.round(attempt.accuracy * 100));
      if (attempt.accuracy === 1) entry.fastest = Math.min(entry.fastest, attempt.durationMs);
      entry.count += 1;
      byMode.set(attempt.mode, entry);
    }
    return [...byMode.entries()]
      .map(([mode, value]) => ({
        mode,
        ...value,
        fastest: Number.isFinite(value.fastest) ? value.fastest : null,
      }))
      .sort((a, b) => b.best - a.best || b.count - a.count);
  }, [attempts]);

  const hardest = useMemo(() => {
    const counts = new Map<string, number>();
    const totals = new Map<string, number>();
    for (const attempt of attempts ?? []) {
      for (const answer of attempt.answers) {
        totals.set(answer.questionId, (totals.get(answer.questionId) ?? 0) + 1);
        if (!answer.correct) counts.set(answer.questionId, (counts.get(answer.questionId) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([questionId, wrong]) => ({ questionId, wrong, total: totals.get(questionId) ?? 0 }))
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 6)
      .map((entry) => ({ ...entry, question: bundle.questions.find((q) => q.id === entry.questionId) }))
      .filter((entry) => entry.question);
  }, [attempts, bundle.questions]);

  const topicStats = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const attempt of attempts ?? []) {
      for (const answer of attempt.answers) {
        const question = bundle.questions.find((q) => q.id === answer.questionId);
        for (const topicId of question?.topicIds ?? []) {
          const entry = map.get(topicId) ?? { total: 0, correct: 0 };
          entry.total += 1;
          if (answer.correct) entry.correct += 1;
          map.set(topicId, entry);
        }
      }
    }
    return [...map.entries()]
      .map(([id, value]) => ({
        id,
        total: value.total,
        accuracy: value.total === 0 ? 0 : Math.round((value.correct / value.total) * 100),
      }))
      .filter((entry) => bundle.topics.some((topic) => topic.id === entry.id))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 8);
  }, [attempts, bundle.questions, bundle.topics]);

  return (
    <div className="stack" style={{ gap: 22 }}>
      <header className="page-head">
        <div>
          <h1>{t('top.title')}</h1>
          <p>{t('top.subtitle')}</p>
        </div>
        <span className="chip chip--accent">
          <Trophy size={13} /> {unlocked} / {ACHIEVEMENTS.length}
        </span>
      </header>

      <section>
        <h2 style={{ marginBottom: 12 }}>{t('top.achievements')}</h2>
        <div className="grid grid--2">
          {states.map((state) => {
            const Icon = ICONS[state.achievement.icon];
            return (
              <article
                key={state.achievement.id}
                className={`achievement ${state.unlocked ? 'is-unlocked' : ''}`}
                title={pickLocalized(state.achievement.description, locale)}
              >
                <span className="achievement__icon">
                  <Icon size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="achievement__title">{pickLocalized(state.achievement.title, locale)}</div>
                  <div className="achievement__desc">{pickLocalized(state.achievement.description, locale)}</div>
                  <div className="progress progress--sm achievement__progress">
                    <div className="progress__fill" style={{ width: `${Math.round(state.ratio * 100)}%` }} />
                  </div>
                </div>
                <span className="chip chip--sm mono">
                  {state.value}/{state.achievement.goal}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>{t('top.records')}</h3>
        {records.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t('progress.empty')}
          </p>
        ) : (
          <div>
            {records.map((record) => (
              <div key={record.mode} className="record-row">
                <div style={{ minWidth: 0 }}>
                  <div className="record-row__title">
                    {t(MODE_KEY[record.mode] ?? 'nav.exam')}
                  </div>
                  <div className="record-row__meta">
                    {record.count} {t('progress.sessions')}
                    {record.fastest !== null ? (
                      <span className="row" style={{ gap: 3, display: 'inline-flex' }}>
                        {' · '}
                        <Zap size={11} style={{ color: 'var(--warning)' }} />
                        {formatDuration(record.fastest)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="record-row__value" style={{ color: record.best >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                  {record.best}%
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid--2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>{t('top.hardest')}</h3>
          {hardest.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              {t('top.hardestEmpty')}
            </p>
          ) : (
            <div>
              {hardest.map((entry) => (
                <Link key={entry.questionId} to={`/exam/preview/${entry.questionId}`} className="record-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="record-row__title" style={{ fontSize: '0.9rem' }}>
                      {pickLocalized(entry.question!.text, locale).slice(0, 62)}
                      {pickLocalized(entry.question!.text, locale).length > 62 ? '…' : ''}
                    </div>
                    <div className="record-row__meta mono">{entry.questionId}</div>
                  </div>
                  <span className="chip chip--danger chip--sm">{entry.wrong}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>{t('top.topics')}</h3>
          {topicStats.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              {t('progress.empty')}
            </p>
          ) : (
            <div className="stack--sm" style={{ display: 'grid', gap: 12 }}>
              {topicStats.map((entry) => {
                const topic = bundle.topics.find((item) => item.id === entry.id);
                return (
                  <div key={entry.id} className="stack--sm" style={{ display: 'grid', gap: 5 }}>
                    <div className="row row--between">
                      <Link to={`/topics/${entry.id}`} className="link-quiet" style={{ fontSize: '0.92rem' }}>
                        {topic ? pickLocalized(topic.title, locale) : entry.id}
                      </Link>
                      <span className="mono muted" style={{ fontSize: 'var(--step--2)' }}>
                        {entry.accuracy}%
                      </span>
                    </div>
                    <div className="progress progress--sm">
                      <div
                        className={`progress__fill ${entry.accuracy >= 70 ? 'is-success' : 'is-danger'}`}
                        style={{ width: `${entry.accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="row row--between">
          <div>
            <h3 style={{ margin: 0 }}>{t('top.weakCta')}</h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--step--1)' }}>
              {t('exam.mode.weakDesc')}
            </p>
          </div>
          <Link to="/exam" className="btn btn--primary btn--sm">
            {t('home.startWeak')}
          </Link>
        </div>
      </section>

      <div className="row" style={{ gap: 8 }}>
        <span className="chip chip--sm">
          <Award size={12} /> {t('top.footerNote')}
        </span>
        <span className="chip chip--sm">v1</span>
      </div>
    </div>
  );
}