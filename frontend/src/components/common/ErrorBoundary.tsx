/**
 * frontend/src/components/common/ErrorBoundary.tsx
 * Production React Error Boundary adhering to anti-slop newspaper design system (P12-06).
 * Catches rendering exceptions in panels, isolates crashes, and renders an editorial fallback
 * with retry capabilities.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  panelName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.panelName || 'Unknown'}] Error caught:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const panelTitle = this.props.panelName || 'Desk Component';

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="editorial-error-boundary"
          style={{
            flex: 1,
            height: '100%',
            minHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(17, 24, 39, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Editorial Warning Icon */}
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              marginBottom: '14px',
            }}
          >
            <AlertTriangle size={28} color="#ef4444" />
          </div>

          {/* Masthead Headline */}
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: '#fee2e2',
              marginBottom: '6px',
            }}
          >
            DISPATCH INTERRUPTED
          </div>

          <p
            style={{
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              maxWidth: '380px',
              lineHeight: 1.5,
              marginBottom: '14px',
            }}
          >
            The intelligence feed in <strong>{panelTitle}</strong> experienced a teletype fault.
            Other news desk desks remain fully operational.
          </p>

          {/* Technical Error Teletype */}
          {this.state.error && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: '#f87171',
                background: 'rgba(10, 14, 26, 0.9)',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                maxWidth: '420px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: '18px',
              }}
            >
              {this.state.error.message || 'Unknown runtime fault'}
            </div>
          )}

          {/* Retry Action */}
          <button
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              fontSize: '0.8rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: '#f1f5f9',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-focus)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)')}
          >
            <RefreshCw size={14} />
            <span>Restore Wire Feed</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
