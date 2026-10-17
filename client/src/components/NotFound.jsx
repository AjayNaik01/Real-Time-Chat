import React from 'react';
import { Home, RefreshCw, SearchX } from 'lucide-react';

export function NotFound({ roomId, onReturnHome }) {
  return (
    <div className="min-h-[100dvh] bg-[#0b0e14] flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 text-center shadow-xl backdrop-blur">
        {/* Search / Missing Room Graphic */}
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <SearchX className="w-6 h-6" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Room Not Found
        </h1>

        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          {roomId ? (
            <>
              The chat room <span className="text-white font-mono font-semibold">#{roomId}</span> was not found or may have expired.
            </>
          ) : (
            'The requested chat room could not be located.'
          )}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={onReturnHome}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Lobby</span>
          </button>

          <button
            onClick={() => {
              window.location.href = window.location.pathname;
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/[0.08] font-medium text-sm flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
