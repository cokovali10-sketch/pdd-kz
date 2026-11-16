import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Download, KeyRound, LogOut, RefreshCw, Upload } from 'lucide-react';
import { AVATAR_COLORS, initials, localAuth, type LocalAccount } from '../lib/auth';
import { db, exportAll, importAll, resetAll } from '../lib/storage';
import { applySyncCode, copyText, createSyncCode } from '../lib/sync';
import { pickLocalized } from '../lib/utils';
import { useBundle } from '../app/providers';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const profile = useLiveQuery(() => db.profile.get('main'), [], undefined);
  const attempts = useLiveQuery(() => db.attempts.toArray(), [], []);

  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [syncCode, setSyncCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void localAuth.current().then((found) => {
      setAccount(found);
      if (found) {
        setName(found.name);
        setColor(found.avatarColor);
      }
    });
  }, []);

  const totals = useMemo(() => {
    const rows = attempts ?? [];
    return {
      answers: rows.reduce((sum, row) => sum + row.total, 0),
      correct: rows.reduce((sum, row) => sum + row.correct, 0),
      sessions: rows.length,
      passed: rows.filter((row) => row.passed).length,
    };
  }, [attempts]);

  const accuracy = totals.answers === 0 ? 0 : Math.round((totals.correct / totals.answers) * 100);

  const save = async () => {
    const next = await localAuth.create(name, color);
    setAccount(next);
    setMessage(t('profile.saved'));
  };

  const update = async () => {
    const next = await localAuth.update({ name, avatarColor: color });
    setAccount(next);
    setMessage(t('profile.saved'));
  };

  const signOut = async () => {
    await localAuth.remove();
    setAccount(null);
    setName('');
    setMessage(t('profile.signedOut'));
  };

  const makeCode = async () => {
    const code = await createSyncCode();
    setSyncCode(code);
    await copyText(code);
    setMessage(t('profile.codeCopied'));
  };

  const loadCode = async () => {
    try {
      const result = await applySyncCode(importCode);
      setMessage(t('profile.codeApplied', { attempts: result.attempts }));
      setImportCode('');
      setAccount(await localAuth.current());
    } catch {
      setMessage(t('profile.codeInvalid'));
    }
  };

  const downloadJson = async () => {
    const payload = await exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jolbilet-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const uploadJson = async (file: File) => {
    try {
      await importAll(JSON.parse(await file.text()));
      setMessage(t('profile.imported'));
      setAccount(await localAuth.current());
    } catch {
      setMessage(t('profile.importFailed'));
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <header className="page-head">
        <div>
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.subtitle')}</p>
        </div>
        <span className="chip chip--accent">{t('profile.localBadge')}</span>
      </header>

      {message ? (
        <div className="callout callout--success" role="status">
          <Check size={16} />
          <span>{message}</span>
        </div>
      ) : null}

      <section className="card">
        {account ? (
          <div className="stack">
            <div className="row" style={{ gap: 14 }}>
              <span className="avatar avatar--lg" style={{ background: `linear-gradient(140deg, ${account.avatarColor}, var(--accent-2))` }}>
                {initials(account.name)}
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0 }}>{account.name}</h3>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip chip--sm">{profile?.xp ?? 0} XP</span>
                  <span className="chip chip--sm">🔥 {profile?.streakDays ?? 0}</span>
                  <span className="chip chip--sm">{accuracy}%</span>
                </div>
              </div>
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => void signOut()}>
                <LogOut size={14} /> {t('profile.signOut')}
              </button>
            </div>

            <div className="grid grid--2" style={{ gap: 12, marginTop: 4 }}>
              <label className="field">
                <span className="field__label">{t('profile.name')}</span>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} maxLength={48} />
              </label>
              <div className="field">
                <span className="field__label">{t('profile.avatar')}</span>
                <div className="row" style={{ gap: 6 }}>
                  {AVATAR_COLORS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={option}
                      onClick={() => setColor(option)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        border: color === option ? '2px solid var(--fg)' : '2px solid transparent',
                        background: option,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button type="button" className="btn btn--primary" onClick={() => void update()}>
              {t('profile.save')}
            </button>
          </div>
        ) : (
          <div className="stack">
            <h3 style={{ margin: 0 }}>{t('profile.createTitle')}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {t('profile.createHint')}
            </p>
            <div className="grid grid--2" style={{ gap: 12 }}>
              <label className="field">
                <span className="field__label">{t('profile.name')}</span>
                <input
                  className="input"
                  placeholder="Aida"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={48}
                />
              </label>
              <div className="field">
                <span className="field__label">{t('profile.avatar')}</span>
                <div className="row" style={{ gap: 6 }}>
                  {AVATAR_COLORS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={option}
                      onClick={() => setColor(option)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        border: color === option ? '2px solid var(--fg)' : '2px solid transparent',
                        background: option,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={name.trim().length < 2}
              onClick={() => void save()}
            >
              {t('profile.create')}
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>{t('profile.transferTitle')}</h3>
        <p className="muted">{t('profile.transferHint')}</p>
        <div className="stack--sm" style={{ display: 'grid', gap: 10 }}>
          <button type="button" className="btn" onClick={() => void makeCode()}>
            <KeyRound size={16} /> {t('profile.makeCode')}
          </button>
          {syncCode ? (
            <textarea className="input mono" readOnly value={syncCode} rows={3} onFocus={(event) => event.target.select()} />
          ) : null}
          <label className="field">
            <span className="field__label">{t('profile.pasteCode')}</span>
            <textarea
              className="input mono"
              rows={3}
              placeholder="JB1:..."
              value={importCode}
              onChange={(event) => setImportCode(event.target.value)}
            />
          </label>
          <button type="button" className="btn" disabled={!importCode.trim()} onClick={() => void loadCode()}>
            <RefreshCw size={16} /> {t('profile.applyCode')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>{t('profile.backupTitle')}</h3>
        <div className="row">
          <button type="button" className="btn btn--sm" onClick={() => void downloadJson()}>
            <Download size={15} /> {t('profile.download')}
          </button>
          <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
            <Upload size={15} /> {t('profile.upload')}
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadJson(file);
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn--sm btn--danger"
            onClick={async () => {
              if (!window.confirm(t('progress.resetConfirm'))) return;
              await resetAll();
              setAccount(null);
              setMessage(t('profile.resetDone'));
            }}
          >
            {t('progress.reset')}
          </button>
        </div>
      </section>

      <section className="callout callout--info">
        <span>{t('profile.accountNote')}</span>
      </section>

      <section className="card">
        <h4>{t('profile.aboutTitle')}</h4>
        <p className="muted" style={{ marginBottom: 6 }}>
          {t('profile.aboutText')}
        </p>
        <div className="row" style={{ gap: 6 }}>
          <span className="chip chip--sm">{totals.sessions} {t('progress.sessions')}</span>
          <span className="chip chip--sm">{totals.answers} {t('progress.total').toLowerCase()}</span>
          <span className="chip chip--sm">{totals.passed} {t('common.pass').toLowerCase()}</span>
          <span className="chip chip--sm">{bundle.questions.length} {t('topics.questions')}</span>
        </div>
        <p className="faint" style={{ marginTop: 10, marginBottom: 0, fontSize: 'var(--step--2)' }}>
          {pickLocalized({ ru: 'Данные хранятся только в этом браузере.', kk: 'Деректер тек осы браузерде сақталады.', en: 'Data stays in this browser only.' }, locale)}
        </p>
      </section>
    </div>
  );
}