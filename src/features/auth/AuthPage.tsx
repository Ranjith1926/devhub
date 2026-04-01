/**
 * AuthPage.tsx — Centred card with smooth entrance, floating logo,
 * animated gradient blobs, and staggered form switch transitions.
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const setUser = useAuthStore((s) => s.setUser);

  // Keep Zustand in sync with Firebase's own session state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, [setUser]);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-gh-canvas overflow-hidden">

      {/* ── Animated background blobs ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Primary accent blob – top centre */}
        <div className="animate-[blobDrift_14s_ease-in-out_infinite_alternate] absolute -top-48 left-1/2 w-[700px] h-[700px] rounded-full bg-gh-accent/[0.07] blur-[80px]" />
        {/* Secondary purple blob – bottom right */}
        <div className="animate-[blobDrift2_18s_ease-in-out_infinite_alternate] absolute bottom-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full bg-gh-done/[0.06] blur-[70px]" />
        {/* Tertiary green blob – left */}
        <div className="animate-[blobDrift3_22s_ease-in-out_infinite_alternate] absolute top-[30%] -left-40 w-[400px] h-[400px] rounded-full bg-gh-success/[0.05] blur-[60px]" />
      </div>

      {/* ── Card ── */}
      <div className="animate-auth-card-in relative w-full max-w-sm mx-4 z-10">

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8 gap-3">
          {/* Floating logo with glow ring */}
          <div className="animate-[logoFloat_3.5s_ease-in-out_infinite] relative">
            <div className="absolute inset-0 rounded-2xl bg-gh-accent/30 blur-xl scale-110 opacity-60" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-gh-accent to-blue-600 flex items-center justify-center shadow-2xl shadow-gh-accent/30">
              <span className="text-white font-bold text-2xl leading-none select-none">D</span>
            </div>
          </div>

          <div className="text-center transition-all duration-300">
            <h1 className="text-2xl font-bold text-gh-fg tracking-tight">DevHub</h1>
            <p
              key={mode}
              className="animate-fade-in text-sm text-gh-fg-muted mt-1"
            >
              {mode === 'signin' ? 'Welcome back 👋' : 'Create your account'}
            </p>
          </div>
        </div>

        {/* Card panel */}
        <div className="relative bg-gh-overlay/90 backdrop-blur-sm border border-gh-border rounded-2xl p-6 shadow-2xl shadow-black/20 transition-all duration-300">
          {/* Top edge glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-gh-accent/40 to-transparent rounded-full" />

          {/* Mode-switch: re-mount the form on each switch so fields animate in */}
          <div key={mode} className="animate-auth-form-in">
            {mode === 'signin' ? (
              <SignIn onSwitchToSignUp={() => setMode('signup')} />
            ) : (
              <SignUp onSwitchToSignIn={() => setMode('signin')} />
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-gh-fg-subtle animate-fade-in">
          Your data is stored locally on this device.
        </p>
      </div>
    </div>
  );
}

