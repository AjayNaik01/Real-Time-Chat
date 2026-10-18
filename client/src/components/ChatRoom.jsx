import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  ArrowLeft,
  Wrench,
  AlertTriangle,
  Lock,
  Globe,
  UserCheck,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  Paperclip,
} from 'lucide-react';
import { useChatMode, PROTOCOL_MODES } from '../hooks/useChatMode.js';
import { useTyping } from '../hooks/useTyping.js';
import { UserAvatar, RoomAvatar } from '../helpers/profile.jsx';
import { verifyRoomPasswordApi } from '../services/api.js';
import { ModeSwitcher } from './ModeSwitcher.jsx';
import { MessageList } from './MessageList.jsx';
import { MessageInput } from './MessageInput.jsx';
import { TypingIndicator } from './TypingIndicator.jsx';
import { NetworkInspector } from './NetworkInspector.jsx';

export function ChatRoom({ roomId, user, roomPassword = '', isPrivate = false, onLeaveRoom, onSwitchUser }) {
  const [copied, setCopied] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState(null);

  // Switch User State
  const [switchUserModalOpen, setSwitchUserModalOpen] = useState(false);
  const [switchNewUser, setSwitchNewUser] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  // Staged File & Drag Drop State
  const [stagedFile, setStagedFile] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setStagedFile(file);
    }
  };

  // Developer Mode State: Defaults to false (clean Google Chat view)
  const [isDevMode, setIsDevMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat_lab_dev_mode');
      return saved === 'true'; // Defaults to false
    }
    return false;
  });

  const {
    mode,
    setMode,
    messages,
    isFetching,
    lastFetchedAt,
    onlineMembers,
    wsStatus,
    pollCountdown,
    metrics,
    sendMessage,
    sendTyping,
    markMessagesAsRead,
    fetchMessagesHttp,
    wsClient,
  } = useChatMode(roomId, user, roomPassword);

  // WhatsApp-style typing logic
  const {
    typingUsers,
    handleTypingKeystroke,
    handleMessageSent,
    handleIncomingTypingEvent,
  } = useTyping({
    sendTyping,
    enabled: mode === PROTOCOL_MODES.WEBSOCKET,
  });

  // Wire incoming typing events and rate limit warnings from WebSocket client
  useEffect(() => {
    if (!wsClient) return;
    const unsubTyping = wsClient.on('typing', handleIncomingTypingEvent);
    const unsubWarning = wsClient.on('warning', (data) => {
      setRateLimitWarning(data.message || 'WebSocket rate limit exceeded');
      setTimeout(() => setRateLimitWarning(null), 4000);
    });

    return () => {
      unsubTyping();
      unsubWarning();
    };
  }, [wsClient, handleIncomingTypingEvent]);

  // Read Receipt View Observer: Mark messages as read when tab is focused
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && user && messages.length > 0) {
        const unreadIds = messages
          .filter(
            (m) =>
              m.sender?.toLowerCase() !== user.toLowerCase() &&
              (!m.readBy || !m.readBy.some((r) => r.user.toLowerCase() === user.toLowerCase()))
          )
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          markMessagesAsRead(unreadIds);
        }
      }
    };

    handleVisibilityOrFocus();
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [messages, user, markMessagesAsRead]);

  const handleToggleDevMode = () => {
    setIsDevMode((prev) => {
      const next = !prev;
      localStorage.setItem('chat_lab_dev_mode', String(next));
      // When turning OFF Dev Mode, ensure app operates on standard real-time WebSockets
      if (!next) {
        setMode(PROTOCOL_MODES.WEBSOCKET);
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmSwitchUser = async (e) => {
    e.preventDefault();
    if (!switchNewUser.trim()) {
      setSwitchError('Please enter a new nickname / handle.');
      return;
    }

    if (isPrivate) {
      if (!switchPassword.trim()) {
        setSwitchError('Please enter the room password to switch user.');
        return;
      }

      setIsSwitching(true);
      setSwitchError('');

      try {
        const res = await verifyRoomPasswordApi(roomId, switchPassword.trim());
        if (res.ok && res.data.verified) {
          setSwitchUserModalOpen(false);
          if (onSwitchUser) {
            onSwitchUser(switchNewUser.trim(), switchPassword.trim());
          }
        } else {
          setSwitchError(res.data?.error || 'Incorrect password. Access denied.');
        }
      } catch (err) {
        setSwitchError('Cannot verify password. Server unreachable.');
      } finally {
        setIsSwitching(false);
      }
    } else {
      // Public room: switch directly
      setSwitchUserModalOpen(false);
      if (onSwitchUser) {
        onSwitchUser(switchNewUser.trim(), '');
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-[100dvh] bg-google-bg text-slate-100 overflow-hidden select-text relative"
    >
      {/* Drag & Drop Visual Backdrop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-2 border-dashed border-blue-400 flex flex-col items-center justify-center p-6 pointer-events-none animate-fade-in">
          <div className="p-4 bg-slate-900/90 rounded-2xl border border-blue-400/30 flex flex-col items-center gap-3 shadow-2xl">
            <Paperclip className="w-10 h-10 text-blue-400 animate-bounce" />
            <div className="text-center">
              <p className="text-base font-semibold text-white">Drop file to attach</p>
              <p className="text-xs text-slate-400 mt-0.5">Images, videos, audio, PDF & documents up to 15MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-slate-950/95 border-b border-white/[0.06] px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-sm z-10 shrink-0 backdrop-blur">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            onClick={onLeaveRoom}
            className="p-2 -ml-1 hover:bg-slate-900 rounded-full text-slate-400 hover:text-white transition active:scale-95 shrink-0"
            title="Leave Room"
            aria-label="Leave Room"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Distinct Room Avatar */}
          <RoomAvatar roomId={roomId} size="md" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                {roomId}
              </span>
              {isPrivate ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-mono shrink-0">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  Private Room
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono shrink-0">
                  <Globe className="w-2.5 h-2.5 text-blue-400" />
                  Public
                </span>
              )}
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 border border-white/[0.08] text-slate-300 rounded-lg transition shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-brand-400" /> : <Copy className="w-3 h-3" />}
                <span className="hidden xs:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Room Members Stack */}
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
              {mode === PROTOCOL_MODES.WEBSOCKET && onlineMembers.length > 0 ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center -space-x-1.5">
                    {onlineMembers.slice(0, 4).map((m, i) => (
                      <UserAvatar
                        key={i}
                        name={m}
                        size="xs"
                        className="ring-1 ring-slate-900 shadow-sm"
                      />
                    ))}
                  </div>
                  <span className="text-emerald-400 font-medium">
                    {onlineMembers.length} active
                  </span>
                </div>
              ) : (
                <span className="text-slate-500">Active Room</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions: Dev Mode Toggle + User Profile */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Developer Mode Toggle Button */}
          <button
            onClick={handleToggleDevMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition active:scale-95 border ${
              isDevMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-white/[0.08] hover:text-slate-200 hover:border-white/[0.14]'
            }`}
            title="Toggle Developer Lab Mode (Protocols & Telemetry)"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dev Mode:</span>
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {isDevMode ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Current User Profile Pill + Switch User Action */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/[0.08] p-1 pl-2.5 rounded-full shrink-0">
            <UserAvatar name={user} size="sm" />
            <span className="text-xs font-medium text-slate-200 hidden sm:inline">{user}</span>
            <button
              onClick={() => {
                setSwitchNewUser('');
                setSwitchPassword('');
                setSwitchError('');
                setSwitchUserModalOpen(true);
              }}
              className="ml-1 px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-[11px] font-medium transition active:scale-95"
              title="Log in as a different user"
            >
              Switch
            </button>
          </div>
        </div>
      </header>

      {/* Rate Limit Warning Banner */}
      {rateLimitWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium text-amber-300 animate-fade-in z-20">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{rateLimitWarning}</span>
        </div>
      )}

      {/* Protocol Switcher Bar: Visible ONLY in Developer Mode */}
      {isDevMode && (
        <ModeSwitcher
          mode={mode}
          setMode={setMode}
          isFetching={isFetching}
          lastFetchedAt={lastFetchedAt}
          fetchMessagesHttp={fetchMessagesHttp}
          pollCountdown={pollCountdown}
          wsStatus={wsStatus}
        />
      )}

      {/* Message Feed Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
        <MessageList
          messages={messages}
          currentUser={user}
          roomId={roomId}
          onStarterClick={sendMessage}
          isDevMode={isDevMode}
        />
        <TypingIndicator typingUsers={typingUsers} mode={mode} isDevMode={isDevMode} />
      </div>

      {/* Message Input Bar */}
      <MessageInput
        onSendMessage={sendMessage}
        onTypingKeystroke={handleTypingKeystroke}
        onMessageSent={handleMessageSent}
        roomId={roomId}
        roomPassword={roomPassword}
        disabled={false}
        stagedFile={stagedFile}
        onClearStagedFile={() => setStagedFile(null)}
      />

      {/* Under The Hood Network Inspector: Visible ONLY in Developer Mode */}
      {isDevMode && <NetworkInspector metrics={metrics} />}

      {/* Switch User Modal */}
      {switchUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

            <button
              onClick={() => setSwitchUserModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
              <UserCheck className="w-7 h-7" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-2 border border-blue-500/20">
              User Profile
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Log In as Different User
            </h2>

            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
              {isPrivate
                ? `Room ${roomId} is private. To switch to a different user, enter the new nickname and verify the room password.`
                : `Enter the new nickname / handle you wish to use in room ${roomId}.`}
            </p>

            <form onSubmit={handleConfirmSwitchUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  New Nickname / Handle
                </label>
                <input
                  type="text"
                  placeholder="Enter new handle (e.g. Bob, Alice)..."
                  value={switchNewUser}
                  onChange={(e) => {
                    setSwitchNewUser(e.target.value);
                    if (switchError) setSwitchError('');
                  }}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-950/80 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition shadow-inner"
                />
              </div>

              {isPrivate && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Room Password Required
                  </label>
                  <div className="relative">
                    <input
                      type={showSwitchPassword ? 'text' : 'password'}
                      placeholder="Enter room password to verify..."
                      value={switchPassword}
                      onChange={(e) => {
                        setSwitchPassword(e.target.value);
                        if (switchError) setSwitchError('');
                      }}
                      className="w-full px-4 py-3 bg-slate-950/80 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 pr-11 transition shadow-inner font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                      tabIndex={-1}
                    >
                      {showSwitchPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {switchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{switchError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSwitchUserModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSwitching || !switchNewUser.trim() || (isPrivate && !switchPassword.trim())}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {isSwitching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Switch & Rejoin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
