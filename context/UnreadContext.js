// Global unread-messages counter for the Messages tab badge.
//
// The count refreshes on:
//   - sign-in / sign-out (user change)
//   - app returning to the foreground
//   - a push notification arriving while the app is open
//   - a 30s polling fallback (matches the app's existing polling style)
//   - explicit refreshUnread() calls (e.g. after a conversation is read)

import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import * as api from '../lib/api';
import { useAuth } from './AuthContext';

const UnreadContext = createContext({ unreadCount: 0, refreshUnread: () => {} });

export function UnreadProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!userId) { setUnreadCount(0); return; }
    try {
      setUnreadCount(await api.fetchUnreadMessagesCount());
    } catch { /* keep the previous count on transient errors */ }
  }, [userId]);

  // Initial fetch + reset on auth change.
  useEffect(() => { refreshUnread(); }, [refreshUnread]);

  // App comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshUnread();
    });
    return () => sub.remove();
  }, [refreshUnread]);

  // A push arrived while the app is open (likely a new message).
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => refreshUnread());
    return () => sub.remove();
  }, [refreshUnread]);

  // Polling fallback so the badge stays fresh even without pushes.
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [userId, refreshUnread]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => useContext(UnreadContext);
