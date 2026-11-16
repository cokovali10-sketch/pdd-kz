import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  loadingLabel: string;
  errorLabel: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence: without this a single render error leaves a blank page
 * with only a console message.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[jolbilet] render error', error, info.componentStack);
  }

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, errorLabel } = this.props;

    if (!error) return children;

    return (
      <div className="app">
        <div className="app__main" style={{ padding: 24 }}>
          <div className="app__content">
            <div className="card stack--sm" style={{ display: 'grid', gap: 12 }}>
              <h1 style={{ margin: 0 }}>{errorLabel}</h1>
              <pre
                className="mono"
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  overflowX: 'auto',
                  fontSize: 'var(--step--1)',
                }}
              >
                {error.message}
              </pre>
              <div>
                <button type="button" className="btn btn--primary" onClick={this.reload}>
                  {this.props.loadingLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}