import React from 'react';
import { RefreshCw, Zap, Clock, WifiOff } from 'lucide-react';
import { PROTOCOL_MODES } from '../hooks/useChatMode.js';

export function ModeSwitcher({
  mode,
  setMode,
  isFetching,
  lastFetchedAt,
  fetchMessagesHttp,
  pollCountdown,
  wsStatus,
}) {
  return (
    <div className="bg-slate-950/90 border-b border-white/[0.06] px-4 py-2.5 select-none backdrop-blur">
      <div className="max-w-3xl mx-auto w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Segmented Pill Control */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-white/[0.08] w-full sm:w-auto shadow-inner">
          {/* Option 1: Manual */}
          <button
            onClick={() => setMode(PROTOCOL_MODES.MANUAL)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
              mode === PROTOCOL_MODES.MANUAL
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Manual Fetch</span>
            <span className="sm:hidden inline">Manual</span>
          </button>

          {/* Option 2: Short Polling */}
          <button
            onClick={() => setMode(PROTOCOL_MODES.POLLING)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
              mode === PROTOCOL_MODES.POLLING
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${mode === PROTOCOL_MODES.POLLING ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Short Polling (2s)</span>
            <span className="sm:hidden inline">Poll 2s</span>
          </button>

          {/* Option 3: WebSockets */}
          <button
            onClick={() => setMode(PROTOCOL_MODES.WEBSOCKET)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
              mode === PROTOCOL_MODES.WEBSOCKET
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">WebSockets</span>
            <span className="sm:hidden inline">WS</span>
          </button>
        </div>

        {/* Mode-Specific Status / Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          {mode === PROTOCOL_MODES.MANUAL && (
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <span className="text-slate-400 text-[11px] truncate">
                {lastFetchedAt
                  ? `Fetched: ${new Date(lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Not fetched'}
              </span>
              <button
                onClick={() => fetchMessagesHttp(false)}
                disabled={isFetching}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
                <span>{isFetching ? 'Fetching...' : 'Fetch'}</span>
              </button>
            </div>
          )}

          {mode === PROTOCOL_MODES.POLLING && (
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <span className="text-slate-400 text-[11px]">Polling loop active</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                <span>Next: <strong>{pollCountdown}s</strong></span>
              </div>
            </div>
          )}

          {mode === PROTOCOL_MODES.WEBSOCKET && (
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <span className="text-slate-400 text-[11px]">Duplex TCP</span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-medium ${
                  wsStatus === 'connected'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}
              >
                {wsStatus === 'connected' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>WS Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="capitalize">{wsStatus}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
