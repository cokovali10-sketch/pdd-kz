import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBundle } from '../app/providers';
import { PddRefLinks } from '../components/exam/QuestionView';
import { pickLocalized } from '../lib/utils';

export function FinesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const [query, setQuery] = useState('');

  const fines = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bundle.fines;
    return bundle.fines.filter((fine) =>
      `${fine.article} ${pickLocalized(fine.title, locale)}`.toLowerCase().includes(q),
    );
  }, [bundle.fines, locale, query]);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('fines.title')}</h1>
          <p>{t('fines.subtitle')}</p>
        </div>
        <span className="chip chip--accent">{fines.length}</span>
      </header>

      <div className="callout callout--warn">
        <span className="chip chip--warning">{t('fines.draft')}</span>
        <span>{t('fines.draftNote')}</span>
      </div>

      <div className="searchbar">
        <Search size={17} />
        <input
          className="input"
          placeholder={`${t('common.search')}…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('common.search')}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('fines.article')}</th>
              <th>{t('fines.title')}</th>
              <th>{t('fines.amount')}</th>
              <th>{t('common.pddRef')}</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((fine) => (
              <tr key={fine.id} id={fine.id} style={{ scrollMarginTop: 96 }}>
                <td className="mono" data-label={t('fines.article')}>
                  {fine.article}
                </td>
                <td data-label={t('fines.title')}>
                  <strong>{pickLocalized(fine.title, locale)}</strong>
                  {fine.note ? (
                    <div className="muted" style={{ fontSize: 'var(--step--1)', marginTop: 4 }}>
                      {pickLocalized(fine.note, locale)}
                    </div>
                  ) : null}
                </td>
                <td className="mono" data-label={t('fines.amount')} style={{ whiteSpace: 'nowrap' }}>
                  {fine.amountMrep} {t('fines.mrep')}
                </td>
                <td data-label={t('common.pddRef')}>
                  <PddRefLinks refs={fine.pdDRefs} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="faint" style={{ fontSize: 'var(--step--1)' }}>
        <Link to="/reference" className="link-quiet">
          {t('reference.title')}
        </Link>{' '}
        · {t('footer.contentNote')}
      </p>
    </div>
  );
}