import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  awaitingOtp: boolean;
  pendingEmail: string | null;
  signUp: (email: string, password: string, userData?: Record<string, string>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upsertProfile = async (authUser: SupabaseUser) => {
    await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name ?? '',
        phone: authUser.user_metadata?.phone ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: userData ?? {} },
      });
      if (err) throw err;
      setAwaitingOtp(true);
      setPendingEmail(email);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign up failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      if (data.user) await upsertProfile(data.user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (err) throw err;
      if (data.user) await upsertProfile(data.user);
      setAwaitingOtp(false);
      setPendingEmail(null);
      setSession(data.session);
      setUser(data.user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OTP verification failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resend({ type: 'signup', email });
      if (err) throw err;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to resend OTP';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signOut();
      if (err) throw err;
      setUser(null);
      setSession(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign out failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, awaitingOtp, pendingEmail,
        signUp, signIn, verifyOtp, resendOtp, signOut,
        error, clearError: () => setError(null),
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}