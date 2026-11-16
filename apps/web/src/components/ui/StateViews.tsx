import type { ReactNode } from 'react';

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="stack" role="status" aria-live="polite" aria-label={label}>
      <div className="skeleton" style={{ height: 96, borderRadius: 28 }} />
      <div className="skeleton" style={{ height: 56 }} />
      <div className="skeleton" style={{ height: 200 }} />
      <div className="skeleton" style={{ height: 64 }} />
    </div>
  );
}

export function ErrorState({ message, hint, onRetry }: { message: string; hint: string; onRetry: () => void }) {
  return (
    <div className="callout callout--warn" role="alert">
      <div>
        <strong>{message}</strong>
        <div style={{ marginTop: 6 }}>{hint}</div>
      </div>
      <div className="grow" />
      <button type="button" className="btn btn--sm" onClick={onRetry}>
        {hint}
      </button>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card center" style={{ padding: 40 }}>
      <h3>{title}</h3>
      {children ? <p className="muted">{children}</p> : null}
      {action ? <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}

export function Modal({
  title,
  children,
  closeLabel,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  closeLabel: string;
  onClose: () => void;
  actions?: ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {children}
        <div className="row row--between">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {closeLabel}
          </button>
          <div className="row">{actions}</div>
        </div>
      </div>
    </div>
  );
}