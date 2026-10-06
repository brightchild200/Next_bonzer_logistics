// components/auth/PasswordInput.tsx
'use client';

import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  disabled?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  showPassword,
  onToggleShowPassword,
  disabled,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder="Enter your password"
        autoComplete="current-password"
        disabled={disabled}
        className="w-full pl-12 pr-12 py-3 bg-white/5 border border-orange-500/45 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 disabled:opacity-50 transition-all"
      />
      <button
        type="button"
        onClick={onToggleShowPassword}
        disabled={disabled}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 disabled:opacity-50 transition-colors"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
