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
    <div className="relative group">
      <style>{`
        .glass-password-input {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1.5px solid rgba(249, 115, 22, 0.4);
          transition: all 0.3s ease;
        }

        .glass-password-input:focus {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(249, 115, 22, 0.7);
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.2);
          outline: none;
        }

        .glass-password-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
      `}</style>

      {/* Lock Icon */}
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-400 transition-colors" />

      {/* Password Input */}
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder="Enter your password"
        autoComplete="current-password"
        disabled={disabled}
        className="glass-password-input w-full pl-11 pr-11 py-3 text-white text-sm rounded-xl focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Show/Hide Toggle Button */}
      <button
        type="button"
        onClick={onToggleShowPassword}
        disabled={disabled}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}