import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, CalendarDays, Flame, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { useBundle } from '../app/providers';
import { db } from '../lib/storage';
import { byWeakness, pickWeak } from '../lib/srs';
import { pickLocalized } from '../lib/utils';
import { LoadingState, ErrorState } from '../components/ui/StateViews';
import { useContent } from '../app/providers';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const { error, reload } = useContent();

  const attempts = useLiveQuery(() => db.attempts.orderBy('at').reverse().limit(60).toArray(), [], []);
  const profile = useLiveQuery(() => db.profile.get('main'), [], undefined);
  const srs = useLiveQuery(() => db.srs.toArray(), [], []);

  const today = useMemo(() => {
    const from = startOfToday();
    const rows = (attempts ?? []).filter((a) => a.at >= from);
    const answers = rows.reduce((sum, row) => sum + row.total, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    return {
      answered: answers,
      accuracy: answers === 0 ? 0 : Math.round((correct / answers) * 100),
      sessions: rows.length,
    };
  }, [attempts]);

  const weak = useMemo(
    () =>
      (srs ?? [])
        .filter(pickWeak)
        .sort(byWeakness)
        .slice(0, 6)
        .map((state) => bundle.questions.find((q) => q.id === state.questionId))
        .filter((q): q is NonNullable<typeof q> => Boolean(q)),
    [bundle.questions, srs],
  );

  const popularTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of bundle.questions) {
      for (const topicId of question.topicIds) counts.set(topicId, (counts.get(topicId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({ topic: bundle.topics.find((topic) => topic.id === id), count }))
      .filter((entry): entry is { topic: NonNullable<typeof entry.topic>; count: number } => Boolean(entry.topic));
  }, [bundle.questions, bundle.topics]);

  if (error) {
    return <ErrorState message={t('common.error')} hint={t('common.retryLater')} onRetry={reload} />;
  }

  const streak = profile?.streakDays ?? 0;
  const xp = profile?.xp ?? 0;

  return (
    <div className="stack" style={{ gap: 26 }}>
      <section className="hero fade-up">
        <div className="hero__inner">
          <span className="chip chip--accent">
            <Sparkles size={13} /> {t('home.badge')}
          </span>
          <h1 className="hero__title">{t('home.heroTitle')}</h1>
          <p className="hero__text">{t('home.heroSubtitle')}</p>
          <div className="hero__actions">
            <Link to="/exam" className="btn btn--primary btn--lg">
              {t('home.startExam')} <ArrowRight size={18} />
            </Link>
            <Link to="/exam" className="btn btn--lg btn--ghost">
              {t('home.practice')}
            </Link>
          </div>
          <div className="row" style={{ gap: 7 }}>
            <Link to="/exam" className="chip">
              <Zap size={12} /> {t('exam.mode.blitz')}
            </Link>
            <Link to="/exam" className="chip">
              <CalendarDays size={12} /> {t('home.daily')}
            </Link>
            <Link to="/exam" className="chip">
              <Flame size={12} /> {t('exam.mode.weak')}
            </Link>
            <Link to="/top" className="chip">
              <Trophy size={12} /> {t('nav.top')}
            </Link>
          </div>
          <div className="hero__facts">
            <span className="chip">
              <Target size={13} /> {bundle.questions.length} {t('topics.questions')}
            </span>
            <span className="chip">
              <Zap size={13} /> {t('home.featureModes')}
            </span>
            <span className="chip">
              <Flame size={13} /> {t('home.offline')}
            </span>
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat">
          <span className="stat__label">{t('home.todayStats')}</span>
          <span className="stat__value">
            {today.answered} <span className="faint" style={{ fontSize: 'var(--step--1)' }}>{t('home.answered')}</span>
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('home.accuracy')}</span>
          <span className="stat__value">{today.accuracy}%</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('home.streak')}</span>
          <span className="stat__value">
            {streak} <Flame size={18} style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--warning)' }} />
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">XP</span>
          <span className="stat__value">{xp}</span>
        </div>
      </section>

      {weak.length > 0 ? (
        <section className="card card--accent">
          <div className="row row--between">
            <div>
              <h3 style={{ margin: 0 }}>{t('home.weakTitle')}</h3>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {t('home.weakDesc')}
              </p>
            </div>
            <Link to="/exam" className="btn btn--sm btn--primary">
              {t('home.startWeak')}
            </Link>
          </div>
          <ul className="pill-list" style={{ marginTop: 14 }}>
            {weak.map((question) => (
              <li key={question.id}>
                <Link className="chip" to={`/exam/preview/${question.id}`}>
                  {pickLocalized(question.text, locale).slice(0, 68)}
                  {pickLocalized(question.text, locale).length > 68 ? '…' : ''}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="row row--between" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>{t('home.popular')}</h2>
          <Link to="/topics" className="link-quiet">
            {t('home.allTopics')}
          </Link>
        </div>
        <div className="grid grid--3">
          {popularTopics.map(({ topic, count }) => (
            <Link key={topic.id} to={`/topics/${topic.id}`} className="card" style={{ display: 'grid', gap: 6 }}>
              <span className="row" style={{ gap: 8 }}>
                <span className="chip chip--accent">{count}</span>
                <strong>{pickLocalized(topic.title, locale)}</strong>
              </span>
              <span className="muted" style={{ fontSize: 'var(--step--1)' }}>
                {pickLocalized(topic.short, locale)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid--2">
        <div className="card">
          <h3>{t('home.featureModes')}</h3>
          <p className="muted">{t('home.featureModesDesc')}</p>
          <Link to="/exam" className="link-quiet">
            {t('exam.modes')} →
          </Link>
        </div>
        <div className="card">
          <h3>{t('home.featureSigns')}</h3>
          <p className="muted">{t('home.featureSignsDesc')}</p>
          <div className="row">
            <Link to="/signs" className="link-quiet">
              {t('home.openSigns')} →
            </Link>
            <Link to="/markings" className="link-quiet">
              {t('nav.markings')} →
            </Link>
          </div>
        </div>
        <div className="card">
          <h3>{t('home.featurePdd')}</h3>
          <p className="muted">{t('home.featurePddDesc')}</p>
          <Link to="/reference" className="link-quiet">
            {t('home.openReference')} →
          </Link>
        </div>
        <div className="card">
          <h3>{t('home.featureProgress')}</h3>
          <p className="muted">{t('home.featureProgressDesc')}</p>
          <Link to="/progress" className="link-quiet">
            {t('progress.title')} →
          </Link>
        </div>
      </section>
    </div>
  );
}

export function HomeFallback() {
  const { t } = useTranslation();
  return <LoadingState label={t('common.loading')} />;
}