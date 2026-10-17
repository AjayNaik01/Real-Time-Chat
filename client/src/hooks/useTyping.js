import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook to manage WhatsApp-style ephemeral typing state.
 *
 * @param {object} options
 * @param {Function} options.sendTyping - Function to emit typing state to server
 * @param {boolean} options.enabled - Whether typing emission is enabled (e.g. true for WS, false for Polling)
 */
export function useTyping({ sendTyping, enabled = true }) {
  const [isSelfTyping, setIsSelfTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const stopTypingTimerRef = useRef(null);
  const peerSafetyTimersRef = useRef(new Map()); // user -> timerId

  /**
   * Called by input `onChange`: Starts typing and resets the 2500ms debounce timer
   */
  const handleTypingKeystroke = useCallback(() => {
    if (!enabled) return;

    if (!isSelfTyping) {
      setIsSelfTyping(true);
      sendTyping?.(true);
    }

    // Reset 2.5s inactivity timer
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
    }

    stopTypingTimerRef.current = setTimeout(() => {
      setIsSelfTyping(false);
      sendTyping?.(false);
    }, 2500);
  }, [enabled, isSelfTyping, sendTyping]);

  /**
   * Called when a message is submitted: instantly cancels timer & emits false
   */
  const handleMessageSent = useCallback(() => {
    if (!enabled) return;
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = null;
    }
    if (isSelfTyping) {
      setIsSelfTyping(false);
      sendTyping?.(false);
    }
  }, [enabled, isSelfTyping, sendTyping]);

  /**
   * Called when an incoming typing frame arrives from the server
   */
  const handleIncomingTypingEvent = useCallback(({ user, isTyping }) => {
    if (!user) return;

    setTypingUsers((prev) => {
      const next = new Set(prev);
      if (isTyping) {
        next.add(user);

        // Defensive fallback: If user abruptly disconnects or closes tab,
        // clear typing indicator after 3.5s automatically.
        if (peerSafetyTimersRef.current.has(user)) {
          clearTimeout(peerSafetyTimersRef.current.get(user));
        }
        const timer = setTimeout(() => {
          setTypingUsers((current) => {
            const updated = new Set(current);
            updated.delete(user);
            return updated;
          });
          peerSafetyTimersRef.current.delete(user);
        }, 3500);

        peerSafetyTimersRef.current.set(user, timer);
      } else {
        next.delete(user);
        if (peerSafetyTimersRef.current.has(user)) {
          clearTimeout(peerSafetyTimersRef.current.get(user));
          peerSafetyTimersRef.current.delete(user);
        }
      }
      return next;
    });
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      peerSafetyTimersRef.current.forEach((t) => clearTimeout(t));
      peerSafetyTimersRef.current.clear();
    };
  }, []);

  return {
    isSelfTyping,
    typingUsers: Array.from(typingUsers),
    handleTypingKeystroke,
    handleMessageSent,
    handleIncomingTypingEvent,
  };
}
