import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useBundle } from '../app/providers';
import { searchContent, type SearchHit } from '../lib/search';
import { pickLocalized } from '../lib/utils';

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  question: 'search.inQuestions',
  sign: 'search.inSigns',
  pdd: 'search.inPdd',
  fine: 'search.inFines',
};

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [draft, setDraft] = useState(query);

  const hits = useMemo(() => (query.trim() ? searchContent(bundle, query, locale) : []), [bundle, locale, query]);

  const submit = (value: string) => {
    setDraft(value);
    if (value.trim()) setParams({ q: value });
    else setParams({});
  };

  const grouped = useMemo(() => {
    const map = new Map<SearchHit['kind'], SearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.kind) ?? [];
      list.push(hit);
      map.set(hit.kind, list);
    }
    return [...map.entries()];
  }, [hits]);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('search.title')}</h1>
          <p>{t('search.placeholder')}</p>
        </div>
        <span className="chip chip--accent">{hits.length}</span>
      </header>

      <form
        className="searchbar"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <Search size={17} />
        <input
          className="input"
          placeholder={t('search.placeholder')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={t('search.placeholder')}
          autoFocus
        />
      </form>

      {query && hits.length === 0 ? <div className="card center muted">{t('search.noResults')}</div> : null}
      {!query ? <div className="card center muted">{t('search.empty')}</div> : null}

      {grouped.map(([kind, list]) => (
        <section key={kind} className="stack--sm" style={{ display: 'grid', gap: 10 }}>
          <h2>
            {t(KIND_LABEL[kind])} <span className="faint">({list.length})</span>
          </h2>
          <div className="stack--sm" style={{ display: 'grid', gap: 10 }}>
            {list.map((hit) => (
              <Link key={`${kind}-${hit.id}`} to={hit.to} className="card" style={{ display: 'grid', gap: 6 }}>
                <div className="row row--between">
                  <strong>{pickLocalized(hit.title, locale)}</strong>
                  <span className="chip mono">{kind === 'sign' ? hit.id.replace('s_', '') : hit.id}</span>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 'var(--step--1)' }}>
                  {pickLocalized(hit.snippet, locale)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}