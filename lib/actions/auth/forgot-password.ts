'use server';

import { createClient } from '@/lib/db/server';

export type ForgotPasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const supabase = createClient();

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return { success: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: 'Valid email is required' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}