import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBundle } from '../app/providers';
import { pickLocalized } from '../lib/utils';
import { EmptyState } from '../components/ui/StateViews';

export function ChapterPage() {
  const { chapterId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const chapter = bundle.chapters.find((item) => item.id === chapterId);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.replace('#', '');
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ block: 'center' });
  }, [chapterId]);

  if (!chapter) {
    return <EmptyState title={t('notfound.title')}>{t('notfound.body')}</EmptyState>;
  }

  return (
    <div className="stack">
      <Link to="/reference" className="btn btn--ghost btn--sm" style={{ justifySelf: 'start' }}>
        <ArrowLeft size={15} /> {t('reference.title')}
      </Link>

      <header className="page-head">
        <div>
          <span className="chip chip--accent mono">Глава {chapter.id}</span>
          <h1 style={{ marginTop: 10 }}>{pickLocalized(chapter.title, locale)}</h1>
        </div>
        <span className="chip">
          {chapter.points.length} {t('reference.points')}
        </span>
      </header>

      <div className="stack">
        {chapter.points.map((point) => (
          <article key={point.id} id={`p-${point.id}`} className="card" style={{ display: 'grid', gap: 8, scrollMarginTop: 96 }}>
            <div className="row row--between">
              <span className="chip chip--accent mono">п. {point.id}</span>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--step-0)', lineHeight: 1.65 }}>
              {pickLocalized(point.text, locale)}
            </p>
          </article>
        ))}
      </div>

      <div className="callout">{t('reference.sourceNote')}</div>
    </div>
  );
}