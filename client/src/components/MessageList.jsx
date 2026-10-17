import React, { useEffect, useRef, useState } from 'react';
import { Send, Check, CheckCheck, Zap, Globe, RefreshCw, Eye, Clock, ShieldCheck, MessageSquare } from 'lucide-react';
import { UserAvatar, getProfileColor } from '../helpers/profile.jsx';

export function MessageList({
  messages = [],
  currentUser,
  roomId = '',
  onStarterClick,
  isDevMode = false,
}) {
  const bottomRef = useRef(null);
  const [activeReceiptId, setActiveReceiptId] = useState(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderSourceBadge = (source) => {
    switch (source) {
      case 'WEBSOCKET':
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-brand-500/15 text-brand-300 font-mono">
            <Zap className="w-2.5 h-2.5" /> WS
          </span>
        );
      case 'POLLING':
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 font-mono">
            <RefreshCw className="w-2.5 h-2.5" /> Poll
          </span>
        );
      case 'HTTP':
      default:
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono">
            <Globe className="w-2.5 h-2.5" /> HTTP
          </span>
        );
    }
  };

  /**
   * Render WhatsApp / Google Chat Style Message Status Ticks
   */
  const renderMessageTicks = (msg) => {
    const isRead = msg.status === 'read' || (msg.readBy && msg.readBy.length > 0);
    const isDelivered = msg.status === 'delivered' || isRead || (msg.deliveredTo && msg.deliveredTo.length > 0);

    return (
      <div
        className="inline-flex items-center gap-1 cursor-pointer select-none group"
        onClick={() => setActiveReceiptId(activeReceiptId === msg.id ? null : msg.id)}
        title="Tap to see delivery & read transparency details"
      >
        {isRead ? (
          // Double Blue Tick
          <span className="inline-flex items-center text-sky-400">
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        ) : isDelivered ? (
          // Double Grey Tick
          <span className="inline-flex items-center text-slate-400 group-hover:text-slate-200">
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        ) : (
          // Single Grey Tick
          <span className="inline-flex items-center text-slate-400 group-hover:text-slate-200">
            <Check className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Mini Avatar of Readers (Messenger / Google Chat style) */}
        {isRead && msg.readBy && msg.readBy.length > 0 && (
          <div className="flex items-center -space-x-1 ml-0.5">
            {msg.readBy.slice(0, 3).map((r, i) => (
              <UserAvatar
                key={i}
                name={r.user}
                size="xs"
                className="ring-1 ring-slate-900 shadow-sm"
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render Full Transparency Receipt Drawer/Popover
   */
  const renderTransparencyDetails = (msg) => {
    const isRead = msg.status === 'read' || (msg.readBy && msg.readBy.length > 0);
    const isDelivered = msg.status === 'delivered' || isRead || (msg.deliveredTo && msg.deliveredTo.length > 0);

    const sentTime = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <div className="mt-1.5 p-3 bg-slate-900/95 border border-white/[0.1] rounded-xl text-[11px] text-slate-300 shadow-2xl max-w-xs space-y-1.5 animate-fadeIn">
        <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-white/[0.06] pb-1.5">
          <span className="flex items-center gap-1.5 text-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            Receipt Transparency
          </span>
          <span className="text-[10px] text-slate-500 font-mono">ID: {msg.id.slice(-6)}</span>
        </div>

        {/* 1. Sent */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-400">
            <Check className="w-3 h-3 text-slate-400" /> Sent to Server:
          </span>
          <span className="font-mono text-slate-200">{sentTime}</span>
        </div>

        {/* 2. Delivered */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-400">
            <CheckCheck className={`w-3 h-3 ${isDelivered ? 'text-slate-300' : 'text-slate-600'}`} />
            Delivered to:
          </span>
          {isDelivered && msg.deliveredTo && msg.deliveredTo.length > 0 ? (
            <span className="font-mono text-slate-200">
              {msg.deliveredTo.map((d) => d.user).join(', ')} ({new Date(msg.deliveredTo[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
            </span>
          ) : (
            <span className="text-slate-500 italic">Waiting for recipient...</span>
          )}
        </div>

        {/* 3. Seen / Read */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-400">
            <Eye className={`w-3 h-3 ${isRead ? 'text-sky-400' : 'text-slate-600'}`} />
            Seen by:
          </span>
          {isRead && msg.readBy && msg.readBy.length > 0 ? (
            <span className="font-mono text-sky-300 font-medium">
              {msg.readBy.map((r) => r.user).join(', ')} ({new Date(msg.readBy[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
            </span>
          ) : (
            <span className="text-slate-500 italic">Not viewed yet</span>
          )}
        </div>
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="max-w-md w-full bg-slate-900/50 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Welcome to #{roomId || 'Chat'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            Send a message to start chatting. Every message includes live delivery & read transparency receipts.
          </p>

          {onStarterClick && (
            <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => onStarterClick('👋 Hello everyone!')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition active:scale-95"
              >
                👋 Say Hello
              </button>
              <button
                onClick={() => onStarterClick('⚡ Testing real-time messages!')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition active:scale-95"
              >
                ⚡ Test Real-time
              </button>
              <button
                onClick={() => onStarterClick('✓✓ Testing double ticks & receipts')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition active:scale-95"
              >
                ✓✓ Test Ticks
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-3 sm:p-5"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="max-w-3xl mx-auto w-full space-y-3">
        {messages.map((msg, index) => {
          const isSelf = msg.sender?.toLowerCase() === currentUser?.toLowerCase();
          const prevMsg = messages[index - 1];

          // Google Chat Message Clustering:
          // Group consecutive messages from same sender within 2 minutes under one avatar
          const isSameSenderAsPrev =
            prevMsg &&
            prevMsg.sender?.toLowerCase() === msg.sender?.toLowerCase() &&
            msg.timestamp - prevMsg.timestamp < 120000;

          const timeFormatted = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          const profileColor = getProfileColor(msg.sender);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} ${
                isSameSenderAsPrev ? 'mt-1' : 'mt-3.5'
              }`}
            >
              {/* Google Chat Style Header: Avatar + Sender Name + Time (Only on first of cluster) */}
              {!isSameSenderAsPrev && (
                <div
                  className={`flex items-center gap-2 mb-1 px-1 ${
                    isSelf ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <UserAvatar name={msg.sender} size="sm" />
                  <span className={`text-xs font-semibold ${isSelf ? 'text-brand-300' : profileColor.text}`}>
                    {isSelf ? 'You' : msg.sender}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">{timeFormatted}</span>
                  {isDevMode && renderSourceBadge(msg.source)}
                </div>
              )}

              {/* Message Bubble + Ticks Container */}
              <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[88%] sm:max-w-[75%]`}>
                <div
                  className={`group relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                    isSelf
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-900/90 text-slate-100 border border-white/[0.08] rounded-tl-none'
                  }`}
                >
                  <span>{msg.text}</span>

                  {/* Inline or Footer Tick Indicator for Sent Messages */}
                  {isSelf && (
                    <div className="mt-1 flex items-center justify-end gap-1.5 pt-0.5 text-[10px] text-blue-200/90 border-t border-blue-500/30">
                      <span className="font-mono text-[10px] opacity-80">{timeFormatted}</span>
                      {renderMessageTicks(msg)}
                    </div>
                  )}
                </div>

                {/* Full Transparency Breakdown Card (when toggled on click) */}
                {isSelf && activeReceiptId === msg.id && renderTransparencyDetails(msg)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
