import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useBundle } from '../app/providers';
import { SignImage } from '../components/signs/SignImage';
import { PddRefLinks } from '../components/exam/QuestionView';
import { db, toggleFavorite } from '../lib/storage';
import { pickLocalized } from '../lib/utils';
import { EmptyState } from '../components/ui/StateViews';

export function SignDetailPage() {
  const { code } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const favorites = useLiveQuery(() => db.favorites.toArray(), [], []);

  const sign = bundle.signs.find((item) => item.code === code);
  if (!sign) {
    return <EmptyState title={t('notfound.title')}>{t('notfound.body')}</EmptyState>;
  }

  const related = bundle.questions.filter((q) => q.signIds?.includes(sign.id));
  const markingQuestions = related;

  return (
    <div className="stack">
      <Link to="/signs" className="btn btn--ghost btn--sm" style={{ justifySelf: 'start' }}>
        <ArrowLeft size={15} /> {t('signs.title')}
      </Link>

      <section className="card">
        <div className="sign-hero">
          <SignImage sign={sign} size={180} className="" />
          <div>
            <div className="row">
              <span className="chip chip--accent mono">{sign.code}</span>
              <span className="chip">{t(`signs.group.${sign.group}`)}</span>
            </div>
            <h1 style={{ margin: '10px 0 6px' }}>{pickLocalized(sign.title, locale)}</h1>
            <p className="muted" style={{ margin: 0 }}>{pickLocalized(sign.desc, locale)}</p>
          </div>
        </div>
      </section>

      <div className="grid grid--2">
        <div className="card">
          <h4>{t('signs.applies')}</h4>
          <div className="tag-list">
            {sign.applies.map((category) => (
              <span key={category} className="chip">
                {category}
              </span>
            ))}
          </div>
        </div>
        <div className="card">
          <h4>{t('common.relatedSigns')}</h4>
          <PddRefLinks refs={[{ chapter: '8' }]} />
        </div>
      </div>

      <section>
        <h2>{t('signs.related')} ({related.length})</h2>
        {related.length === 0 ? (
          <p className="muted">{t('favorites.empty')}</p>
        ) : (
          <div className="stack">
            {markingQuestions.map((question) => {
              const saved = favorites?.some((row) => row.questionId === question.id) ?? false;
              return (
                <article key={question.id} className="card" style={{ display: 'grid', gap: 8 }}>
                  <div className="row row--between">
                    <span className="chip mono">{question.id}</span>
                    <div className="row">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void toggleFavorite(question.id)}
                        aria-label={t('favorites.questions')}
                        style={{ color: saved ? 'var(--warning)' : undefined }}
                      >
                        <Star size={16} fill={saved ? 'currentColor' : 'none'} />
                      </button>
                      <Link to={`/exam/preview/${question.id}`} className="btn btn--sm">
                        {t('common.readMore')}
                      </Link>
                    </div>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 'var(--step-0)' }}>{pickLocalized(question.text, locale)}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: 'var(--step--1)' }}>
                    {pickLocalized(question.explanation, locale)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}