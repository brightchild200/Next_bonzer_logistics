// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { ErrorBox } from './ErrorBox';
import { PasswordInput } from './PasswordInput';

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Please enter your username or email and password.');
      return;
    }

    setError('');
    setLoading(true);

    const identifier = username.trim();
    const isEmail = identifier.includes('@');

    try {
      let emailToUse = identifier;

      // If username provided, look up email
      if (!isEmail) {
        const { data: userRow, error: userLookupError } = await supabase
          .from('users')
          .select('email, username')
          .or(`username.ilike.${identifier},email.ilike.${identifier}`)
          .maybeSingle();

        if (userLookupError) {
          console.error('Username lookup failed:', userLookupError);
        }

        emailToUse = userRow?.email?.trim() || '';

        if (!emailToUse) {
          setLoading(false);
          setError('No matching account found for that username.');
          return;
        }
      }

      // Sign in with Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        // Redirect on successful login
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {/* Glow Line */}
      <div
        className="absolute inset-x-1/4 top-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-70"
        aria-hidden="true"
      />

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
          <div className="w-6 h-6 text-white flex items-center justify-center">
            🚚
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tighter">
          Bonzer<span className="text-orange-500">.</span>
        </h1>
      </div>

      {/* Typography */}
      <div className="space-y-1 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
          Operations Portal
        </p>
        <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
        <p className="text-sm text-gray-400">Sign in to your account</p>
      </div>

      {/* Error Box */}
      {error && <ErrorBox message={error} />}

      {/* Username Field */}
      <div className="space-y-2">
        <label htmlFor="username" className="block text-xs font-medium text-gray-400 tracking-wide">
          Username or email
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username or you@email.com"
            autoComplete="username"
            disabled={loading}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-orange-500/45 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 disabled:opacity-50 transition-all"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-xs font-medium text-gray-400 tracking-wide">
          Password
        </label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPassword={showPassword}
          onToggleShowPassword={() => setShowPassword(!showPassword)}
          disabled={loading}
        />
      </div>

      {/* Forgot Password */}
      <div className="text-center">
        <button
          type="button"
          className="text-xs font-medium text-orange-500/65 hover:text-orange-500 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Authenticating...' : 'Sign in to Bonzer'}
      </button>

      {/* Progress Dots */}
      <div className="flex gap-1 justify-center">
        <div className="w-4 h-1 rounded bg-orange-500 rounded-sm" />
        <div className="w-1 h-1 rounded bg-white/10 rounded-sm" />
        <div className="w-1 h-1 rounded bg-white/10 rounded-sm" />
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <a href="/register" className="font-bold text-orange-500 hover:text-orange-400 transition-colors">
          Create account
        </a>
      </div>
    </form>
  );
}
