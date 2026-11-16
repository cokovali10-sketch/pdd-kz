import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  Layers,
  Moon,
  PaintBucket,
  Search,
  Signpost,
  Star,
  Sun,
  Ticket,
  Trophy,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocaleState, useTheme } from '../../app/providers';
import { CommandPalette } from '../ui/CommandPalette';
import { LOCALES, type Locale } from '../../lib/types';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  key: string;
  icon: typeof Home;
  end?: boolean;
}

const NAV_GROUPS: { key: string; items: NavItem[] }[] = [
  {
    key: 'nav.group.main',
    items: [
      { to: '/', key: 'nav.home', icon: Home, end: true },
      { to: '/exam', key: 'nav.exam', icon: GraduationCap },
      { to: '/tickets', key: 'nav.tickets', icon: Ticket },
      { to: '/topics', key: 'nav.topics', icon: Layers },
      { to: '/signs', key: 'nav.signs', icon: Signpost },
      { to: '/markings', key: 'nav.markings', icon: PaintBucket },
    ],
  },
  {
    key: 'nav.group.learn',
    items: [
      { to: '/reference', key: 'nav.reference', icon: BookOpen },
      { to: '/fines', key: 'nav.fines', icon: BarChart3 },
    ],
  },
  {
    key: 'nav.group.you',
    items: [
      { to: '/progress', key: 'nav.progress', icon: Star },
      { to: '/top', key: 'nav.top', icon: Trophy },
      { to: '/favorites', key: 'nav.favorites', icon: Star },
      { to: '/profile', key: 'nav.profile', icon: User },
    ],
  },
];

const MOBILE_NAV: NavItem[] = [
  { to: '/', key: 'nav.home', icon: Home, end: true },
  { to: '/exam', key: 'nav.exam', icon: GraduationCap },
  { to: '/signs', key: 'nav.signs', icon: Signpost },
  { to: '/top', key: 'nav.top', icon: Trophy },
  { to: '/profile', key: 'nav.profile', icon: User },
];

function Brand() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="brand">
      <span className="brand__mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 3 3.5 20h17L12 3Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 9.5v4.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.9" r="1.05" fill="#fff" />
        </svg>
      </span>
      <span>
        <span className="brand__name">{t('app.name')}</span>
        <span className="brand__tag">{t('app.tagline')}</span>
      </span>
    </Link>
  );
}

function LangSwitch() {
  const { locale, setLocale } = useLocaleState();
  return (
    <div className="segmented" role="group" aria-label="Language">
      {LOCALES.map((code: Locale) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      title={theme === 'dark' ? t('common.light') : t('common.dark')}
      aria-label={theme === 'dark' ? t('common.light') : t('common.dark')}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function usePageTitle(): string {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  if (pathname === '/') return t('nav.home');
  if (pathname.startsWith('/exam')) return t('nav.exam');
  if (pathname.startsWith('/tickets')) return t('nav.tickets');
  if (pathname.startsWith('/topics')) return t('nav.topics');
  if (pathname.startsWith('/signs')) return t('nav.signs');
  if (pathname.startsWith('/markings')) return t('nav.markings');
  if (pathname.startsWith('/reference')) return t('nav.reference');
  if (pathname.startsWith('/fines')) return t('nav.fines');
  if (pathname.startsWith('/progress')) return t('nav.progress');
  if (pathname.startsWith('/top')) return t('nav.top');
  if (pathname.startsWith('/favorites')) return t('nav.favorites');
  if (pathname.startsWith('/profile')) return t('nav.profile');
  if (pathname.startsWith('/search')) return t('nav.search');
  return t('app.name');
}

function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="sidebar" aria-label={t('nav.home')}>
      <Brand />
      <nav className="nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.key} style={{ display: 'contents' }}>
            <div className="nav__group">{t(group.key)}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className="nav__link" title={t(item.key)}>
                  <span className="nav__icon">
                    <Icon size={18} />
                  </span>
                  <span className="nav__label">{t(item.key)}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar__footer">
        <LangSwitch />
        <div className="sidebar__hint">
          <span>{t('home.free')}</span>
          <span className="faint">·</span>
          <span>{t('home.noSignup')}</span>
        </div>
      </div>
    </aside>
  );
}

function MobileNav() {
  const { t } = useTranslation();
  return (
    <nav className="mobile-nav" aria-label="Main">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.to} to={item.to} end={item.end} className="mobile-nav__item">
            <Icon size={21} />
            <span>{t(item.key)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <p style={{ margin: 0 }}>{t('footer.disclaimer')}</p>
      <p style={{ margin: 0 }}>{t('footer.contentNote')}</p>
      <p style={{ margin: 0 }} className="faint">
        {t('app.name')} · {t('footer.built')}
      </p>
    </footer>
  );
}

export function AppShell({ scrolled }: { scrolled: boolean }) {
  const { t } = useTranslation();
  const title = usePageTitle();
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t('a11y.skipToContent')}
      </a>
      <Sidebar />
      <div className="app__main">
        <header className={cn('topbar', scrolled && 'topbar--scrolled')}>
          <div className="topbar__brand">
            <span className="brand__mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 3.5 20h17L12 3Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="16.4" r="1.1" fill="#fff" />
              </svg>
            </span>
            <span>{t('app.name')}</span>
          </div>
          <div className="topbar__title">{title}</div>
          <div className="topbar__spacer" />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPaletteOpen(true)}
            aria-label={t('nav.search')}
            title={`${t('nav.search')} (Ctrl+K)`}
          >
            <Search size={18} />
          </button>
          <ThemeToggle />
          <Link to="/profile" className="icon-btn" aria-label={t('nav.profile')} title={t('nav.profile')}>
            <User size={18} />
          </Link>
        </header>
        <main id="main" className="app__content">
          <Outlet />
          <Footer />
        </main>
      </div>
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}