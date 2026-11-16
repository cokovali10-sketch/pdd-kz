import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useBundle } from '../app/providers';
import { pickLocalized } from '../lib/utils';

export function ReferencePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const [query, setQuery] = useState('');

  const chapters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bundle.chapters
      .map((chapter) => ({
        chapter,
        points: q === ''
          ? chapter.points
          : chapter.points.filter((point) =>
              `${point.id} ${pickLocalized(point.text, locale)}`.toLowerCase().includes(q),
            ),
      }))
      .filter((entry) => entry.points.length > 0);
  }, [bundle.chapters, locale, query]);

  const total = bundle.chapters.reduce((sum, chapter) => sum + chapter.points.length, 0);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('reference.title')}</h1>
          <p>{t('reference.subtitle')}</p>
        </div>
        <span className="chip chip--accent">
          {bundle.chapters.length} / {total} {t('reference.points')}
        </span>
      </header>

      <div className="callout callout--warn">{t('reference.sourceNote')}</div>

      <div className="searchbar">
        <Search size={17} />
        <input
          className="input"
          placeholder={t('reference.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('reference.search')}
        />
      </div>

      {chapters.length === 0 ? <div className="card center muted">{t('reference.empty')}</div> : null}

      <div className="grid grid--2">
        {chapters.map(({ chapter, points }) => (
          <Link key={chapter.id} to={`/reference/${chapter.id}`} className="card" style={{ display: 'grid', gap: 8 }}>
            <div className="row row--between">
              <h3 style={{ margin: 0 }}>Глава {chapter.id}</h3>
              <span className="chip">{points.length} {t('reference.points')}</span>
            </div>
            <p className="muted" style={{ margin: 0, fontWeight: 600 }}>
              {pickLocalized(chapter.title, locale)}
            </p>
            {query ? (
              <ul className="pill-list">
                {points.slice(0, 4).map((point) => (
                  <li key={point.id} className="chip mono">
                    {point.id}
                  </li>
                ))}
              </ul>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}