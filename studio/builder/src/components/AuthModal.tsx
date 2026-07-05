import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Sparkles, Loader2, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  // Synchronize internal mode with initialMode when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen) {
      try {
        const currentUrl = window.location.href;
        // Do not overwrite the returnUrl if we are currently handling a recovery link
        if (!currentUrl.includes('type=recovery') && !currentUrl.includes('recovery')) {
          localStorage.setItem('supabase_auth_return_url', currentUrl);
          sessionStorage.setItem('supabase_auth_return_url', currentUrl);
        }
      } catch (e) {
        console.warn('Failed to save returnUrl:', e);
      }
    }
  }, [isOpen, mode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const savedUrl = localStorage.getItem('supabase_auth_return_url') || sessionStorage.getItem('supabase_auth_return_url') || window.location.href;

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: savedUrl,
          },
        });

        if (error) throw error;
        
        // Supabase sends a confirmation email or automatically logs in depending on setup.
        if (data?.session) {
          setSuccessMsg('Account created successfully! Welcome to Lifehut Studio.');
          setTimeout(() => {
            onClose();
            window.location.href = savedUrl;
          }, 1500);
        } else {
          setSuccessMsg('Confirmation email sent! Please check your inbox.');
        }
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccessMsg('Logged in successfully!');
        setTimeout(() => {
          onClose();
          window.location.href = savedUrl;
        }, 1000);
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: savedUrl,
        });

        if (error) throw error;

        setSuccessMsg('Password reset link sent to your email.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-md w-full relative overflow-hidden z-10"
          >
            {/* Design accents */}
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

            <div className="p-6 md:p-8">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="mb-6">
                <div className="flex items-center gap-1.5 text-blue-600 font-bold uppercase text-[9px] tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Lifehut Studio™ Account</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {mode === 'login' && 'Sign in to your account'}
                  {mode === 'signup' && 'Create your builder account'}
                  {mode === 'forgot' && 'Reset your password'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {mode === 'login' && 'Resume editing your templates and access purchases.'}
                  {mode === 'signup' && 'Purchase licenses, store progress, and download clean HTML.'}
                  {mode === 'forgot' && 'Enter your email and we will send a password reset link.'}
                </p>
              </div>

              {/* Form alerts */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border-l-2 border-red-500 rounded-r-lg text-red-700 font-medium text-xs leading-relaxed">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border-l-2 border-emerald-500 rounded-r-lg text-emerald-800 font-medium text-xs leading-relaxed">
                  {successMsg}
                </div>
              )}

              {/* Input Fields Form */}
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline outline-none cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : mode === 'forgot' ? (
                    <KeyRound className="w-4 h-4" />
                  ) : null}
                  <span>
                    {loading
                      ? 'Processing...'
                      : mode === 'login'
                      ? 'Sign In'
                      : mode === 'signup'
                      ? 'Create Account'
                      : 'Send Reset Link'}
                  </span>
                </button>
              </form>

              {/* Footer Switch Modes */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                {mode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      onClick={() => setMode('signup')}
                      className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer outline-none hover:underline"
                    >
                      Sign Up Free
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer outline-none hover:underline"
                    >
                      Sign In Instead
                    </button>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
