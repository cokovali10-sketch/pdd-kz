import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadContent, peekContent } from '../lib/content';
import type { ContentBundle, Locale } from '../lib/types';
import { i18n, setLocale as setI18nLocale } from '../lib/i18n';

type Theme = 'dark' | 'light';

interface ContentState {
  bundle: ContentBundle | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const ContentContext = createContext<ContentState>({
  bundle: null,
  loading: true,
  error: null,
  reload: () => {},
});

export function ContentProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<ContentBundle | null>(() => peekContent());
  const [loading, setLoading] = useState(() => peekContent() === null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (bundle) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    loadContent()
      .then((next) => {
        if (cancelled) return;
        setBundle(next);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bundle, nonce]);

  const reload = useCallback(() => {
    setBundle(peekContent());
    setNonce((n) => n + 1);
  }, []);

  const value = useMemo(() => ({ bundle, loading, error, reload }), [bundle, loading, error, reload]);

  // Pages call `useBundle()`, which throws when the bundle is missing, so the
  // whole tree is gated here instead of rendering a broken page for a frame.
  if (!bundle) {
    if (error) {
      return (
        <div className="app">
          <div className="app__main" style={{ padding: 24 }}>
            <div className="app__content">
              <div className="card stack--sm" style={{ display: 'grid', gap: 12 }}>
                <h1 style={{ margin: 0 }}>{i18n.t('common.error')}</h1>
                <p className="muted" style={{ margin: 0 }}>
                  {error}
                </p>
                <div>
                  <button type="button" className="btn btn--primary" onClick={reload}>
                    {i18n.t('common.retryLater')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="app">
        <div className="app__main" style={{ padding: 24 }}>
          <div className="app__content">
            <div className="stack" role="status" aria-live="polite">
              <div className="skeleton" style={{ height: 120, borderRadius: 28 }} />
              <div className="skeleton" style={{ height: 48 }} />
              <div className="skeleton" style={{ height: 240 }} />
              <p className="muted center" style={{ margin: 0 }}>
                {i18n.t('common.loading')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentState {
  return useContext(ContentContext);
}

export function useBundle(): ContentBundle {
  const { bundle } = useContent();
  if (!bundle) throw new Error('content is not loaded yet');
  return bundle;
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('jb.theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (theme: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const apply = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.toggle('dark', next === 'dark');
    root.style.colorScheme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#06070b' : '#f4f5fb');
    try {
      localStorage.setItem('jb.theme', next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    apply(theme);
  }, [apply, theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
    },
    [],
  );

  const toggle = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle, setTheme };
}

export function useLocaleState(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem('jb.locale');
      if (stored === 'ru' || stored === 'kk' || stored === 'en') return stored;
    } catch {
      /* ignore */
    }
    return 'ru';
  });

  const setLocale = useCallback((next: Locale) => {
    setI18nLocale(next);
    setLocaleState(next);
  }, []);

  return { locale, setLocale };
}