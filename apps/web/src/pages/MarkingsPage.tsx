import { useTranslation } from 'react-i18next';
import { useBundle } from '../app/providers';
import { pickLocalized } from '../lib/utils';

export function MarkingsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('markings.title')}</h1>
          <p>{t('markings.subtitle')}</p>
        </div>
        <span className="chip chip--accent">{bundle.markings.length}</span>
      </header>

      <div className="grid grid--3">
        {bundle.markings.map((marking) => (
          <article key={marking.id} className="card" style={{ display: 'grid', gap: 10 }}>
            <img
              src={marking.file}
              alt={pickLocalized(marking.title, locale)}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: 132, objectFit: 'cover', borderRadius: 12 }}
            />
            <div className="row row--between">
              <strong>{pickLocalized(marking.title, locale)}</strong>
              <span className="chip mono">{marking.id}</span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 'var(--step--1)' }}>
              {pickLocalized(marking.desc, locale)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}