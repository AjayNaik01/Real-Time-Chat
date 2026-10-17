import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Lock,
  Search,
  RefreshCw,
  LogOut,
  Terminal,
  Radio,
  ArrowRight,
} from 'lucide-react';
import {
  adminLoginApi,
  adminGetOverviewApi,
  adminGetAuditLogsApi,
} from '../services/api.js';

export function AdminPortal({ onExit }) {
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('chat_lab_admin_token') || '';
  });

  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'vitals'
  const [telemetry, setTelemetry] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Handle Login Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await adminLoginApi(password.trim());
      if (res.ok && res.data?.token) {
        setToken(res.data.token);
        sessionStorage.setItem('chat_lab_admin_token', res.data.token);
        setPassword('');
      } else {
        setLoginError(res.data?.error || 'Invalid admin credentials');
      }
    } catch (err) {
      setLoginError('Cannot reach server endpoint');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    sessionStorage.removeItem('chat_lab_admin_token');
    onExit?.();
  };

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(true);

    try {
      const [overviewRes, logsRes] = await Promise.all([
        adminGetOverviewApi(token),
        adminGetAuditLogsApi(token, searchQuery, 150),
      ]);

      if (overviewRes.status === 401 || logsRes.status === 401) {
        // Token expired
        setToken('');
        sessionStorage.removeItem('chat_lab_admin_token');
        return;
      }

      if (overviewRes.ok && overviewRes.data?.telemetry) {
        setTelemetry(overviewRes.data.telemetry);
      }
      if (logsRes.ok && logsRes.data?.logs) {
        setAuditLogs(logsRes.data.logs);
      }
    } catch (err) {
      console.error('Error refreshing admin portal data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [token, searchQuery]);

  // Initial load and Auto-refresh every 3.5 seconds
  useEffect(() => {
    if (!token) return;
    fetchData();

    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 3500);
    return () => clearInterval(interval);
  }, [token, autoRefresh, fetchData]);

  // Event Badge Color Helper
  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'MESSAGE_SENT':
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-[10px] font-bold">MESSAGE_SENT</span>;
      case 'ROOM_CREATED':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">ROOM_CREATED</span>;
      case 'ROOM_JOINED':
        return <span className="px-2 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-400 font-mono text-[10px] font-bold">ROOM_JOINED</span>;
      case 'SOCKET_CONNECTED':
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-400 font-mono text-[10px] font-bold">SOCKET_CONNECTED</span>;
      case 'SOCKET_DISCONNECTED':
        return <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px] font-bold">SOCKET_DISCONNECTED</span>;
      case 'RATE_LIMIT_TRIPPED':
        return <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-bold animate-pulse">RATE_LIMIT_TRIPPED</span>;
      case 'SECURITY_WARNING':
        return <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold">SECURITY_WARNING</span>;
      case 'MESSAGE_DELIVERED':
        return <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400 font-mono text-[10px] font-bold">DELIVERED</span>;
      case 'MESSAGE_READ':
        return <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold">READ</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">{eventType}</span>;
    }
  };

  // -------------------------------------------------------------
  // Unauthenticated: Admin Login Gateway
  // -------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-[#07090d] text-slate-100 flex flex-col justify-center items-center p-4 select-none">
        <div className="w-full max-w-md bg-slate-900/90 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur">
          {/* Top amber accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-red-500"></div>

          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2 border border-amber-500/20">
            Internal Security Gateway
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Command Center Access
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Restricted operational console. Authenticate with your administrative security key to inspect real-time forensics and telemetry.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Secret Key:
              </label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 text-sm font-mono transition"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onExit}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/[0.08] text-xs font-semibold transition"
              >
                Exit
              </button>
              <button
                type="submit"
                disabled={isLoggingIn || !password.trim()}
                className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated: Security Command Center Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-[100dvh] bg-[#07090d] text-slate-200 flex flex-col font-sans select-text">
      {/* Top SOC Navigation Bar */}
      <header className="bg-slate-950/90 border-b border-white/[0.08] px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base tracking-tight">
                Security Operations Center (SOC)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE RADAR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Real-time audit surveillance & infrastructure monitoring
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Live Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-900 text-slate-500 border-white/[0.08]'
            }`}
            title="Toggle Live 3.5s Stream"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Stream:</span>
            <span className="font-bold">{autoRefresh ? 'AUTO (3s)' : 'PAUSED'}</span>
          </button>

          {/* Refresh Now Button */}
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/[0.08] transition active:scale-95"
            title="Refresh Data Now"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Exit / Logout */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition active:scale-95"
            title="Log out and return to normal chat"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit SOC</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'audit'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Forensic Audit Logs ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('vitals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'vitals'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Server Vitals
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono hidden md:inline">
            Active Sockets: <strong className="text-emerald-400">{telemetry?.activeSockets || 0}</strong>
          </div>
        </div>

        {/* -------------------------------------------------------------
            TAB 1: Forensic Audit Trail Stream
        ----------------------------------------------------------------- */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search Filter Toolbar */}
            <div className="flex items-center gap-3 bg-slate-900/60 border border-white/[0.08] rounded-2xl p-3 shadow-inner">
              <Search className="w-4 h-4 text-slate-500 ml-1 shrink-0" />
              <input
                type="text"
                placeholder="Filter audit trail by IP address, user handle, event type, or room code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-500 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Audit Log Stream Cards */}
            <div className="bg-slate-950/70 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-slate-900/80 border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
                <span>EVENT STREAM ({auditLogs.length} Records)</span>
                <span className="text-[11px] text-slate-500">Sorted by Newest First</span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  No forensic events match current filter.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04] max-h-[650px] overflow-y-auto font-mono text-xs">
                  {auditLogs.map((log) => {
                    const time = new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 hover:bg-slate-900/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <span className="text-slate-500 shrink-0 text-[11px]">{time}</span>
                          {getEventBadge(log.eventType)}
                          <span className="text-white font-semibold truncate">
                            {log.actor?.user || 'Anonymous'}
                          </span>
                          {log.target?.roomId && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                              #{log.target.roomId}
                            </span>
                          )}
                          {log.metadata?.cipherSnippet && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono">
                              <Lock className="w-2.5 h-2.5 text-amber-400" />
                              <span className="truncate max-w-[160px]">{log.metadata.cipherSnippet}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px] shrink-0">
                          {log.metadata?.fingerprint && (
                            <span className="font-mono text-slate-500 text-[10px] hidden md:inline" title="SHA-256 Message Checksum">
                              sha256:{log.metadata.fingerprint.substring(0, 8)}
                            </span>
                          )}
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-white/[0.06] text-amber-300">
                            IP: {log.actor?.ip || '127.0.0.1'}
                          </span>
                          {log.metadata?.source && (
                            <span className="text-slate-500">via {log.metadata.source}</span>
                          )}
                          <span
                            className="text-slate-600 truncate max-w-[200px]"
                            title={log.actor?.userAgent}
                          >
                            {log.actor?.userAgent?.split(' ')[0] || 'Browser'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 2: Infrastructure Vitals & Diagnostics
        ----------------------------------------------------------------- */}
        {activeTab === 'vitals' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div className="bg-slate-950/70 border border-white/[0.08] rounded-2xl p-5 shadow-xl">
              <div className="text-slate-500 text-xs font-mono uppercase mb-1">Total WebSockets</div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                {telemetry?.activeSockets || 0}
              </div>
              <p className="text-slate-500 text-xs mt-2">Active persistent connections</p>
            </div>

            <div className="bg-slate-950/70 border border-white/[0.08] rounded-2xl p-5 shadow-xl">
              <div className="text-slate-500 text-xs font-mono uppercase mb-1">Server Memory RSS</div>
              <div className="text-3xl font-extrabold text-blue-400 font-mono">
                {telemetry?.memory?.rssMB || '0'} MB
              </div>
              <p className="text-slate-500 text-xs mt-2">Resident set memory size</p>
            </div>

            <div className="bg-slate-950/70 border border-white/[0.08] rounded-2xl p-5 shadow-xl">
              <div className="text-slate-500 text-xs font-mono uppercase mb-1">Heap Used</div>
              <div className="text-3xl font-extrabold text-purple-400 font-mono">
                {telemetry?.memory?.heapUsedMB || '0'} MB
              </div>
              <p className="text-slate-500 text-xs mt-2">Node.js V8 allocated heap</p>
            </div>

            <div className="bg-slate-950/70 border border-white/[0.08] rounded-2xl p-5 shadow-xl">
              <div className="text-slate-500 text-xs font-mono uppercase mb-1">Uptime</div>
              <div className="text-3xl font-extrabold text-amber-400 font-mono">
                {telemetry?.uptimeSeconds ? `${Math.floor(telemetry.uptimeSeconds / 60)}m ${telemetry.uptimeSeconds % 60}s` : '0s'}
              </div>
              <p className="text-slate-500 text-xs mt-2">Process continuous uptime</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
