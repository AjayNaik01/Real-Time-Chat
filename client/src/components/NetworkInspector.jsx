import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

export function NetworkInspector({ metrics }) {
  // Default to collapsed on mobile (< 640px) to maximize chat viewport space
  const [isOpen, setIsOpen] = useState(false);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="bg-slate-950/90 backdrop-blur border-t border-white/[0.06] text-xs shrink-0 z-10">
      {/* Header Bar / Interactive Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 transition select-none"
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-slate-300 font-semibold truncate">
          <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Network Inspector
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
            HTTP: <strong className="text-amber-400 font-semibold">{metrics.httpRequests}</strong> ({formatBytes(metrics.httpBytes)}) | WS: <strong className="text-emerald-400 font-semibold">{metrics.wsFrames}</strong> ({formatBytes(metrics.wsBytes)})
          </span>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
        </div>
      </div>

      {/* Expanded Metrics Content */}
      {isOpen && (
        <div className="border-t border-white/[0.04] p-3 sm:p-4 bg-slate-950">
          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Card 1: HTTP Requests */}
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                HTTP Requests
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {metrics.httpRequests}
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                Headers sent on poll
              </span>
            </div>

            {/* Card 2: HTTP Bandwidth */}
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                HTTP Bandwidth
              </div>
              <div className="text-xl font-bold font-mono text-amber-300">
                {formatBytes(metrics.httpBytes)}
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                ~600B overhead/call
              </span>
            </div>

            {/* Card 3: WebSocket Frames */}
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                WS Frames
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {metrics.wsFrames}
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                Typing & messages
              </span>
            </div>

            {/* Card 4: WebSocket Bandwidth */}
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                WS Bandwidth
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300">
                {formatBytes(metrics.wsBytes)}
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                2–10B framing header
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
