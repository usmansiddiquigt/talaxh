import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const hydrate = useCallback(async (sess) => {
    if (!sess?.user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, is_admin')
      .eq('id', sess.user.id)
      .maybeSingle();

    // Hard gate: signed-in users without is_admin get bounced.
    if (!data?.is_admin) {
      setProfile(null);
      setAuthError('This account is not an administrator.');
      await supabase.auth.signOut();
      return;
    }

    setProfile(data);
    setAuthError(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(sess);
      await hydrate(sess);
      setLoading(false);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        await hydrate(sess);
      },
    );
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [hydrate]);

  const signIn = async (email, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const value = {
    session,
    user: session?.user || null,
    profile,
    isAdmin: !!profile?.is_admin,
    loading,
    authError,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
