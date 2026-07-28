'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Loader2,
  Github,
  Chrome,
  Check,
} from 'lucide-react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { signup } from '@/lib/actions/auth/signup';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company: '',
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirm: '',
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const passwordChecks = [
    { label: 'At least 8 characters', ok: form.password.length >= 8 },
    { label: 'Contains a number', ok: /\d/.test(form.password) },
    { label: 'Passwords match', ok: form.password === form.confirm && form.password.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (!form.terms) {
      toast.error('Please accept the Terms & Conditions');
      return;
    }
    setLoading(true);

    const result = await signup({
      company_name: form.company,
      full_name: form.name,
      email: form.email,
      phone: form.mobile,
      password: form.password,
    });

    setLoading(false);

    if (result.success) {
      toast.success('Account created! Welcome to Bonzer.');
      router.push('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start managing your logistics operations in minutes."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="company"
              placeholder="Acme Logistics"
              className="pl-9"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                placeholder="John Doe"
                className="pl-9"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="mobile"
                placeholder="+1 555 0000"
                className="pl-9"
                value={form.mobile}
                onChange={(e) => set('mobile', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-9"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pl-9 pr-9"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pl-9"
                value={form.confirm}
                onChange={(e) => set('confirm', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Password strength */}
        {form.password.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {passwordChecks.map((c) => (
              <span
                key={c.label}
                className={`flex items-center gap-1 text-[11px] ${
                  c.ok ? 'text-success' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                    c.ok ? 'bg-success/15' : 'bg-muted'
                  }`}
                >
                  {c.ok && <Check className="h-2.5 w-2.5" />}
                </span>
                {c.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            checked={form.terms}
            onCheckedChange={(v) => set('terms', v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
            I agree to the{' '}
            <Link href="#" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>

        <div className="relative py-2">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
            or sign up with
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" disabled>
            <Github className="mr-2 h-4 w-4" /> GitHub
          </Button>
          <Button type="button" variant="outline" disabled>
            <Chrome className="mr-2 h-4 w-4" /> Google
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}