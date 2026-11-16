import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Star } from 'lucide-react';
import { useBundle } from '../app/providers';
import { buildSession } from '../lib/selection';
import { db, toggleFavorite } from '../lib/storage';
import { useExamSession } from '../store/useExamSession';
import { pickLocalized } from '../lib/utils';
import { EmptyState } from '../components/ui/StateViews';

export function TopicDetailPage() {
  const { topicId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const navigate = useNavigate();
  const session = useExamSession();
  const srs = useLiveQuery(() => db.srs.toArray(), [], []);
  const favorites = useLiveQuery(() => db.favorites.toArray(), [], []);

  const topic = bundle.topics.find((item) => item.id === topicId);
  const questions = useMemo(() => bundle.questions.filter((q) => q.topicIds.includes(topicId ?? '')), [bundle.questions, topicId]);

  if (!topic) {
    return <EmptyState title={t('notfound.title')}>{t('notfound.body')}</EmptyState>;
  }

  const start = () => {
    session.start(buildSession({ mode: 'topic', bundle, topicId: topic.id }));
    navigate('/exam/run');
  };

  const accuracy = (questionId: string) => {
    const state = srs?.find((row) => row.questionId === questionId);
    return state ? Math.round(state.accuracy * 100) : null;
  };

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <span className="chip chip--accent">{questions.length} {t('topics.questions')}</span>
          <h1 style={{ marginTop: 10 }}>{pickLocalized(topic.title, locale)}</h1>
          <p>{pickLocalized(topic.short, locale)}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={start} disabled={questions.length === 0}>
          {t('topics.open')} <ArrowRight size={16} />
        </button>
      </header>

      <div className="stack">
        {questions.map((question) => {
          const acc = accuracy(question.id);
          const saved = favorites?.some((row) => row.questionId === question.id) ?? false;
          return (
            <article key={question.id} className="card" style={{ display: 'grid', gap: 10 }}>
              <div className="row row--between">
                <span className="chip">
                  {question.diagram ? '◧' : question.signIds?.length ? '◈' : '◇'} {question.id}
                </span>
                <div className="row">
                  {acc !== null ? <span className="chip chip--accent">{t('topics.accuracy')} {acc}%</span> : null}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('favorites.questions')}
                    title={t('favorites.questions')}
                    onClick={() => void toggleFavorite(question.id)}
                    style={{ color: saved ? 'var(--warning)' : undefined }}
                  >
                    <Star size={16} fill={saved ? 'currentColor' : 'none'} />
                  </button>
                  <Link to={`/exam/preview/${question.id}`} className="btn btn--sm">
                    {t('common.readMore')}
                  </Link>
                </div>
              </div>
              <h3 style={{ margin: 0, fontSize: 'var(--step-1)' }}>{pickLocalized(question.text, locale)}</h3>
              <p className="muted" style={{ margin: 0 }}>{pickLocalized(question.explanation, locale)}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}