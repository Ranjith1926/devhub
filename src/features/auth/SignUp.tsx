/**
 * SignUp.tsx — Registration form (display name + email + password via Firebase Auth).
 */

import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';

interface SignUpProps {
  onSwitchToSignIn: () => void;
}

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with that email already exists';
    case 'auth/invalid-email':
      return 'Enter a valid email address';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/network-request-failed':
      return 'Network error — check your connection';
    default:
      return 'Sign up failed';
  }
}

export function SignUp({ onSwitchToSignIn }: SignUpProps) {
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: displayName.trim() });
      const { uid, email: userEmail } = credential.user;

      // Save user profile to Firestore userDetails collection
      await setDoc(doc(db, 'userDetails', uid), {
        userId: uid,
        displayName: displayName.trim(),
        email: userEmail,
        createdAt: new Date().toISOString(),
      });

      setUser({ uid, email: userEmail, displayName: displayName.trim() });
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
          label="Display name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="animate-auth-form-in" style={{ animationDelay: '110ms' }}>
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

      <div className="animate-auth-form-in" style={{ animationDelay: '160ms' }}>
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Min. 8 characters"
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

      <div className="animate-auth-form-in" style={{ animationDelay: '210ms' }}>
        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="animate-error-in text-xs text-gh-danger bg-gh-danger/10 border border-gh-danger/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="animate-auth-form-in" style={{ animationDelay: '260ms' }}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          icon={<UserPlus size={15} />}
          className="w-full"
        >
          Create account
        </Button>
      </div>

      <p className="animate-auth-form-in text-center text-xs text-gh-fg-muted" style={{ animationDelay: '300ms' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-gh-accent hover:underline transition-colors"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
