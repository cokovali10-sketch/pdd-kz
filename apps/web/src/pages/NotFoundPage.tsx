import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="card center" style={{ padding: 56 }}>
      <p className="mono faint" style={{ fontSize: 'var(--step-3)', margin: 0 }}>
        404
      </p>
      <h1 style={{ marginTop: 8 }}>{t('notfound.title')}</h1>
      <p className="muted">{t('notfound.body')}</p>
      <Link to="/" className="btn btn--primary" style={{ justifySelf: 'center', marginTop: 8 }}>
        {t('notfound.home')}
      </Link>
    </div>
  );
}