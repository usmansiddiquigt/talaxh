import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = '@talash_auth';

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
