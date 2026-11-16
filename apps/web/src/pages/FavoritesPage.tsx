import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';
import { useBundle } from '../app/providers';
import { addNote, db, deleteNote, toggleFavorite } from '../lib/storage';
import { pickLocalized } from '../lib/utils';
import { EmptyState } from '../components/ui/StateViews';
import { QuestionView } from '../components/exam/QuestionView';

export function FavoritesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const favorites = useLiveQuery(() => db.favorites.orderBy('at').reverse().toArray(), [], []);
  const notes = useLiveQuery(() => db.notes.orderBy('at').reverse().toArray(), [], []);
  const [noteText, setNoteText] = useState('');
  const [noteQuestion, setNoteQuestion] = useState('');

  const questions = (favorites ?? [])
    .map((row) => bundle.questions.find((q) => q.id === row.questionId))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  const submitNote = async () => {
    if (!noteQuestion || noteText.trim().length === 0) return;
    await addNote(noteQuestion, noteText.trim());
    setNoteText('');
  };

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('favorites.title')}</h1>
          <p>{t('favorites.subtitle')}</p>
        </div>
        <div className="row">
          <span className="chip chip--accent">{questions.length} {t('favorites.questions')}</span>
          <span className="chip">{notes?.length ?? 0} {t('favorites.notes')}</span>
        </div>
      </header>

      {questions.length === 0 ? (
        <EmptyState title={t('favorites.questions')} action={<Link to="/exam" className="btn btn--primary">{t('home.startExam')}</Link>}>
          {t('favorites.empty')}
        </EmptyState>
      ) : (
        <div className="stack">
          {questions.map((question) => (
            <article key={question.id} className="card">
              <div className="row row--between" style={{ marginBottom: 12 }}>
                <span className="chip mono">{question.id}</span>
                <div className="row">
                  <Link to={`/exam/preview/${question.id}`} className="btn btn--sm">
                    {t('common.readMore')}
                  </Link>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => void toggleFavorite(question.id)}
                  >
                    <Trash2 size={14} /> {t('favorites.remove')}
                  </button>
                </div>
              </div>
              <QuestionView
                question={question}
                index={0}
                total={1}
                selected={null}
                revealed={false}
                readOnly
                onSelect={() => undefined}
              />
            </article>
          ))}
        </div>
      )}

      <section className="card stack--sm" style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0 }}>{t('favorites.notes')}</h3>
        <div className="grid grid--2">
          <label className="field">
            <span className="faint">{t('favorites.questions')}</span>
            <select className="input" value={noteQuestion} onChange={(event) => setNoteQuestion(event.target.value)}>
              <option value="">—</option>
              {bundle.questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.id} · {pickLocalized(question.text, locale).slice(0, 48)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="faint">{t('favorites.notes')}</span>
            <textarea
              className="input"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="…"
            />
          </label>
        </div>
        <div>
          <button type="button" className="btn btn--primary" onClick={() => void submitNote()} disabled={!noteQuestion || !noteText.trim()}>
            <Star size={15} /> {t('favorites.notes')}
          </button>
        </div>

        {(notes ?? []).length > 0 ? (
          <ul className="pill-list" style={{ marginTop: 8 }}>
            {notes?.map((note) => (
              <li key={note.id} className="chip" style={{ whiteSpace: 'normal', alignItems: 'flex-start' }}>
                <span>
                  <span className="mono faint">{note.questionId}</span>
                  <br /> {note.text}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 26, height: 26 }}
                  onClick={() => {
                    if (note.id) void deleteNote(note.id);
                  }}
                  aria-label={t('favorites.remove')}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}