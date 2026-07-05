import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Lock, Loader2, KeyRound, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

interface ResetPasswordProps {
  onSuccess: () => void;
}

export default function ResetPassword({ onSuccess }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic Validation
    if (!password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccessMsg('Your password has been successfully updated!');
      
      // Delay before trigger success handler
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 select-none">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-md w-full relative overflow-hidden z-10"
      >
        {/* Top Gradient Banner Accent */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        <div className="p-6 md:p-8">
          {/* Header Title & Branding */}
          <div className="mb-6">
            <div className="flex items-center gap-1.5 text-blue-600 font-bold uppercase text-[9px] tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Lifehut Studio™ Account Security</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Create New Password
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Please choose a strong password to secure your builder workspace.
            </p>
          </div>

          {/* Form alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border-l-2 border-red-500 rounded-r-lg text-red-700 font-medium text-xs leading-relaxed flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border-l-2 border-emerald-500 rounded-r-lg text-emerald-800 font-medium text-xs leading-relaxed flex gap-2 items-start">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Input Fields Form */}
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                New Password
              </label>
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

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>
                {loading ? 'Updating Password...' : 'Reset Password'}
              </span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
