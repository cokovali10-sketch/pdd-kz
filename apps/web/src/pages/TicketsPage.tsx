import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight } from 'lucide-react';
import { useBundle } from '../app/providers';
import { buildSession, buildTickets } from '../lib/selection';
import { db } from '../lib/storage';
import { useExamSession } from '../store/useExamSession';

export function TicketsPage() {
  const { t } = useTranslation();
  const bundle = useBundle();
  const session = useExamSession();
  const navigate = useNavigate();
  const params = useParams();
  const srs = useLiveQuery(() => db.srs.toArray(), [], []);

  const tickets = useMemo(() => buildTickets(bundle.questions), [bundle.questions]);

  const accuracyFor = (questionIds: string[]): number => {
    const rows = (srs ?? []).filter((state) => questionIds.includes(state.questionId));
    if (rows.length === 0) return 0;
    return Math.round((rows.reduce((sum, row) => sum + row.accuracy, 0) / rows.length) * 100);
  };

  const start = (ticketId: string) => {
    session.start(buildSession({ mode: 'ticket', bundle, ticketId }));
    navigate('/exam/run');
  };

  const requested = params.ticketId;
  const startedRef = useRef<string | null>(null);

  // /tickets/:id starts the ticket immediately (deep links, "continue" links).
  useEffect(() => {
    if (!requested) return;
    if (!tickets.some((ticket) => ticket.id === requested)) return;
    if (startedRef.current === requested) return;
    startedRef.current = requested;
    session.start(buildSession({ mode: 'ticket', bundle, ticketId: requested }));
    navigate('/exam/run');
  }, [bundle, navigate, requested, session, tickets]);

  if (requested && !tickets.some((ticket) => ticket.id === requested)) {
    return (
      <div className="stack">
        <p className="muted">{t('tickets.title')}</p>
        <Link to="/tickets" className="btn btn--primary">
          {t('tickets.title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{t('tickets.title')}</h1>
          <p>{t('tickets.subtitle')}</p>
        </div>
        <span className="chip chip--accent">{tickets.length} × {tickets[0]?.questionIds.length ?? 0} {t('tickets.questions')}</span>
      </header>

      <div className="grid grid--3">
        {tickets.map((ticket) => {
          const accuracy = accuracyFor(ticket.questionIds);
          return (
            <div key={ticket.id} className="card stack--sm" style={{ display: 'grid', gap: 10 }}>
              <div className="row row--between">
                <h3 style={{ margin: 0 }}>№ {ticket.number}</h3>
                <span className="chip">{accuracy}% {t('topics.accuracy')}</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 'var(--step--1)' }}>
                {ticket.questionIds.length} {t('tickets.questions')} · {t('tickets.progress')}
              </p>
              <div className="progress">
                <div className="progress__fill" style={{ width: `${accuracy}%` }} />
              </div>
              <button type="button" className="btn btn--primary btn--block" onClick={() => start(ticket.id)}>
                {t('tickets.start')} <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="faint" style={{ fontSize: 'var(--step--1)' }}>
        {t('reference.sourceNote')}
      </p>
    </div>
  );
}