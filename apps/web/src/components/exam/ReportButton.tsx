import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Flag } from 'lucide-react';
import { addFeedback, type FeedbackKind } from '../../lib/feedback';

const KINDS: { kind: FeedbackKind; key: string }[] = [
  { kind: 'error', key: 'report.kindError' },
  { kind: 'typo', key: 'report.kindTypo' },
  { kind: 'idea', key: 'report.kindIdea' },
];

export function ReportButton({ questionId }: { questionId: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('error');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <span className="chip chip--success chip--sm">
        <Check size={12} /> {t('report.sent')}
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
        <Flag size={13} /> {t('report.button')}
      </button>
    );
  }

  return (
    <div className="card card--tight" style={{ display: 'grid', gap: 9, width: '100%' }}>
      <div className="row" style={{ gap: 6 }}>
        {KINDS.map((item) => (
          <button
            key={item.kind}
            type="button"
            className={`btn btn--sm ${kind === item.kind ? 'btn--soft' : 'btn--ghost'}`}
            onClick={() => setKind(item.kind)}
            aria-pressed={kind === item.kind}
          >
            {t(item.key)}
          </button>
        ))}
      </div>
      <textarea
        className="input"
        rows={2}
        maxLength={500}
        placeholder={t('report.placeholder')}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="row" style={{ gap: 7 }}>
        <button
          type="button"
          className="btn btn--sm btn--primary"
          disabled={text.trim().length < 3}
          onClick={() => {
            addFeedback({ questionId, kind, text, locale: i18n.language });
            setSent(true);
          }}
        >
          {t('report.send')}
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOpen(false)}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}