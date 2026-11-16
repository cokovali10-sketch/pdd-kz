import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flag, Pause, Play, Timer } from 'lucide-react';
import { useExamSession } from '../../store/useExamSession';
import { QuestionView } from './QuestionView';
import { ResultView } from './ResultView';
import type { ExamMode, Question } from '../../lib/types';
import type { SessionPlan } from '../../lib/selection';
import { formatDuration } from '../../lib/utils';

const BLITZ_SECONDS = 15;

export function ExamRunner() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const session = useExamSession();
  const { plan, index, answers, status, result } = session;

  const [tick, setTick] = useState(0);
  const [blitzLeft, setBlitzLeft] = useState(BLITZ_SECONDS);
  const questionStartRef = useRef<number>(Date.now());
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'running') return;
    const id = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(id);
  }, [status]);

  const elapsed = useMemo(() => {
    void tick;
    if (status === 'running' && session.resumedAt) return session.accumulatedMs + (Date.now() - session.resumedAt);
    return session.accumulatedMs;
  }, [tick, session.accumulatedMs, session.resumedAt, status]);

  const totalMs = plan && plan.profile.minutes > 0 ? plan.profile.minutes * 60_000 : 0;
  const leftMs = totalMs > 0 ? Math.max(0, totalMs - elapsed) : 0;

  const finish = useCallback(
    (timedOut = false) => {
      void session.finish(timedOut);
    },
    [session],
  );

  useEffect(() => {
    if (plan && status === 'running' && totalMs > 0 && leftMs <= 0) finish(true);
  }, [finish, leftMs, plan, status, totalMs]);

  useEffect(() => {
    questionStartRef.current = Date.now();
    setBlitzLeft(BLITZ_SECONDS);
  }, [index, plan]);

  // Pausing must freeze the per-question blitz countdown as well.
  useEffect(() => {
    if (status === 'paused') {
      if (pauseStartRef.current === null) pauseStartRef.current = Date.now();
      return;
    }
    if (status === 'running' && pauseStartRef.current !== null) {
      questionStartRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  }, [status]);

  // Hidden tab = the candidate is not looking: pause the exam instead of
  // silently burning the timer (blitz keeps its per-question rhythm).
  useEffect(() => {
    if (plan?.mode !== 'exam') return;
    const onVisibility = () => {
      const store = useExamSession.getState();
      if (document.visibilityState === 'hidden' && store.status === 'running') store.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [plan?.mode]);

  const current: Question | undefined = plan?.questions[index];

  const advanceOnBlitzTimeout = useCallback(() => {
    if (!plan || plan.mode !== 'blitz' || status !== 'running') return;
    if (index + 1 >= plan.questions.length) {
      finish(false);
      return;
    }
    session.next();
  }, [finish, index, plan, session, status]);

  useEffect(() => {
    if (plan?.mode !== 'blitz' || status !== 'running') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, BLITZ_SECONDS - Math.floor((Date.now() - questionStartRef.current) / 1000));
      setBlitzLeft(left);
      if (left === 0) advanceOnBlitzTimeout();
    }, 250);
    return () => window.clearInterval(id);
  }, [advanceOnBlitzTimeout, index, plan?.mode, status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!plan || status !== 'running' || !current) return;
      if (event.key >= '1' && event.key <= '4') {
        const option = current.options[Number(event.key) - 1];
        if (option) {
          event.preventDefault();
          session.answer(current.id, option.id);
        }
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (index + 1 >= plan.questions.length) finish(false);
        else session.next();
      }
      if (event.key === 'ArrowLeft') session.prev();
      if (event.key === 'ArrowRight') {
        if (index + 1 >= plan.questions.length) finish(false);
        else session.next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, finish, index, plan, session, status]);

  if (!plan) {
    return (
      <div className="stack">
        <p className="muted">{t('exam.modes')}</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/exam')}>
          {t('exam.modes')}
        </button>
      </div>
    );
  }

  if (plan.questions.length === 0) {
    return (
      <div className="stack">
        <div className="card center" style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{t('exam.noQuestions')}</h2>
          {plan.mode === 'mistakes' ? <p className="muted" style={{ margin: 0 }}>{t('exam.noMistakes')}</p> : null}
          <Link to="/exam" className="btn btn--primary">
            {t('exam.modes')}
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'finished' && result) {
    const profileLabel = i18n.language.startsWith('kk') ? plan.profile.name.kk : i18n.language.startsWith('en') ? plan.profile.name.en : plan.profile.name.ru;
    const restart = (questions: Question[], mode: ExamMode = plan.mode) => {
      const nextPlan: SessionPlan = {
        ...plan,
        mode,
        profile: plan.profile,
        questions,
      };
      session.start(nextPlan);
    };
    return (
      <ResultView
        mode={plan.mode}
        questions={plan.questions}
        answers={answers}
        result={result}
        profileLabel={profileLabel}
        onRetryWrong={(failed) => restart(failed, 'weak')}
        onRetryAll={() => restart(plan.questions, 'training')}
      />
    );
  }

  const answeredCount = Object.values(answers).filter((value) => value !== null).length;
  const progress = plan.questions.length === 0 ? 0 : ((index + 1) / plan.questions.length) * 100;

  return (
    <div className="stack exam-shell">
      <div className="exam-bar">
        <span className="chip chip--accent">{plan.profile.name[i18n.language.startsWith('kk') ? 'kk' : i18n.language.startsWith('en') ? 'en' : 'ru']}</span>
        {totalMs > 0 ? (
          <span className={`timer ${leftMs < 60_000 ? 'is-danger' : leftMs < 300_000 ? 'is-warning' : ''}`}>
            <Timer size={15} /> {formatDuration(leftMs)}
          </span>
        ) : (
          <span className="timer">
            <Timer size={15} /> {formatDuration(elapsed)}
          </span>
        )}
        {plan.mode === 'blitz' ? (
          <span className={`timer ${blitzLeft <= 5 ? 'is-danger' : 'is-warning'}`}>{blitzLeft}s</span>
        ) : null}
        <span className="chip">
          {t('exam.answeredCount')}: {answeredCount}/{plan.questions.length}
        </span>
        <div className="grow" />
        <button
          type="button"
          className="icon-btn"
          onClick={() => (status === 'paused' ? session.resume() : session.pause())}
          aria-label={status === 'paused' ? t('exam.resume') : t('exam.pause')}
          title={status === 'paused' ? t('exam.resume') : t('exam.pause')}
        >
          {status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button type="button" className="btn btn--sm btn--danger" onClick={() => finish(false)}>
          <Flag size={15} /> {t('common.finish')}
        </button>
      </div>

      <div className="progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress__fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card">
        {current ? (
          <QuestionView
            question={current}
            index={index}
            total={plan.questions.length}
            selected={answers[current.id] ?? null}
            revealed={Boolean(session.revealed[current.id]) || plan.mode === 'blitz'}
            onSelect={(optionId) => session.answer(current.id, optionId)}
          />
        ) : null}
      </div>

      <div className="row row--between exam-nav">
        <button type="button" className="btn btn--ghost" onClick={() => session.prev()} disabled={index === 0}>
          <ChevronLeft size={16} /> {t('common.back')}
        </button>
        <div className="row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => (status === 'paused' ? session.resume() : session.pause())}
          >
            {status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
            {status === 'paused' ? t('exam.resume') : t('exam.pause')}
          </button>
          {index + 1 >= plan.questions.length ? (
            <button type="button" className="btn btn--primary" onClick={() => finish(false)}>
              {t('common.finish')} <Flag size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => session.next()}>
              {t('exam.next')} <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 650 }}>{t('exam.grid')}</summary>
        <div className="grid-questions" style={{ marginTop: 14 }}>
          {plan.questions.map((question, questionIndex) => {
            const answer = answers[question.id];
            const revealed = Boolean(session.revealed[question.id]);
            const isCorrect = answer && answer === question.correctOptionId;
            const cls = !answer ? '' : !revealed ? 'is-current' : isCorrect ? 'is-correct' : 'is-wrong';
            return (
              <button
                key={question.id}
                type="button"
                className={`q-dot ${cls} ${questionIndex === index ? 'is-current' : ''}`.trim()}
                onClick={() => session.goTo(questionIndex)}
                title={`${questionIndex + 1}`}
              >
                {questionIndex + 1}
              </button>
            );
          })}
        </div>
        <p className="faint" style={{ marginTop: 12, fontSize: 'var(--step--1)' }}>
          {t('exam.hint')}
        </p>
      </details>

      {status === 'paused' ? (
        <div className="callout callout--info">
          <span>{t('exam.paused')}</span>
          <div className="grow" />
          <button type="button" className="btn btn--sm btn--primary" onClick={() => session.resume()}>
            <Play size={15} /> {t('exam.resume')}
          </button>
        </div>
      ) : null}

      <div className="exam-actions">
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={() => session.prev()}
          disabled={index === 0}
          aria-label={t('common.back')}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => (index + 1 >= plan.questions.length ? finish(false) : session.next())}
        >
          {index + 1 >= plan.questions.length ? (
            <>
              {t('common.finish')} <Flag size={16} />
            </>
          ) : (
            <>
              {t('exam.next')} <ChevronRight size={16} />
            </>
          )}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => (status === 'paused' ? session.resume() : session.pause())}
          aria-label={status === 'paused' ? t('exam.resume') : t('exam.pause')}
        >
          {status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
        </button>
      </div>
    </div>
  );
}