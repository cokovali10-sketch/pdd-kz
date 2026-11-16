import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Check, Info, X } from 'lucide-react';
import type { Question } from '../../lib/types';
import { pickLocalized } from '../../lib/utils';
import { useBundle } from '../../app/providers';
import { DiagramView } from '../diagram/DiagramView';
import { SignImage } from '../signs/SignImage';
import { ReportButton } from './ReportButton';

const KEYS = ['1', '2', '3', '4'];

export function PddRefLinks({ refs }: { refs: Question['pdDRefs'] }) {
  const bundle = useBundle();
  return (
    <div className="tag-list">
      {refs.map((ref, index) => {
        const chapter = bundle.chapters.find((c) => c.id === ref.chapter);
        const label = ref.point ? `п. ${ref.point}` : `гл. ${ref.chapter}`;
        const title = chapter ? `${pickLocalized(chapter.title, 'ru')}` : '';
        return (
          <Link
            key={`${ref.chapter}-${ref.point ?? 'x'}-${index}`}
            to={ref.point ? `/reference/${ref.chapter}#p-${ref.point}` : `/reference/${ref.chapter}`}
            className="chip chip--accent"
            title={title}
          >
            <Info size={13} /> {label}
          </Link>
        );
      })}
    </div>
  );
}

export interface QuestionViewProps {
  question: Question;
  index: number;
  total: number;
  selected: string | null;
  revealed: boolean;
  onSelect: (optionId: string) => void;
  showExplanation?: boolean;
  /** Renders options as static rows (used on the saved-questions screen). */
  readOnly?: boolean;
}

export function QuestionView({
  question,
  index,
  total,
  selected,
  revealed,
  onSelect,
  showExplanation,
  readOnly = false,
}: QuestionViewProps) {
  const { t, i18n } = useTranslation();
  const bundle = useBundle();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const signs = (question.signIds ?? [])
    .map((id) => bundle.signs.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const isAnswered = selected !== null;
  const correct = isAnswered && selected === question.correctOptionId;

  return (
    <div className="question">
      <div className="question__head">
        <span className="chip">
          {t('exam.questionOf')} {index + 1} / {total}
        </span>
        <div className="row">
          {question.diagram ? <span className="chip chip--accent">{t('nav.exam')}</span> : null}
          <span className="chip">{`★`.repeat(Math.max(1, Math.min(3, question.difficulty)))}</span>
        </div>
      </div>

      <h2 className="question__text">{pickLocalized(question.text, locale)}</h2>

      {question.diagram ? (
        <div className="question__media">
          <DiagramView
            spec={question.diagram}
            signFile={(code) => bundle.signs.find((s) => s.code === code)?.file}
          />
        </div>
      ) : null}

      {signs.length > 0 ? (
        <div className="question__media">
          {signs.map((sign) => (
            <div key={sign.id} className="stack--sm" style={{ justifyItems: 'center', display: 'grid' }}>
              <SignImage sign={sign} size={96} />
              <span className="faint mono" style={{ fontSize: '0.72rem' }}>
                {sign.code}
              </span>
            </div>
          ))}
        </div>
      ) : null}

<div
      className="options"
      role={readOnly ? undefined : 'radiogroup'}
      aria-label={readOnly ? undefined : t('exam.optionsLabel')}
    >
      {question.options.map((option, optionIndex) => {
        const isSelected = selected === option.id;
        const isCorrectOption = option.id === question.correctOptionId;
        const stateClass = !revealed && !isAnswered
          ? ''
          : isCorrectOption
            ? 'is-correct'
            : isSelected
              ? 'is-wrong'
              : 'is-dim';

        const key = <span className="option__key">{KEYS[optionIndex] ?? option.id.toUpperCase()}</span>;
        const body = <span className="option__body">{pickLocalized(option.text, locale)}</span>;
        const mark = (
          <span className="option__mark">
            {revealed && isCorrectOption ? <Check size={18} color="var(--success)" /> : null}
            {revealed && isSelected && !isCorrectOption ? <X size={18} color="var(--danger)" /> : null}
          </span>
        );

        if (readOnly) {
          return (
            <div key={option.id} className={`option ${stateClass}`.trim()}>
              {key}
              {body}
              {mark}
            </div>
          );
        }

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`option ${isSelected ? 'is-selected' : ''} ${stateClass}`.trim()}
            onClick={() => onSelect(option.id)}
            disabled={revealed}
          >
            {key}
            {body}
            {mark}
          </button>
        );
      })}
    </div>

      {showExplanation && revealed ? (
        <div
          className="callout"
          style={{ display: 'grid', gap: 10, background: correct ? 'var(--success-soft)' : 'var(--danger-soft)' }}
        >
          <div className="row" style={{ gap: 8, fontWeight: 650 }}>
            {correct ? <Check size={16} color="var(--success)" /> : <X size={16} color="var(--danger)" />}
            {correct ? t('common.correct') : t('common.wrong')}
          </div>
          <div>{pickLocalized(question.explanation, locale)}</div>
          <PddRefLinks refs={question.pdDRefs} />
          {signs.length > 0 ? (
            <div className="row">
              <span className="faint" style={{ fontSize: '0.78rem' }}>
                {t('common.relatedSigns')}:
              </span>
              {signs.map((sign) => (
                <Link key={sign.id} to={`/signs/${sign.code}`} className="chip chip--accent">
                  {sign.code} · {pickLocalized(sign.title, locale)}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!readOnly ? (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <ReportButton questionId={question.id} />
        </div>
      ) : null}
    </div>
  );
}