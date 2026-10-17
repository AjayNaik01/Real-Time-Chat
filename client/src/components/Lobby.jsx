import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Key,
  X,
} from 'lucide-react';
import { createRoomApi, getRoomApi, verifyRoomPasswordApi } from '../services/api.js';
import { CaptchaModal } from './CaptchaModal.jsx';

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
  if (pwd.length < 6) return { score: 1, label: 'Too Weak (< 6 chars)', color: 'bg-red-500' };
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  const lengthBonus = pwd.length >= 8;

  const count = [hasLetter, hasNumber, hasSpecial, lengthBonus].filter(Boolean).length;
  if (count >= 3 && pwd.length >= 8) {
    return { score: 3, label: 'Strong Security', color: 'bg-emerald-500' };
  }
  return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
}

export function Lobby({
  onJoinRoom,
  onTest404,
  onTest500,
  initialRoomCode = '',
  initialNickname = '',
  autoUnlockPrivate = false,
  onClearInitial,
}) {
  const [nickname, setNickname] = useState(initialNickname || '');
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [pendingCaptcha, setPendingCaptcha] = useState(null);

  // Private Room Creation State
  const [isPrivateCreate, setIsPrivateCreate] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Private Room Join Modal State
  const [privateRoomModalOpen, setPrivateRoomModalOpen] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinPasswordError, setJoinPasswordError] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [targetJoinRoomId, setTargetJoinRoomId] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
    }
    if (initialNickname) {
      setNickname(initialNickname);
    }
    if (autoUnlockPrivate && initialRoomCode) {
      setTargetJoinRoomId(initialRoomCode.toUpperCase());
      setJoinPassword('');
      setJoinPasswordError('');
      setPrivateRoomModalOpen(true);
      if (onClearInitial) onClearInitial();
    }
  }, [initialRoomCode, initialNickname, autoUnlockPrivate]);

  const passwordStrength = getPasswordStrength(createPassword);

  const handleCreateNewRoom = async (e, verifiedCaptcha = null) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!nickname.trim()) {
      setError('Please enter your name or nickname to continue');
      return;
    }

    if (isPrivateCreate) {
      if (!createPassword || createPassword.trim().length < 6) {
        setError('Private rooms require a strong password (minimum 6 characters).');
        return;
      }
    }

    setError('');
    setIsCreating(true);

    try {
      const result = await createRoomApi(
        null,
        verifiedCaptcha || pendingCaptcha,
        {
          isPrivate: isPrivateCreate,
          password: isPrivateCreate ? createPassword.trim() : '',
        }
      );

      if (result.status === 429) {
        setError(`Rate limit reached: Server returned HTTP 429 (${result.data?.error || 'Too many requests'}). Please complete security check.`);
        setCaptchaModalOpen(true);
        return;
      }

      if (result.ok && result.data.room) {
        onJoinRoom(
          result.data.room.id,
          nickname.trim(),
          isPrivateCreate ? createPassword.trim() : '',
          isPrivateCreate
        );
      } else {
        setError(result.data?.error || 'Failed to create room. Is the backend server running?');
      }
    } catch (err) {
      setError('Cannot connect to chat server. Please verify backend is running.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCaptchaSuccess = async (captchaData) => {
    setCaptchaModalOpen(false);
    setPendingCaptcha(captchaData);
    await handleCreateNewRoom(null, captchaData);
  };

  const handleJoinExistingRoom = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter your name or nickname to continue');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    const cleanRoom = roomCode.trim().toUpperCase();
    setError('');

    // Check if room exists and whether it requires password
    try {
      const res = await getRoomApi(cleanRoom);
      if (res.status === 404) {
        setError(`Room ${cleanRoom} does not exist. Check code or create a new room.`);
        return;
      }

      if (res.ok && res.data.room?.isPrivate) {
        // Room is private! Prompt for password
        setTargetJoinRoomId(cleanRoom);
        setJoinPassword('');
        setJoinPasswordError('');
        setPrivateRoomModalOpen(true);
        return;
      }

      // Public room: join without password
      onJoinRoom(cleanRoom, nickname.trim(), '', false);
    } catch (err) {
      setError('Cannot verify room security with server. Please check your connection.');
    }
  };

  const handleConfirmJoinPrivateRoom = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setJoinPasswordError('Please enter your nickname / handle to join.');
      return;
    }
    if (!joinPassword.trim()) {
      setJoinPasswordError('Please enter the room password to join.');
      return;
    }

    setIsVerifyingPassword(true);
    setJoinPasswordError('');

    try {
      const res = await verifyRoomPasswordApi(targetJoinRoomId, joinPassword.trim());
      if (res.ok && res.data.verified) {
        setPrivateRoomModalOpen(false);
        onJoinRoom(targetJoinRoomId, nickname.trim(), joinPassword.trim(), true);
      } else {
        setJoinPasswordError(res.data?.error || 'Incorrect password. Access denied.');
      }
    } catch (err) {
      setJoinPasswordError('Cannot verify password. Server unreachable.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between items-center p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Top Navbar */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Realtime Chat Lab
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="w-full text-center mt-2 sm:mt-6 mb-8 sm:mb-10">
        <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 shadow-lg">
          <MessageSquare className="w-7 h-7" />
        </div>

        <div className="block mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-white/[0.08] text-slate-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            Real-Time Protocols & State Architecture
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Real-Time Chat & Protocol Lab
        </h1>
        <p className="text-slate-400 mt-3 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Experience and compare <span className="text-white font-medium">HTTP Manual Fetch</span>, <span className="text-white font-medium">Short Polling</span>, and <span className="text-blue-400 font-semibold">WebSockets</span> live under the hood.
        </p>
      </div>

      {/* Main Card Grid: Step Architecture */}
      <div className="w-full max-w-4xl bg-slate-900/50 border border-white/[0.08] rounded-2xl shadow-2xl p-6 sm:p-10 backdrop-blur">
        {/* Step 1: Nickname Input */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Step 1 • Your Handle
            </span>
            <span className="text-[11px] text-slate-500">Pick any nickname</span>
          </div>
          <input
            type="text"
            placeholder="Enter your name (e.g. Ajay, Alice, Bob)..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-5 py-3.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-base focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition shadow-inner"
          />
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span> <span>{error}</span>
            </div>
            {error.includes('Rate limit') && (
              <button
                onClick={() => setCaptchaModalOpen(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold shrink-0 transition"
              >
                Solve CAPTCHA
              </button>
            )}
          </div>
        )}

        {/* Step 2: Create vs Join Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Option A: Create Room Card */}
          <div className="bg-slate-950/50 border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between hover:border-white/[0.14] transition group">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Option A
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                Create New Room
              </h2>
              {/* Privacy Mode Selector */}
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Room Privacy:
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-white/[0.08] rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrivateCreate(false);
                      setCreatePassword('');
                    }}
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                      !isPrivateCreate
                        ? 'bg-blue-600 text-white font-semibold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Public Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivateCreate(true)}
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                      isPrivateCreate
                        ? 'bg-amber-600 text-white font-semibold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Private Room
                  </button>
                </div>
              </div>

              {/* Password Input for Private Room */}
              {isPrivateCreate ? (
                <div className="mb-5 p-3.5 bg-slate-900/90 border border-amber-500/25 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Set Room Password
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Min 6 chars
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      placeholder="Enter strong password (min 6 chars)..."
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-white/[0.12] rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {createPassword && (
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Strength:</span>
                        <span
                          className={
                            passwordStrength.score === 3
                              ? 'text-emerald-400 font-bold'
                              : passwordStrength.score === 2
                              ? 'text-amber-400 font-bold'
                              : 'text-red-400 font-bold'
                          }
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  🌐 <span className="text-slate-300 font-medium">Public room:</span> Anyone with the room ID can enter directly without a password.
                </p>
              )}
            </div>
            <button
              onClick={handleCreateNewRoom}
              disabled={isCreating}
              className={`w-full py-3 px-6 rounded-full font-medium text-sm flex items-center justify-center gap-2 shadow transition active:scale-98 disabled:opacity-50 ${
                isPrivateCreate ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isCreating
                ? 'Creating Room...'
                : isPrivateCreate
                ? 'Create Private Room'
                : 'Create & Enter Room'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Option B: Join Room Card */}
          <div className="bg-slate-950/50 border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between hover:border-white/[0.14] transition group">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-3">
                <Users className="w-3.5 h-3.5" /> Option B
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                Join Existing Room
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 mb-3 leading-relaxed">
                Enter an invite code to test two browser tabs side-by-side in the same room.
              </p>
              <input
                type="text"
                placeholder="e.g. ROOM-482"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl text-white text-base sm:text-sm uppercase placeholder-slate-600 focus:outline-none focus:border-blue-500/60 mb-6 font-mono"
              />
            </div>
            <button
              onClick={handleJoinExistingRoom}
              className="w-full py-3 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2 border border-white/[0.08] hover:border-white/[0.14] transition active:scale-98"
            >
              Join Room
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl my-8">
        <div className="bg-slate-900/40 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Fast & Low Latency</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Sub-15ms message arrival with persistent bi-directional WebSockets.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Full Transparency</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Sent (✓), Delivered (✓✓), and Seen (✓✓ blue) receipts with reader avatars.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Protocol Comparison</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Compare Manual HTTP, 2s Polling, and WebSockets live under the hood.
            </p>
          </div>
        </div>
      </div>

      {/* Educational Error Simulation & Testing Footbar */}
      <div className="w-full max-w-4xl p-3.5 sm:p-4 rounded-2xl bg-slate-900/30 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Test Error Scenarios:</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onTest404}
            className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/[0.08] text-xs transition active:scale-95"
          >
            Test 404 Page
          </button>
          <button
            onClick={onTest500}
            className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition active:scale-95"
          >
            Simulate 500 Error
          </button>
          <button
            onClick={() => setCaptchaModalOpen(true)}
            className="px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs transition active:scale-95"
          >
            Test CAPTCHA
          </button>
        </div>
      </div>

      {/* Private Room Unlock / Password Modal */}
      {privateRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>

            {/* Close Button */}
            <button
              onClick={() => {
                setPrivateRoomModalOpen(false);
                setJoinPassword('');
                setJoinPasswordError('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Lock Graphic */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
              <Lock className="w-7 h-7" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2 border border-amber-500/20">
              Private Room Security
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Password Required
            </h2>

            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Room <span className="font-mono font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">{targetJoinRoomId}</span> is private. Please enter the room password set by the host to join.
            </p>

            <form onSubmit={handleConfirmJoinPrivateRoom} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Your Handle / Nickname
                </label>
                <input
                  type="text"
                  placeholder="Enter your name (e.g. Bob, Alice)..."
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (joinPasswordError) setJoinPasswordError('');
                  }}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Room Password
                </label>
                <div className="relative">
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    placeholder="Enter room password..."
                    value={joinPassword}
                    onChange={(e) => {
                      setJoinPassword(e.target.value);
                      if (joinPasswordError) setJoinPasswordError('');
                    }}
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-950/80 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 pr-11 transition shadow-inner font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPassword(!showJoinPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    tabIndex={-1}
                  >
                    {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {joinPasswordError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{joinPasswordError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrivateRoomModalOpen(false);
                    setJoinPassword('');
                    setJoinPasswordError('');
                  }}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPassword || !joinPassword.trim()}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {isVerifyingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Unlock & Join</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic CAPTCHA Modal */}
      <CaptchaModal
        isOpen={captchaModalOpen}
        onClose={() => setCaptchaModalOpen(false)}
        onSuccess={handleCaptchaSuccess}
      />
    </div>
  );
}
