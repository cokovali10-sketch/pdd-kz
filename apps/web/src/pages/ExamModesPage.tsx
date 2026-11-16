import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Infinity as InfinityIcon,
  Layers,
  RotateCcw,
  Signpost,
  Sparkles,
  Ticket as TicketIcon,
  Timer,
  Zap,
} from 'lucide-react';
import { useBundle } from '../app/providers';
import { useExamSession } from '../store/useExamSession';
import { buildSession, type SessionOptions } from '../lib/selection';
import { db } from '../lib/storage';
import { pickWeak } from '../lib/srs';
import type { ExamMode } from '../lib/types';

const MODES: { mode: ExamMode; key: string; icon: typeof GraduationCap }[] = [
  { mode: 'exam', key: 'exam.mode.exam', icon: GraduationCap },
  { mode: 'training', key: 'exam.mode.training', icon: BookOpenCheck },
  { mode: 'blitz', key: 'exam.mode.blitz', icon: Timer },
  { mode: 'weak', key: 'exam.mode.weak', icon: AlertTriangle },
  { mode: 'mistakes', key: 'exam.mode.mistakes', icon: RotateCcw },
  { mode: 'daily', key: 'exam.mode.daily', icon: CalendarDays },
  { mode: 'signs', key: 'exam.mode.signs', icon: Signpost },
  { mode: 'situations', key: 'exam.mode.situations', icon: Layers },
  { mode: 'marathon', key: 'exam.mode.marathon', icon: InfinityIcon },
];

export function ExamModesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const bundle = useBundle();
  const session = useExamSession();
  const srs = useLiveQuery(() => db.srs.toArray(), [], []);

  const start = (mode: ExamMode) => {
    const weakIds = (srs ?? []).filter(pickWeak).map((state) => state.questionId);
    const options: SessionOptions = { mode, bundle, weakQuestionIds: weakIds };
    session.start(buildSession(options));
    navigate('/exam/run');
  };

  return (
    <div className="stack" style={{ gap: 22 }}>
      <header className="page-head">
        <div>
          <h1>{t('exam.modes')}</h1>
          <p>{t('home.heroSubtitle')}</p>
        </div>
        <span className="chip chip--accent">
          <Sparkles size={13} /> {t('home.free')}
        </span>
      </header>

      <div className="grid grid--3">
        {MODES.map(({ mode, key, icon: Icon }) => (
          <button key={mode} type="button" className="mode-card" onClick={() => start(mode)}>
            <span className="mode-card__icon">
              <Icon size={20} />
            </span>
            <span className="mode-card__title">{t(key)}</span>
            <span className="mode-card__text">{t(`${key}Desc`)}</span>
            <span className="mode-card__meta">
              <span className="chip chip--sm">
                <Zap size={11} /> {bundle.questions.length} {t('topics.questions')}
              </span>
            </span>
          </button>
        ))}

        <Link to="/tickets" className="mode-card">
          <span className="mode-card__icon">
            <TicketIcon size={20} />
          </span>
          <span className="mode-card__title">{t('exam.mode.tickets')}</span>
          <span className="mode-card__text">{t('exam.mode.ticketsDesc')}</span>
          <span className="mode-card__meta">
            <span className="chip chip--accent chip--sm">{t('tickets.start')}</span>
          </span>
        </Link>
      </div>

      <div className="callout callout--info">
        <span>{t('exam.hint')}</span>
      </div>
    </div>
  );
}