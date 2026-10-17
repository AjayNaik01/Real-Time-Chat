import React, { useState } from 'react';
import { Send } from 'lucide-react';

export function MessageInput({ onSendMessage, onTypingKeystroke, onMessageSent, disabled = false }) {
  const [text, setText] = useState('');

  const handleChange = (e) => {
    setText(e.target.value);
    onTypingKeystroke?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;

    onSendMessage(text.trim());
    onMessageSent?.();
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-slate-950/80 border-t border-white/[0.06] p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 z-10 backdrop-blur">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto w-full flex items-center gap-2.5"
      >
        <div className="flex-1 flex items-center bg-slate-900/80 border border-white/[0.08] hover:border-white/[0.14] focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/15 rounded-2xl px-4 py-1 transition shadow-sm">
          <input
            type="text"
            placeholder="Type a message (Enter to send)..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full bg-transparent py-2.5 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!text.trim() || disabled}
          aria-label="Send Message"
          className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-semibold transition flex items-center justify-center shadow shrink-0 active:scale-95"
        >
          <Send className="w-4 h-4 -ml-0.5" />
        </button>
      </form>
    </div>
  );
}
