import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useBundle } from '../app/providers';
import { QuestionView } from '../components/exam/QuestionView';
import { EmptyState } from '../components/ui/StateViews';
import { pickLocalized } from '../lib/utils';

export function QuestionPreviewPage() {
  const { questionId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const bundle = useBundle();
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const question = bundle.questions.find((item) => item.id === questionId);

  if (!question) {
    return <EmptyState title={t('notfound.title')}>{t('notfound.body')}</EmptyState>;
  }

  return (
    <div className="stack">
      <div className="row">
        <Link to="/search" className="btn btn--ghost btn--sm">
          <ArrowLeft size={15} /> {t('nav.search')}
        </Link>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setSelected(null);
            setRevealed(true);
          }}
        >
          <RotateCcw size={14} /> {t('common.correctAnswer')}
        </button>
      </div>

      <article className="card">
        <QuestionView
          question={question}
          index={0}
          total={1}
          selected={selected}
          revealed={revealed}
          showExplanation
          onSelect={(optionId) => {
            setSelected(optionId);
            setRevealed(true);
          }}
        />
      </article>

      <div className="row">
        {bundle.topics
          .filter((topic) => question.topicIds.includes(topic.id))
          .map((topic) => (
            <Link key={topic.id} to={`/topics/${topic.id}`} className="chip chip--accent">
              {pickLocalized(topic.title, locale)}
            </Link>
          ))}
      </div>

      <div className="callout">
        <span>
          {t('common.difficulty')}: {'★'.repeat(Math.max(1, Math.min(3, question.difficulty)))}
        </span>
        <span className="faint">· {question.source}</span>
      </div>
    </div>
  );
}