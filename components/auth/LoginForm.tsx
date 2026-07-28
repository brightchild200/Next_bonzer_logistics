// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Provide more user-friendly error messages
        let errorMessage = signInError.message;
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again. Make sure you have registered first.';
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in.';
        } else if (signInError.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes.';
        }
        setError(errorMessage);
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
    const { data: authContext, error: authContextError } =
  await supabase.rpc('get_my_auth_context');

console.log('BONZER AUTH CONTEXT:', authContext);
console.log('BONZER AUTH CONTEXT ERROR:', authContextError);
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      {/* ========================================================
          HEADER
          ======================================================== */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 mb-2">
          Welcome back
        </h1>
        <p className="text-gray-600 text-sm">
          Sign in to your Bonzer account
        </p>
      </div>

      {/* ========================================================
          ERROR MESSAGE
          ======================================================== */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ========================================================
          EMAIL FIELD
          ======================================================== */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-gray-900">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* ========================================================
          PASSWORD FIELD
          ======================================================== */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showPassword ? '👁' : '👁‍🗨'}
          </button>
        </div>
      </div>

{/* ========================================================
          FORGOT PASSWORD LINK
          ======================================================== */}
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <label htmlFor="remember" className="text-sm text-gray-600">
            Remember me
          </label>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {/* ========================================================
          SUBMIT BUTTON
          ======================================================== */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      {/* ========================================================
          SIGN UP LINK
          ======================================================== */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-gray-600 text-sm">
          Don't have an account?{' '}
          <a
            href="/register"
            className="font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            Sign up
          </a>
        </p>
      </div>
    </form>
  );
}