import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Check,
  CheckCheck,
  Zap,
  Globe,
  RefreshCw,
  Eye,
  Clock,
  ShieldCheck,
  MessageSquare,
  Download,
  FileText,
  Music,
  Film,
  Maximize2,
  X,
} from 'lucide-react';
import { UserAvatar, getProfileColor } from '../helpers/profile.jsx';
import { getFileUrl } from '../services/api.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function MessageList({
  messages = [],
  currentUser,
  roomId = '',
  onStarterClick,
  isDevMode = false,
}) {
  const bottomRef = useRef(null);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);

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

        {/* Mini Avatar of Readers */}
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

    const firstDelivered = msg.deliveredTo?.[0];
    const deliveredTime = firstDelivered
      ? new Date(firstDelivered.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

    const firstRead = msg.readBy?.[0];
    const readTime = firstRead
      ? new Date(firstRead.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

    return (
      <div className="mt-2 w-full p-3 bg-slate-950/95 border border-white/[0.1] rounded-xl text-xs space-y-2.5 shadow-2xl animate-fade-in font-sans">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Message Delivery Transparency
          </span>
          <span className="font-mono text-[10px] text-slate-500 uppercase">{msg.source}</span>
        </div>

        {/* Step 1: Sent */}
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-slate-400" />
            <span>Sent to Server:</span>
          </div>
          <span className="font-mono text-slate-200">{sentTime}</span>
        </div>

        {/* Step 2: Delivered */}
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCheck className={`w-3.5 h-3.5 ${isDelivered ? 'text-slate-300' : 'text-slate-600'}`} />
            <span>Delivered to Recipient:</span>
          </div>
          {isDelivered ? (
            <span className="font-mono text-emerald-400">{deliveredTime || 'Delivered'}</span>
          ) : (
            <span className="text-slate-600 font-mono italic">Waiting for peer...</span>
          )}
        </div>

        {/* Step 3: Read */}
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCheck className={`w-3.5 h-3.5 ${isRead ? 'text-sky-400' : 'text-slate-600'}`} />
            <span>Read / Viewed by Recipient:</span>
          </div>
          {isRead ? (
            <span className="font-mono text-sky-400 font-semibold">{readTime || 'Read'}</span>
          ) : (
            <span className="text-slate-600 font-mono italic">Unread</span>
          )}
        </div>

        {/* Reader Breakdown List */}
        {msg.readBy && msg.readBy.length > 0 && (
          <div className="pt-1.5 border-t border-white/[0.06] text-[11px]">
            <div className="text-slate-400 mb-1 flex items-center gap-1 font-medium">
              <Eye className="w-3 h-3 text-sky-400" /> Seen by:
            </div>
            <div className="space-y-1">
              {msg.readBy.map((reader, rIdx) => (
                <div key={rIdx} className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded">
                  <span className="font-medium text-slate-200">{reader.user}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(reader.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render Rich WhatsApp-Style File Attachment Card
   */
  const renderFileAttachment = (file, isSelf) => {
    if (!file || !file.url) return null;
    const resolvedUrl = getFileUrl(file.url);
    const category = file.type || 'document';

    // 1. Image View (Click to open Lightbox)
    if (category === 'image') {
      return (
        <div className="relative group/media overflow-hidden rounded-xl bg-black/40 border border-white/[0.08] mb-1.5 cursor-pointer max-w-sm shadow-md">
          <img
            src={resolvedUrl}
            alt={file.name || 'Image'}
            loading="lazy"
            className="max-h-72 w-full object-cover transition duration-300 group-hover/media:scale-105"
            onClick={() => setActiveLightboxImage({ url: resolvedUrl, name: file.name, size: file.size })}
          />
          <div
            onClick={() => setActiveLightboxImage({ url: resolvedUrl, name: file.name, size: file.size })}
            className="absolute inset-0 bg-black/25 opacity-0 group-hover/media:opacity-100 transition flex items-center justify-center gap-2"
          >
            <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur shadow">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      );
    }

    // 2. Video View (Inline Player)
    if (category === 'video') {
      return (
        <div className="overflow-hidden rounded-xl bg-black border border-white/[0.08] mb-1.5 max-w-sm shadow-md">
          <video
            src={resolvedUrl}
            controls
            className="max-h-72 w-full rounded-xl bg-black"
            preload="metadata"
          />
        </div>
      );
    }

    // 3. Audio View (Audio Player Bar)
    if (category === 'audio') {
      return (
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] mb-1.5 max-w-sm space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <Music className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="truncate">{file.name}</span>
          </div>
          <audio src={resolvedUrl} controls className="w-full h-8" preload="metadata" />
        </div>
      );
    }

    // 4. Document View (PDF, Word, Excel, ZIP, etc. WhatsApp Card)
    return (
      <a
        href={`${resolvedUrl}?download=true&name=${encodeURIComponent(file.name || 'file')}`}
        download={file.name}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-3 p-3 rounded-xl border transition mb-1.5 max-w-sm shadow-sm ${
          isSelf
            ? 'bg-blue-700/60 hover:bg-blue-700/80 border-blue-400/30 text-white'
            : 'bg-slate-950/70 hover:bg-slate-950 border-white/[0.08] text-slate-100'
        }`}
      >
        <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate text-white">
            {file.name || 'Document'}
          </div>
          <div className="text-[10px] opacity-75 font-mono flex items-center gap-1.5 mt-0.5">
            <span>{formatBytes(file.size)}</span>
            <span>•</span>
            <span className="uppercase font-bold tracking-wider">
              {file.name ? file.name.split('.').pop() : 'DOC'}
            </span>
          </div>
        </div>
        <div
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition shrink-0"
          title="Download File"
        >
          <Download className="w-4 h-4" />
        </div>
      </a>
    );
  };

  // Empty State: Modern Welcoming Room Card
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 select-none">
        <div className="max-w-md w-full bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl backdrop-blur">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <MessageSquare className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Welcome to Room <span className="font-mono text-blue-400">#{roomId}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              This room is ready for conversation and file sharing. Send a message, attach images or documents, or switch real-time protocols.
            </p>
          </div>

          {onStarterClick && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => onStarterClick('👋 Hello everyone!')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition active:scale-95"
              >
                👋 Say Hello
              </button>
              <button
                onClick={() => onStarterClick('⚡ Testing real-time bi-directional streaming')}
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
              {/* Google Chat Style Header: Avatar + Sender Name + Time */}
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
                  {/* Rich Media / File Attachment */}
                  {msg.file && renderFileAttachment(msg.file, isSelf)}

                  {/* Caption / Text */}
                  {msg.text && (
                    <span className={msg.file ? 'mt-1 block leading-relaxed' : ''}>
                      {msg.text}
                    </span>
                  )}

                  {/* Inline or Footer Tick Indicator for Sent Messages */}
                  {isSelf && (
                    <div className="mt-1 flex items-center justify-end gap-1.5 pt-0.5 text-[10px] text-blue-200/90 border-t border-blue-500/30">
                      <span className="font-mono text-[10px] opacity-80">{timeFormatted}</span>
                      {renderMessageTicks(msg)}
                    </div>
                  )}
                </div>

                {/* Full Transparency Breakdown Card */}
                {isSelf && activeReceiptId === msg.id && renderTransparencyDetails(msg)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Lightbox Modal for Full Image Zoom & Download */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-slate-300">
              <span className="text-xs font-mono font-medium truncate max-w-md">
                {activeLightboxImage.name} ({formatBytes(activeLightboxImage.size)})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`${activeLightboxImage.url}?download=true&name=${encodeURIComponent(activeLightboxImage.name)}`}
                  download={activeLightboxImage.name}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/[0.1] transition"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveLightboxImage(null)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/[0.1] transition"
                  title="Close Lightbox"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={activeLightboxImage.url}
              alt={activeLightboxImage.name}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/[0.1]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
