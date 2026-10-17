import React from 'react';
import { UserAvatar } from '../helpers/profile.jsx';
import { PROTOCOL_MODES } from '../hooks/useChatMode.js';

export function TypingIndicator({ typingUsers = [], mode, isDevMode = false }) {
  if (typingUsers.length === 0) {
    if (isDevMode && mode !== PROTOCOL_MODES.WEBSOCKET) {
      return (
        <div className="max-w-3xl mx-auto w-full px-4 py-1 text-[11px] text-slate-500 italic flex items-center gap-1.5">
          <span>💡</span>
          <span>Typing indicators require WebSockets (Polling cannot keep up with keystroke speed).</span>
        </div>
      );
    }
    return <div className="h-7"></div>;
  }

  const primaryUser = typingUsers[0];
  const formatText = () => {
    if (typingUsers.length === 1) {
      return `${primaryUser} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    }
    return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4">
      <div className="h-7 flex items-center gap-2 text-xs text-slate-300 font-medium animate-fadeIn select-none">
        <UserAvatar name={primaryUser} size="xs" className="ring-1 ring-brand-500 animate-pulse" />
        <span className="text-brand-300">{formatText()}</span>
        <span className="flex items-center gap-0.5 ml-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"></span>
        </span>
      </div>
    </div>
  );
}
