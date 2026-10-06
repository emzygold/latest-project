import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  // Guests sign in anonymously; planners use email + password.
  isPlanner: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true, isPlanner: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const isPlanner = !!session && !session.user.is_anonymous;

  return <AuthContext.Provider value={{ session, loading, isPlanner }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
