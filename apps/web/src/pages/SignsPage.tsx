import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useBundle } from '../app/providers';
import { SignImage } from '../components/signs/SignImage';
import { pickLocalized } from '../lib/utils';
import type { SignGroup } from '../lib/types';

const GROUPS: SignGroup[] = ['warning', 'priority', 'prohibitory', 'mandatory', 'special', 'info', 'service', 'additional'];

export function SignsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const [group, setGroup] = useState<SignGroup | 'all'>('all');
  const [query, setQuery] = useState('');

  const signs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bundle.signs.filter((sign) => {
      if (group !== 'all' && sign.group !== group) return false;
      if (!q) return true;
      return (
        sign.code.includes(q) ||
        pickLocalized(sign.title, locale).toLowerCase().includes(q) ||
        pickLocalized(sign.desc, locale).toLowerCase().includes(q)
      );
    });
  }, [bundle.signs, group, locale, query]);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('signs.title')}</h1>
          <p>{t('signs.subtitle')}</p>
        </div>
        <span className="chip chip--accent">{signs.length} / {bundle.signs.length}</span>
      </header>

      <div className="stack--sm" style={{ display: 'grid', gap: 12 }}>
        <div className="searchbar">
          <Search size={17} />
          <input
            className="input"
            placeholder={t('signs.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t('signs.search')}
          />
        </div>
        <div className="row">
          <button
            type="button"
            className={`btn btn--sm ${group === 'all' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setGroup('all')}
          >
            {t('common.all')}
          </button>
          {GROUPS.map((item) => (
            <button
              key={item}
              type="button"
              className={`btn btn--sm ${group === item ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setGroup(item)}
            >
              {t(`signs.group.${item}`)}
            </button>
          ))}
        </div>
      </div>

      {signs.length === 0 ? (
        <div className="card center muted">{t('signs.empty')}</div>
      ) : (
        <div className="sign-grid">
          {signs.map((sign) => (
            <Link key={sign.id} to={`/signs/${sign.code}`} className="sign-tile">
              <SignImage sign={sign} size={76} />
              <span className="sign-tile__title">{pickLocalized(sign.title, locale)}</span>
              <span className="sign-tile__code">{sign.code}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}