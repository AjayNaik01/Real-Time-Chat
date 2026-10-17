import React from 'react';
import { AlertOctagon, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('🔥 [ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReturnHome = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('user');
    window.location.href = url.pathname;
  };

  handleCopyDetails = () => {
    const report = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, copied } = this.state;

      return (
        <div className="min-h-[100dvh] bg-[#0b0e14] flex flex-col justify-center items-center p-4 sm:p-6 select-none">
          <div className="w-full max-w-md bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 text-center shadow-xl backdrop-blur">
            {/* Clean Icon */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Something went wrong
            </h1>

            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              An unexpected issue occurred while loading this page. Please try reloading or return to the home lobby.
            </p>

            {/* Simple Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReturnHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/[0.08] font-medium text-sm flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Return to Lobby</span>
              </button>
            </div>

            {/* Optional subtle collapsible problem details */}
            <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-400 transition"
              >
                <span>{showDetails ? 'Hide details' : 'Technical details'}</span>
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showDetails && (
                <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-white/[0.06] text-[11px] font-mono text-left text-slate-400 overflow-x-auto max-h-36 custom-scrollbar space-y-1">
                  <div className="text-red-400 font-semibold">{error?.toString()}</div>
                  <pre className="text-slate-500 text-[10px] whitespace-pre-wrap">{error?.stack}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
