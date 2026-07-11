import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as api from '../lib/api';
import { unregisterPushToken } from '../lib/push';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const HEARTBEAT_INTERVAL_MS = 60_000;

function mapUser(authUser, profile) {
  if (!authUser) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    fullName:  profile?.full_name  || authUser.user_metadata?.full_name || '',
    avatarUrl: profile?.avatar_url || null,
    phone:     profile?.phone      || authUser.user_metadata?.phone || '',
    location:  profile?.location   || '',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate the user record (auth.user + profile row) from Supabase.
  const hydrateUser = useCallback(async (sess) => {
    if (!sess?.user) { setUser(null); return; }
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, phone, location')
      .eq('id', sess.user.id)
      .maybeSingle();
    setUser(mapUser(sess.user, profile));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(sess);
      await hydrateUser(sess);
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        await hydrateUser(sess);
      },
    );
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [hydrateUser]);

  // Presence heartbeat: update profiles.last_seen_at every minute and on foreground.
  const heartbeatTimer = useRef(null);
  useEffect(() => {
    if (!session?.user) return;
    const beat = () => { api.heartbeat().catch(() => {}); };
    beat();
    heartbeatTimer.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') beat(); });
    return () => { clearInterval(heartbeatTimer.current); sub.remove(); };
  }, [session?.user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // `signIn` is now a passthrough to refresh local state right after login.
  // Screens can still call it for parity with the old API, but the
  // onAuthStateChange listener above also handles state updates.
  const signIn = async (userData /*, accessToken */) => {
    if (userData) setUser(userData);
  };

  const signOut = async () => {
    // Remove this device's push token before signing out so pushes don't
    // continue to land on a phone that's no longer "this user".
    try { await unregisterPushToken(); } catch { /* best-effort */ }
    await api.logout();
    setUser(null);
    setSession(null);
  };

  const updateUser = async (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  // Token getter for any legacy screen that still wants it.
  const token = session?.access_token || null;

  return (
    <AuthContext.Provider value={{ user, token, session, loading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
