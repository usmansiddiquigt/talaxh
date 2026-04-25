import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const AuthContext = createContext(null);

const STORAGE_KEY = '@talash_auth';
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const HEARTBEAT_INTERVAL_MS = 60_000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setUser(saved.user);
          setToken(saved.token);
        }
      } catch (_) {
        // ignore parse errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Presence: ping /me/heartbeat on sign-in, when app foregrounds, and every 60s
  const heartbeatTimer = useRef(null);
  useEffect(() => {
    if (!token) return;
    const beat = async () => {
      try {
        await fetch(`${API_URL}/me/heartbeat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    };
    beat();
    heartbeatTimer.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') beat(); });
    return () => {
      clearInterval(heartbeatTimer.current);
      sub.remove();
    };
  }, [token]);

  const signIn = async (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: userData, token: accessToken }),
    );
  };

  const signOut = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const updateUser = async (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: updated, token }),
    );
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
