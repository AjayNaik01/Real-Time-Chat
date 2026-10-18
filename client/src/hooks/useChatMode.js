import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchMessagesApi, postMessageApi, markDeliveredApi, markReadApi } from '../services/api.js';
import { WebSocketClient } from '../services/websocket.js';

export const PROTOCOL_MODES = {
  MANUAL: 'MANUAL',
  POLLING: 'POLLING',
  WEBSOCKET: 'WEBSOCKET',
};

export function useChatMode(roomId, user, roomPassword = '') {
  const [mode, setMode] = useState(PROTOCOL_MODES.WEBSOCKET);
  const [messages, setMessages] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connected' | 'connecting' | 'disconnected'

  // Polling countdown (in seconds, e.g. 2.0 -> 0.0)
  const [pollCountdown, setPollCountdown] = useState(2.0);

  // Network Inspector Metrics
  const [metrics, setMetrics] = useState({
    httpRequests: 0,
    httpBytes: 0,
    wsFrames: 0,
    wsBytes: 0,
    lastLatency: 0,
    lastAction: 'Initialized',
  });

  const wsClientRef = useRef(null);
  const pollTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Helper to record HTTP metric
  const recordHttpMetric = useCallback((result, actionName = 'HTTP Request') => {
    setMetrics((prev) => ({
      ...prev,
      httpRequests: prev.httpRequests + 1,
      httpBytes: prev.httpBytes + (result.bytesSent || 0) + (result.bytesReceived || 0),
      lastLatency: result.latency || 0,
      lastAction: actionName,
    }));
  }, []);

  // Helper to record WS metric
  const recordWsMetric = useCallback((bytes, actionName = 'WS Frame') => {
    setMetrics((prev) => ({
      ...prev,
      wsFrames: prev.wsFrames + 1,
      wsBytes: prev.wsBytes + bytes,
      lastAction: actionName,
    }));
  }, []);

  /**
   * Mark messages as read by current user
   */
  const markMessagesAsRead = useCallback(
    async (messageIds) => {
      if (!roomId || !user || !messageIds || messageIds.length === 0) return;

      if (mode === PROTOCOL_MODES.WEBSOCKET && wsClientRef.current) {
        wsClientRef.current.sendRead(messageIds);
      } else {
        try {
          const result = await markReadApi(roomId, messageIds, user);
          if (result.ok) {
            recordHttpMetric(result, 'POST /messages/read');
            // Optimistically update local message read state
            setMessages((prev) =>
              prev.map((m) => {
                if (messageIds.includes(m.id)) {
                  const alreadyRead = m.readBy?.some(
                    (r) => r.user.toLowerCase() === user.toLowerCase()
                  );
                  if (!alreadyRead) {
                    return {
                      ...m,
                      status: 'read',
                      readBy: [...(m.readBy || []), { user, time: Date.now() }],
                    };
                  }
                }
                return m;
              })
            );
          }
        } catch (err) {
          console.error('Failed to mark messages read via HTTP:', err);
        }
      }
    },
    [roomId, user, mode, recordHttpMetric]
  );

  /**
   * Fetch messages via HTTP (used by Manual and Polling)
   */
  const fetchMessagesHttp = useCallback(
    async (silent = false) => {
      if (!roomId) return;
      if (!silent) setIsFetching(true);

      try {
        const result = await fetchMessagesApi(roomId, 0, roomPassword);
        if (result.ok && result.data.messages) {
          setMessages(result.data.messages);
          setLastFetchedAt(Date.now());
          recordHttpMetric(result, silent ? 'Poll GET /messages' : 'Manual GET /messages');

          // If document is visible, mark any unread messages from others as read
          if (document.visibilityState === 'visible' && user) {
            const unreadIds = result.data.messages
              .filter(
                (m) =>
                  m.sender?.toLowerCase() !== user.toLowerCase() &&
                  (!m.readBy || !m.readBy.some((r) => r.user.toLowerCase() === user.toLowerCase()))
              )
              .map((m) => m.id);

            if (unreadIds.length > 0) {
              markReadApi(roomId, unreadIds, user).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('Fetch messages error:', err);
      } finally {
        if (!silent) setIsFetching(false);
      }
    },
    [roomId, user, roomPassword, recordHttpMetric]
  );

  /**
   * Post a message (behavior depends on active mode, supports optional file attachments)
   */
  const sendMessage = useCallback(
    async (text, file = null) => {
      if ((!text || !text.trim()) && !file) return;
      if (!roomId) return;

      const trimmedText = text ? text.trim() : '';

      if (mode === PROTOCOL_MODES.WEBSOCKET && wsClientRef.current) {
        // Send via WebSocket frame
        const sent = wsClientRef.current.sendChatMessage(trimmedText, file);
        if (sent) {
          setMetrics((prev) => ({ ...prev, lastAction: 'WS Send Message' }));
        }
      } else {
        // Send via HTTP POST
        const source = mode === PROTOCOL_MODES.POLLING ? 'POLLING' : 'HTTP';
        try {
          const result = await postMessageApi(roomId, {
            sender: user,
            text: trimmedText,
            source,
            password: roomPassword,
            file,
          });
          if (result.ok && result.data?.message) {
            recordHttpMetric(result, `POST /messages (${source})`);
            // In manual mode, we also update our local message list immediately for good UX
            setMessages((prev) => [...prev, result.data.message]);
          }
        } catch (err) {
          console.error('Failed to post message:', err);
        }
      }
    },
    [mode, roomId, user, roomPassword, recordHttpMetric]
  );

  /**
   * Send typing signal (only active in WebSocket mode)
   */
  const sendTyping = useCallback(
    (isTyping) => {
      if (mode === PROTOCOL_MODES.WEBSOCKET && wsClientRef.current) {
        wsClientRef.current.sendTyping(isTyping);
      }
    },
    [mode]
  );

  // Initialize and manage WebSocket client instance
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    const client = new WebSocketClient(wsUrl);
    wsClientRef.current = client;

    const unsubs = [
      client.on('status', (st) => setWsStatus(st)),
      client.on('presence', ({ members }) => setOnlineMembers(members || [])),
      client.on('joined', ({ members }) => setOnlineMembers(members || [])),
      client.on('chat_message', ({ data }) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });

        // If message is from someone else, report delivery immediately
        if (user && data.sender?.toLowerCase() !== user.toLowerCase()) {
          client.sendDelivered(data.id);

          // If document is visible, also report read immediately
          if (document.visibilityState === 'visible') {
            client.sendRead(data.id);
          }
        }
      }),
      client.on('msg_status_update', ({ data }) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.id ? { ...m, ...data } : m))
        );
      }),
      client.on('metric_frame', ({ bytes, direction }) => {
        recordWsMetric(bytes, `WS Frame ${direction.toUpperCase()}`);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
      client.disconnect();
    };
  }, [user, recordWsMetric]);

  // Handle Mode transitions (Manual vs Polling vs WebSocket)
  useEffect(() => {
    clearInterval(pollTimerRef.current);
    clearInterval(countdownTimerRef.current);

    if (mode === PROTOCOL_MODES.WEBSOCKET) {
      wsClientRef.current?.connect(roomId, user, roomPassword);
      fetchMessagesHttp(true);
    } else if (mode === PROTOCOL_MODES.POLLING) {
      wsClientRef.current?.disconnect();
      setOnlineMembers([]);
      fetchMessagesHttp(true);

      let remaining = 2.0;
      setPollCountdown(2.0);

      countdownTimerRef.current = setInterval(() => {
        remaining -= 0.1;
        if (remaining <= 0) {
          remaining = 2.0;
        }
        setPollCountdown(parseFloat(remaining.toFixed(1)));
      }, 100);

      pollTimerRef.current = setInterval(() => {
        fetchMessagesHttp(true);
      }, 2000);
    } else if (mode === PROTOCOL_MODES.MANUAL) {
      wsClientRef.current?.disconnect();
      setOnlineMembers([]);
      fetchMessagesHttp(true);
    }

    return () => {
      clearInterval(pollTimerRef.current);
      clearInterval(countdownTimerRef.current);
    };
  }, [mode, roomId, user, roomPassword, fetchMessagesHttp]);

  return {
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
    wsClient: wsClientRef.current,
  };
}
