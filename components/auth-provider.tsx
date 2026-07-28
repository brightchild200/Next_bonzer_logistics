'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/db/client';
import type { Permission, Role } from '@/lib/auth/permissions';
import {
  IDLE_SESSION_ACTIVITY_EVENTS,
  IDLE_SESSION_TIMEOUT_MS,
} from '@/lib/auth/session-timeout';

const supabase = createClient();

type Profile = {
  id: string;
  full_name: string;
  employee_code: string | null;
  phone: string | null;
  is_active: boolean;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  hasRole: (role: Role) => boolean;
  can: (permission: Permission) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const idleDeadlineRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const isSigningOutRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const isRefreshingSessionRef = useRef(false);
  const lastSessionRefreshRef = useRef(0);
  const SESSION_REFRESH_THROTTLE_MS = 60 * 1000;

  const clearIdleTimer = () => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const scheduleIdleTimeout = (delayMs: number) => {
    clearIdleTimer();

    idleDeadlineRef.current = Date.now() + delayMs;
    idleTimerRef.current = window.setTimeout(() => {
      void handleIdleTimeout();
    }, delayMs);
  };

  const resetIdleTimer = () => {
    if (!isVisibleRef.current || !userRef.current || isSigningOutRef.current) {
      return;
    }

    scheduleIdleTimeout(IDLE_SESSION_TIMEOUT_MS);
  };

  const shouldRefreshSession = () => {
    return (
      Date.now() - lastSessionRefreshRef.current >= SESSION_REFRESH_THROTTLE_MS
    );
  };

  const renewSessionAndResetTimer = async () => {
    if (
      !isVisibleRef.current ||
      !userRef.current ||
      isSigningOutRef.current
    ) {
      return;
    }

    resetIdleTimer();

    if (isRefreshingSessionRef.current || !shouldRefreshSession()) {
      return;
    }

    isRefreshingSessionRef.current = true;

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh failed:', error);
        return;
      }

      lastSessionRefreshRef.current = Date.now();

      if (data.session?.user) {
        userRef.current = data.session.user;
      }
    } finally {
      isRefreshingSessionRef.current = false;
    }
  };

  async function handleIdleTimeout() {
    if (isSigningOutRef.current) {
      return;
    }

    isSigningOutRef.current = true;
    clearIdleTimer();

    setUser(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Idle session sign out failed:', error);
    }

    router.replace('/login');
    router.refresh();
    isSigningOutRef.current = false;
  }

  async function loadAuthContext(currentUser: User | null) {
    setUser(currentUser);
    userRef.current = currentUser;

    if (!currentUser) {
      setProfile(null);
      setRoles([]);
      setPermissions([]);
      clearIdleTimer();
      idleDeadlineRef.current = null;
      pausedRemainingRef.current = null;
      lastSessionRefreshRef.current = 0;
      return;
    }

    const { data, error } = await supabase.rpc('get_my_auth_context');

    if (error) {
      console.error('Failed to load auth context:', error);

      setProfile(null);
      setRoles([]);
      setPermissions([]);

      return;
    }

    // Single boundary cast: Supabase returns string[], we cast to typed arrays
    setProfile(data?.profile ?? null);
    setRoles((data?.roles ?? []) as Role[]);
    setPermissions((data?.permissions ?? []) as Permission[]);

    if (isVisibleRef.current) {
      scheduleIdleTimeout(IDLE_SESSION_TIMEOUT_MS);
    }
  }

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      await loadAuthContext(session?.user ?? null);

      if (active) {
        setLoading(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () => {
        if (!active) return;

        setLoading(true);

        await loadAuthContext(session?.user ?? null);

        if (active) {
          setLoading(false);
        }
      }, 0);
    });

    const handleActivity = () => {
      void renewSessionAndResetTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isVisibleRef.current = false;
        pausedRemainingRef.current =
          idleDeadlineRef.current !== null
            ? Math.max(idleDeadlineRef.current - Date.now(), 0)
            : null;
        clearIdleTimer();
        return;
      }

      isVisibleRef.current = true;
      if (!userRef.current) {
        return;
      }

      const remaining =
        pausedRemainingRef.current ?? IDLE_SESSION_TIMEOUT_MS;
      pausedRemainingRef.current = null;
      scheduleIdleTimeout(remaining);
    };

    IDLE_SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (document.visibilityState === 'hidden') {
      isVisibleRef.current = false;
    } else {
      resetIdleTimer();
    }

    return () => {
      active = false;
      subscription.unsubscribe();
      clearIdleTimer();
      IDLE_SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const hasRole = (role: Role): boolean => {
    return roles.includes(role);
  };

  const can = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
  
    if (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  
    setUser(null);
    userRef.current = null;
    setProfile(null);
    setRoles([]);
    setPermissions([]);
    clearIdleTimer();
    idleDeadlineRef.current = null;
    pausedRemainingRef.current = null;
    lastSessionRefreshRef.current = 0;
  
    router.replace('/login');
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        permissions,
        loading,
        hasRole,
        can,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
