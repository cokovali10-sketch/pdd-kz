import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight } from 'lucide-react';
import { useBundle } from '../app/providers';
import { db } from '../lib/storage';
import { pickLocalized } from '../lib/utils';
import type { Topic } from '../lib/types';

export function TopicsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const srs = useLiveQuery(() => db.srs.toArray(), [], []);

  const counts = useMemo(() => {
    const map = new Map<string, { total: number; accuracy: number[] }>();
    for (const question of bundle.questions) {
      for (const topicId of question.topicIds) {
        const entry = map.get(topicId) ?? { total: 0, accuracy: [] };
        entry.total += 1;
        map.set(topicId, entry);
      }
    }
    for (const state of srs ?? []) {
      const question = bundle.questions.find((q) => q.id === state.questionId);
      for (const topicId of question?.topicIds ?? []) {
        const entry = map.get(topicId);
        if (entry) entry.accuracy.push(state.accuracy);
      }
    }
    return map;
  }, [bundle.questions, srs]);

  const topics = [...bundle.topics].sort((a, b) => a.order - b.order);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('topics.title')}</h1>
          <p>{t('topics.subtitle')}</p>
        </div>
        <span className="chip chip--accent">{topics.length}</span>
      </header>

      <div className="grid grid--3">
        {topics.map((topic: Topic) => {
          const entry = counts.get(topic.id);
          const accuracy =
            entry && entry.accuracy.length > 0
              ? Math.round((entry.accuracy.reduce((a, b) => a + b, 0) / entry.accuracy.length) * 100)
              : 0;
          return (
            <Link key={topic.id} to={`/topics/${topic.id}`} className="card" style={{ display: 'grid', gap: 8 }}>
              <div className="row row--between">
                <strong>{pickLocalized(topic.title, locale)}</strong>
                <span className="chip">{entry?.total ?? 0}</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 'var(--step--1)' }}>
                {pickLocalized(topic.short, locale)}
              </p>
              <div className="progress">
                <div className="progress__fill" style={{ width: `${accuracy}%` }} />
              </div>
              <span className="faint" style={{ fontSize: 'var(--step--1)' }}>
                {t('topics.accuracy')}: {accuracy}%
              </span>
            </Link>
          );
        })}
      </div>

      <Link to="/exam" className="btn btn--primary" style={{ justifySelf: 'start' }}>
        {t('exam.mode.weak')} <ArrowRight size={16} />
      </Link>
    </div>
  );
}