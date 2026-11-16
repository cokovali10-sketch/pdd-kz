import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Share2 } from 'lucide-react';
import type { ExamMode, Question } from '../../lib/types';
import type { SessionResult } from '../../lib/scoring';
import { formatDuration } from '../../lib/utils';
import { copyText } from '../../lib/sync';
import { QuestionView } from './QuestionView';

export interface ResultViewProps {
  mode: ExamMode;
  questions: Question[];
  answers: Record<string, string | null>;
  result: SessionResult;
  profileLabel: string;
  onRetryWrong: (failed: Question[]) => void;
  onRetryAll: () => void;
}

export function ResultView({ questions, answers, result, profileLabel, onRetryWrong, onRetryAll }: ResultViewProps) {
  const { t } = useTranslation();
  const [shared, setShared] = useState(false);

  const failed = useMemo(() => questions.filter((q) => result.failedQuestionIds.includes(q.id)), [questions, result.failedQuestionIds]);
  const percent = Math.round(result.accuracy * 100);

  const share = async () => {
    const text = `JolBilet · ${profileLabel}: ${percent}% (${result.correct}/${result.total}), ${formatDuration(result.durationMs)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'JolBilet', text });
      } else {
        await copyText(text);
      }
      setShared(true);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <div className="stack">
      <section className={`result-hero ${result.passed ? 'is-pass' : 'is-fail'}`}>
        <span className={result.passed ? 'chip chip--success' : 'chip chip--danger'}>
          {result.passed ? t('exam.result.passed') : t('exam.result.failed')}
        </span>
        <h1 style={{ margin: 0, fontSize: 'var(--step-3)' }}>{profileLabel}</h1>
        <div className="result-score">
          <span className="result-score__value">{percent}%</span>
          <span className="result-score__label">
            {result.correct} / {result.total} · {t('exam.result.errors')}: {result.errors}
          </span>
        </div>
        <div className="stat-grid" style={{ width: '100%' }}>
          <div className="stat">
            <span className="stat__label">{t('exam.result.errors')}</span>
            <span className="stat__value" style={{ color: result.errors > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {result.errors}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">{t('exam.result.time')}</span>
            <span className="stat__value mono">{formatDuration(result.durationMs)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">{t('exam.answeredCount')}</span>
            <span className="stat__value">
              {result.total - result.skipped} / {result.total}
            </span>
          </div>
        </div>
        {result.timedOut ? (
          <div className="callout callout--warn">{t('exam.timeUp')}</div>
        ) : null}
        <div className="row">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void share()}>
            <Share2 size={15} /> {shared ? t('profile.saved') : t('exam.result.share')}
          </button>
          {failed.length > 0 ? (
            <button type="button" className="btn btn--primary" onClick={() => onRetryWrong(failed)}>
              <RotateCcw size={16} /> {t('exam.result.retryWrong')} ({failed.length})
            </button>
          ) : null}
          <button type="button" className="btn" onClick={onRetryAll}>
            {t('common.retry')}
          </button>
          <Link className="btn btn--ghost" to="/">
            {t('exam.result.backHome')} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <h2>{t('exam.result.review')}</h2>
      <div className="stack">
        {questions.map((question, index) => (
          <div key={question.id} className="card">
            <QuestionView
              question={question}
              index={index}
              total={questions.length}
              selected={answers[question.id] ?? null}
              revealed
              showExplanation
              onSelect={() => undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}