import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBundle } from '../app/providers';
import { db, exportAll, importAll, resetAll, type ExportPayload } from '../lib/storage';
import { byWeakness, pickWeak } from '../lib/srs';
import { formatDate, formatDuration, pickLocalized } from '../lib/utils';

const DAYS = 84;

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ProgressPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const attempts = useLiveQuery(() => db.attempts.orderBy('at').reverse().limit(100).toArray(), [], []);
  const srs = useLiveQuery(() => db.srs.toArray(), [], []);
  const profile = useLiveQuery(() => db.profile.get('main'), [], undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    const rows = attempts ?? [];
    const answered = rows.reduce((sum, row) => sum + row.total, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    return {
      answered,
      correct,
      accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
      sessions: rows.length,
      time: rows.reduce((sum, row) => sum + row.durationMs, 0),
    };
  }, [attempts]);

  const heatmap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of attempts ?? []) {
      counts.set(dayKey(row.at), (counts.get(dayKey(row.at)) ?? 0) + 1);
    }
    const cells: { key: string; level: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = DAYS - 1; i >= 0; i -= 1) {
      const ts = today.getTime() - i * 86_400_000;
      const key = dayKey(ts);
      const count = counts.get(key) ?? 0;
      const level = count === 0 ? 0 : count < 3 ? 1 : count < 8 ? 2 : count < 15 ? 3 : 4;
      cells.push({ key, level });
    }
    return cells;
  }, [attempts]);

  const topicStats = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const row of attempts ?? []) {
      for (const answer of row.answers) {
        const question = bundle.questions.find((q) => q.id === answer.questionId);
        for (const topicId of question?.topicIds ?? []) {
          const entry = map.get(topicId) ?? { total: 0, correct: 0 };
          entry.total += 1;
          if (answer.correct) entry.correct += 1;
          map.set(topicId, entry);
        }
      }
    }
    return [...map.entries()]
      .map(([id, value]) => ({
        topic: bundle.topics.find((item) => item.id === id),
        ...value,
        accuracy: value.total === 0 ? 0 : Math.round((value.correct / value.total) * 100),
      }))
      .filter((entry) => entry.topic)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8);
  }, [attempts, bundle.questions, bundle.topics]);

  const weak = useMemo(
    () =>
      (srs ?? [])
        .filter(pickWeak)
        .sort(byWeakness)
        .slice(0, 5)
        .map((state) => ({ state, question: bundle.questions.find((q) => q.id === state.questionId) }))
        .filter((entry) => entry.question),
    [bundle.questions, srs],
  );

  const onExport = async () => {
    const payload = await exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jolbilet-progress-${dayKey(Date.now())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    try {
      const payload = JSON.parse(await file.text()) as ExportPayload;
      await importAll(payload);
      window.location.reload();
    } catch (error) {
      console.error(error);
      window.alert(t('common.error'));
    }
  };

  const onReset = async () => {
    if (!window.confirm(t('progress.resetConfirm'))) return;
    await resetAll();
    window.location.reload();
  };

  const hasData = (attempts?.length ?? 0) > 0 || (srs?.length ?? 0) > 0;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('progress.title')}</h1>
          <p>{t('progress.subtitle')}</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn--sm" onClick={() => void onExport()}>
            <Download size={15} /> {t('progress.export')}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> {t('progress.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
            }}
          />
          <button type="button" className="btn btn--sm btn--danger" onClick={() => void onReset()}>
            <Trash2 size={15} /> {t('common.reset')}
          </button>
        </div>
      </header>

      {!hasData ? (
        <div className="card center">
          <p className="muted">{t('progress.empty')}</p>
          <Link to="/exam" className="btn btn--primary">
            {t('home.startExam')}
          </Link>
        </div>
      ) : null}

      <section className="stat-grid">
        <div className="stat">
          <span className="stat__label">{t('progress.total')}</span>
          <span className="stat__value">{totals.answered}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('progress.accuracy')}</span>
          <span className="stat__value" style={{ color: totals.accuracy >= 70 ? 'var(--success)' : 'var(--warning)' }}>
            {totals.accuracy}%
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('progress.sessions')}</span>
          <span className="stat__value">{totals.sessions}</span>
        </div>
        <div className="stat">
          <span className="stat__label">XP</span>
          <span className="stat__value">{profile?.xp ?? 0}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('home.streak')}</span>
          <span className="stat__value">{profile?.streakDays ?? 0} 🔥</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('exam.result.time')}</span>
          <span className="stat__value mono">{formatDuration(totals.time)}</span>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>{t('progress.activity')}</h3>
        <div className="heatmap" aria-label={t('progress.activity')}>
          {heatmap.map((cell) => (
            <span key={cell.key} className="heatmap__cell" data-level={cell.level} title={`${cell.key}: ${cell.level}`} />
          ))}
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>{t('progress.byTopic')}</h3>
        <div className="stack--sm" style={{ display: 'grid', gap: 12 }}>
          {topicStats.map((entry) => (
            <div key={entry.topic?.id ?? 'x'} className="stack--sm" style={{ display: 'grid', gap: 6 }}>
              <div className="row row--between">
                <span>{entry.topic ? pickLocalized(entry.topic.title, locale) : ''}</span>
                <span className="mono muted">
                  {entry.accuracy}% · {entry.correct}/{entry.total}
                </span>
              </div>
              <div className="progress">
                <div className={`progress__fill ${entry.accuracy >= 70 ? 'is-success' : 'is-danger'}`} style={{ width: `${entry.accuracy}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {weak.length > 0 ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>{t('progress.weak')}</h3>
          <ul className="pill-list">
            {weak.map((entry) => (
              <li key={entry.state.questionId}>
                <Link className="chip" to={`/exam/preview/${entry.state.questionId}`}>
                  {entry.question ? pickLocalized(entry.question.text, locale).slice(0, 60) : entry.state.questionId}
                  {entry.question && pickLocalized(entry.question.text, locale).length > 60 ? '…' : ''}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2>{t('progress.history')}</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('common.theme')}</th>
                <th>{t('common.correct')}</th>
                <th>{t('progress.accuracy')}</th>
                <th>{t('exam.result.time')}</th>
                <th>{t('common.pass')}</th>
              </tr>
            </thead>
            <tbody>
              {(attempts ?? []).map((row) => (
                <tr key={row.id}>
                  <td data-label={t('common.theme')}>{formatDate(row.at, locale)}</td>
                  <td className="mono" data-label={t('common.correct')}>
                    {row.correct}/{row.total}
                  </td>
                  <td className="mono" data-label={t('progress.accuracy')}>
                    {Math.round(row.accuracy * 100)}%
                  </td>
                  <td className="mono" data-label={t('exam.result.time')}>
                    {formatDuration(row.durationMs)}
                  </td>
                  <td data-label={t('common.pass')}>
                    <span className={row.passed ? 'chip chip--success' : 'chip chip--danger'}>
                      {row.passed ? t('common.pass') : t('common.fail')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}