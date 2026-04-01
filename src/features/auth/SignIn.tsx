/**
 * SignIn.tsx — Sign-in form (email + password via Firebase Auth).
 */

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';

interface SignInProps {
  onSwitchToSignUp: () => void;
}

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/invalid-email':
      return 'Enter a valid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts — try again later';
    case 'auth/network-request-failed':
      return 'Network error — check your connection';
    default:
      return 'Sign in failed';
  }
}

export function SignIn({ onSwitchToSignUp }: SignInProps) {
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const { uid, email: userEmail, displayName } = credential.user;
      setUser({ uid, email: userEmail, displayName });
    } catch (err: any) {
      setError(firebaseErrorMessage(err?.code ?? ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

      <div className="animate-auth-form-in" style={{ animationDelay: '60ms' }}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="animate-auth-form-in" style={{ animationDelay: '120ms' }}>
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          rightElement={
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="flex items-center justify-center w-7 h-7 text-gh-fg-subtle hover:text-gh-fg transition-colors"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
      </div>

      {error && (
        <p className="animate-error-in text-xs text-gh-danger bg-gh-danger/10 border border-gh-danger/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="animate-auth-form-in" style={{ animationDelay: '180ms' }}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          icon={<LogIn size={15} />}
          className="w-full"
        >
          Sign in
        </Button>
      </div>

      <p className="animate-auth-form-in text-center text-xs text-gh-fg-muted" style={{ animationDelay: '220ms' }}>
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-gh-accent hover:underline transition-colors"
        >
          Create one
        </button>
      </p>
    </form>
  );
}
