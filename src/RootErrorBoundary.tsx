import React, { Component, type ErrorInfo, type ReactNode } from 'react';

const STORAGE_KEY = 'asymmetric-war-balance';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Catches render errors (e.g. corrupt localStorage balance) instead of a blank/black screen. */
export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: 24,
            background: '#0a0a0c',
            color: '#e8e8e8',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
          }}
        >
          <h1 style={{ color: '#f87171', marginBottom: 12, fontSize: 18 }}>Erreur au chargement</h1>
          <p style={{ marginBottom: 8 }}>{e.message}</p>
          <pre style={{ opacity: 0.85, fontSize: 11, overflow: 'auto', maxHeight: '40vh' }}>{e.stack}</pre>
          <p style={{ marginTop: 16, opacity: 0.8 }}>
            Souvent causé par une sauvegarde d’équilibrage invalide dans le navigateur.
          </p>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: '10px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
            onClick={() => {
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            Effacer l’équilibrage sauvegardé et recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
