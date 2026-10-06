

// app/(auth)/login/page.tsx
import { AnimatedBackground } from '@/components/auth/AnimatedBackground';
import { LoginForm } from '@/components/auth/LoginForm';


export const metadata = {
  title: 'Sign in - Bonzer Logistics',
  description: 'Operations portal login',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* ========================================================
          LEFT SIDE - ANIMATED BACKGROUND
          Hidden on mobile, visible on lg+ screens
          ======================================================== */}
      <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-[#050d1a] via-[#0f1c2e] to-[#051829]">
        <AnimatedBackground />

        {/* Optional: Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 pointer-events-none" />
      </div>

      {/* ========================================================
          RIGHT SIDE - LOGIN FORM
          Takes full width on mobile, half on desktop
          ======================================================== */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="w-full max-w-md">
          <LoginForm />

          {/* Optional: Branding at bottom on mobile */}
          <div className="lg:hidden mt-8 pt-8 border-t border-gray-200 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">🚚</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                Bonzer<span className="text-orange-500">.</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Logistics Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}