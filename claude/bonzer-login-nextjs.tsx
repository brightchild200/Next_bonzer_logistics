// app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthBackground } from '@/components/auth/AuthBackground';

export const metadata = {
  title: 'Sign in - Bonzer Logistics',
  description: 'Operations portal login',
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#050d1a] via-[#0f1c2e] to-[#050d1a] overflow-hidden">
      <AuthBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-[420px]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
