import React, { useState, useEffect } from 'react';
import { Lobby } from './components/Lobby.jsx';
import { ChatRoom } from './components/ChatRoom.jsx';
import { NotFound } from './components/NotFound.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { AdminPortal } from './components/AdminPortal.jsx';
import { getRoomApi } from './services/api.js';

function AppContent() {
  const [roomId, setRoomId] = useState('');
  const [user, setUser] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [is404, setIs404] = useState(false);
  const [missingRoomId, setMissingRoomId] = useState('');
  const [simulateCrash, setSimulateCrash] = useState(false);

  // Deep-link & invitation initial state for Lobby
  const [initialRoomCode, setInitialRoomCode] = useState('');
  const [initialNickname, setInitialNickname] = useState('');
  const [autoUnlockPrivate, setAutoUnlockPrivate] = useState(false);

  // Hidden Admin Portal State (Never exposed in public UI navigation)
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === 'true' || window.location.pathname === '/admin';
  });

  // Secret Hotkey Listener: Ctrl + Shift + A (or Cmd + Shift + A) to toggle admin terminal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdmin((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If user requests a 500 crash test, deliberately throw here to trigger ErrorBoundary
  if (simulateCrash) {
    throw new Error('Simulated Production Uncaught Error (STATUS_BREAKPOINT 500)');
  }

  // Hydrate from URL query parameters on initial page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const userParam = params.get('user');

    if (roomParam) {
      const cleanRoom = roomParam.toUpperCase();
      // Verify room existence & privacy status with server
      getRoomApi(cleanRoom)
        .then((res) => {
          if (res.status === 404) {
            setIs404(true);
            setMissingRoomId(cleanRoom);
          } else {
            const isRoomPrivate = Boolean(res.data?.room?.isPrivate);
            if (isRoomPrivate) {
              // SECURITY: Never automatically enter a private room without password!
              // Pre-fill Lobby and auto-open the Private Room Password modal
              setInitialRoomCode(cleanRoom);
              setInitialNickname(userParam || '');
              setAutoUnlockPrivate(true);
              setIsPrivate(true);
            } else {
              // Public Room: enter directly if nickname is provided, otherwise prompt in Lobby
              if (userParam && userParam.trim()) {
                setRoomId(cleanRoom);
                setUser(userParam.trim());
                setIsPrivate(false);
                setRoomPassword('');
              } else {
                setInitialRoomCode(cleanRoom);
                setInitialNickname('');
              }
            }
          }
        })
        .catch(() => {
          setInitialRoomCode(cleanRoom);
          setInitialNickname(userParam || '');
        });
    }
  }, []);

  const handleJoinRoom = async (selectedRoomId, selectedUser, password = '', roomIsPrivate = false) => {
    const cleanRoom = selectedRoomId.toUpperCase();

    // Verify room existence
    try {
      const res = await getRoomApi(cleanRoom);
      if (res.status === 404) {
        setIs404(true);
        setMissingRoomId(cleanRoom);
        return;
      }
      setIsPrivate(Boolean(res.data?.room?.isPrivate || roomIsPrivate));
    } catch (e) {
      setIsPrivate(Boolean(roomIsPrivate));
    }

    setRoomId(cleanRoom);
    setUser(selectedUser);
    setRoomPassword(password);
    setIs404(false);

    // Update browser URL so tab can be refreshed without losing room
    const url = new URL(window.location.href);
    url.searchParams.set('room', cleanRoom);
    url.searchParams.set('user', selectedUser);
    window.history.pushState({}, '', url);
  };

  const handleSwitchUser = (newUser, newPassword = '') => {
    setUser(newUser);
    if (newPassword) {
      setRoomPassword(newPassword);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('user', newUser);
    window.history.pushState({}, '', url);
  };

  const handleLeaveRoom = () => {
    setRoomId('');
    setRoomPassword('');
    setIsPrivate(false);
    setIs404(false);
    setInitialRoomCode('');
    setInitialNickname('');
    setAutoUnlockPrivate(false);
    // Remove query params
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('user');
    window.history.pushState({}, '', url);
  };

  const handleReturnHome = () => {
    setRoomId('');
    setRoomPassword('');
    setIsPrivate(false);
    setIs404(false);
    setMissingRoomId('');
    setInitialRoomCode('');
    setInitialNickname('');
    setAutoUnlockPrivate(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('user');
    window.history.pushState({}, '', url);
  };

  const handleExitAdmin = () => {
    setIsAdmin(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    window.history.pushState({}, '', url.pathname === '/admin' ? '/' : url);
  };

  const handleSimulate404 = () => {
    setIs404(true);
    setMissingRoomId('ROOM-NOT-FOUND-DEMO');
  };

  const handleSimulate500 = () => {
    setSimulateCrash(true);
  };

  // 1. Secret Admin Command Center View
  if (isAdmin) {
    return <AdminPortal onExit={handleExitAdmin} />;
  }

  // 2. 404 Room Not Found View
  if (is404) {
    return <NotFound roomId={missingRoomId} onReturnHome={handleReturnHome} />;
  }

  // 3. Active Chat Room View
  if (roomId && user) {
    return (
      <ChatRoom
        roomId={roomId}
        user={user}
        roomPassword={roomPassword}
        isPrivate={isPrivate}
        onLeaveRoom={handleLeaveRoom}
        onSwitchUser={handleSwitchUser}
      />
    );
  }

  // 4. Public Lobby View (Default)
  return (
    <Lobby
      onJoinRoom={handleJoinRoom}
      onTest404={handleSimulate404}
      onTest500={handleSimulate500}
      initialRoomCode={initialRoomCode}
      initialNickname={initialNickname}
      autoUnlockPrivate={autoUnlockPrivate}
      onClearInitial={() => setAutoUnlockPrivate(false)}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
