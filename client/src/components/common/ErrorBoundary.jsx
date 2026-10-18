import React from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PulseChat ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/chat';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-950/40">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
            PulseChat encountered an unexpected display issue. Your messages and call history remain safe.
          </p>
          {this.state.error && (
            <div className="max-w-md w-full bg-slate-900/90 border border-rose-900/50 rounded-2xl p-3.5 mb-6 text-left overflow-auto max-h-48 text-[11px] font-mono text-rose-300">
              <p className="font-bold text-rose-400 mb-1">{this.state.error.toString()}</p>
              {this.state.error.stack && (
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">{this.state.error.stack}</pre>
              )}
            </div>
          )}
          <div className="flex items-center space-x-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restart PulseChat</span>
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 transition active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Refresh Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
