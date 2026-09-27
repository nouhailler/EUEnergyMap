import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erreur non interceptée dans l\'arborescence de composants :', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Une interruption temporaire est survenue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                L'affichage a rencontré un état imprévu. Vous pouvez recharger la vue pour restaurer les données en direct.
              </p>
              {this.state.error && (
                <div className="mt-3 text-left bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-[11px] font-mono text-rose-800 dark:text-rose-300 break-words max-h-32 overflow-y-auto">
                  <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '';
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retour au tableau de bord</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
