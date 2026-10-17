import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchCaptchaApi, verifyCaptchaApi } from '../services/api.js';

export function CaptchaModal({ isOpen, onClose, onSuccess }) {
  const [captcha, setCaptcha] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadChallenge = async () => {
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const res = await fetchCaptchaApi();
      if (res.data?.success && res.data?.captchaId) {
        setCaptcha(res.data);
      } else {
        setError('Failed to fetch security challenge');
      }
    } catch (err) {
      setError('Network error connecting to security service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChallenge();
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || !captcha) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await verifyCaptchaApi(captcha.captchaId, answer.trim());
      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess({
            captchaId: captcha.captchaId,
            answer: answer.trim(),
          });
        }, 600);
      } else {
        setError(res.data?.error || 'Incorrect answer. Please try again.');
        loadChallenge();
      }
    } catch (err) {
      setError('Verification service unavailable');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Shield Icon Graphic */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-2 border border-blue-500/20">
          Security Checkpoint
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight">
          Verify You Are Human
        </h2>

        <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          To protect the real-time infrastructure from automated bots and rate exhaustion, please solve this quick verification puzzle.
        </p>

        {/* Challenge Box */}
        <div className="mt-5 p-4 bg-slate-950/80 rounded-xl border border-white/[0.08] relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Math Challenge
            </span>
            <button
              onClick={loadChallenge}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              title="Get another question"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mt-2 text-center py-3">
            {loading ? (
              <div className="text-sm text-slate-400 animate-pulse">Generating challenge...</div>
            ) : captcha ? (
              <div className="text-2xl font-mono font-bold text-white tracking-wider">
                {captcha.question}
              </div>
            ) : (
              <div className="text-sm text-red-400">Could not load question</div>
            )}
          </div>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Verification confirmed! Proceeding...</span>
          </div>
        )}

        {/* Answer Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Your Answer:
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter number or answer"
              autoFocus
              disabled={loading || submitting || success}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 font-mono text-center text-lg"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/[0.08] text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!answer.trim() || submitting || loading || success}
              className="w-2/3 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Confirm & Proceed</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
