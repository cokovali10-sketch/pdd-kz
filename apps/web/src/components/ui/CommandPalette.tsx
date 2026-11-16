import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useBundle } from '../../app/providers';
import { searchContent, type SearchHit } from '../../lib/search';
import { pickLocalized } from '../../lib/utils';

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  question: 'search.inQuestions',
  sign: 'search.inSigns',
  pdd: 'search.inPdd',
  fine: 'search.inFines',
};

const KIND_ICON: Record<SearchHit['kind'], string> = {
  question: '?',
  sign: '◈',
  pdd: '§',
  fine: '₸',
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const bundle = useBundle();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const hits = useMemo(
    () => (query.trim().length > 1 ? searchContent(bundle, query, locale, 12) : []),
    [bundle, locale, query],
  );

  const quick = useMemo(
    () => [
      { label: t('nav.exam'), to: '/exam', meta: t('home.featureModes') },
      { label: t('nav.signs'), to: '/signs', meta: `${bundle.signs.length}` },
      { label: t('nav.reference'), to: '/reference', meta: `${bundle.chapters.length}` },
      { label: t('nav.fines'), to: '/fines', meta: `${bundle.fines.length}` },
      { label: t('nav.progress'), to: '/progress', meta: '' },
    ],
    [bundle, t],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  const total = query.trim().length > 1 ? hits.length : quick.length;

  const go = (index: number) => {
    if (query.trim().length > 1) {
      const hit = hits[index];
      if (!hit) return;
      navigate(hit.to);
    } else {
      const item = quick[index];
      if (!item) return;
      navigate(item.to);
    }
    onClose();
  };

  return (
    <div
      className="palette-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label={t('search.title')}>
        <input
          className="palette__input"
          placeholder={t('search.placeholder')}
          value={query}
          autoFocus
          aria-label={t('search.placeholder')}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => (total === 0 ? 0 : (index + 1) % total));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (total === 0 ? 0 : (index - 1 + total) % total));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              go(active);
            }
          }}
        />

        <div className="palette__results">
          {query.trim().length > 1 && hits.length === 0 ? (
            <div className="palette__empty">{t('search.noResults')}</div>
          ) : null}

          {query.trim().length > 1 ? (
            hits.map((hit, index) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                type="button"
                className={`palette__item ${index === active ? 'is-active' : ''}`}
                onClick={() => go(index)}
                onMouseEnter={() => setActive(index)}
              >
                <span className="chip chip--sm mono">{KIND_ICON[hit.kind]}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="palette__item-title">{pickLocalized(hit.title, locale)}</span>
                  <span className="palette__item-meta">
                    {t(KIND_LABEL[hit.kind])}
                    {hit.kind === 'sign' ? ` · ${hit.id.replace('s_', '')}` : ''}
                  </span>
                </span>
                <span className="grow" />
                <ArrowRight size={14} className="faint" />
              </button>
            ))
          ) : (
            <>
              <div className="palette__group">{t('search.title')}</div>
              {quick.map((item, index) => (
                <button
                  key={item.to}
                  type="button"
                  className={`palette__item ${index === active ? 'is-active' : ''}`}
                  onClick={() => go(index)}
                  onMouseEnter={() => setActive(index)}
                >
                  <span className="chip chip--sm">
                    <Search size={12} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="palette__item-title">{item.label}</span>
                    {item.meta ? <span className="palette__item-meta">{item.meta}</span> : null}
                  </span>
                  <span className="grow" />
                  <ArrowRight size={14} className="faint" />
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}