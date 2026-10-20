import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Eye, EyeOff, ShieldCheck, Mail, Lock, Check, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      setLoading(true);
      if (tab === 'login') {
        await login({ email, password });
        onClose();
      } else if (tab === 'register') {
        if (password.length < 8) {
          setError('Password must be at least 8 characters long');
          return;
        }
        if (!/[A-Za-z]/.test(password)) {
          setError('Password must contain at least one letter');
          return;
        }
        if (!/[0-9]/.test(password)) {
          setError('Password must contain at least one number');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await register({ email, password, confirmPassword });
        onClose();
      } else if (tab === 'forgot') {
        const res = await api.forgotPassword(email);
        setSuccessMessage(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        tab === 'login'
          ? 'Sign in to SpendWise'
          : tab === 'register'
          ? 'Create SpendWise Account'
          : 'Reset Your Password'
      }
      description="Authentication is stored in Neon PostgreSQL. Financial data NEVER leaves your device or private Drive."
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Navigation switcher */}
        <div className="flex border-b border-surface-border text-xs">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
              tab === 'login'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
              tab === 'register'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          {tab !== 'forgot' && (
            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Password requirements and strength on register */}
              {tab === 'register' && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${password.length >= 8 ? 'text-emerald-400' : 'text-slate-600'}`} />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Za-z]/.test(password) ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${/[A-Za-z]/.test(password) ? 'text-emerald-400' : 'text-slate-600'}`} />
                      <span>Contains letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${/[0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-600'}`} />
                      <span>Contains number</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${confirmPassword && password === confirmPassword ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${confirmPassword && password === confirmPassword ? 'text-emerald-400' : 'text-slate-600'}`} />
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'register' && (
            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />
          )}

          {tab === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setTab('forgot'); setError(''); }}
                className="text-xs text-emerald-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            {tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : 'Send Reset Link'}
          </Button>

          {tab === 'forgot' && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setTab('login'); setError(''); }}
              className="w-full text-xs"
            >
              Back to Sign In
            </Button>
          )}
        </form>

        <div className="pt-2 border-t border-surface-border text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero financial history uploaded to cloud servers.</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};
