import { setStatusBarHidden } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

// Lazy-load expo-navigation-bar so iOS bundles never touch it and a missing
// install on Android fails soft (the hook will simply be a no-op).
let NavigationBar = null;
if (Platform.OS === 'android') {
  try { NavigationBar = require('expo-navigation-bar'); } catch { /* ignored */ }
}

/**
 * Hides the Android system bars and keeps them hidden whenever the app
 * returns to the foreground.
 *
 * Uses "overlay-swipe" behavior so an edge swipe briefly reveals the bars
 * over the content (sticky immersive) — content never re-layouts.
 *
 * No-op on iOS.
 */
export function useAndroidImmersive() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const apply = async () => {
      try {
        setStatusBarHidden(true, 'none');
        if (NavigationBar) {
          // Sticky immersive: bars overlay (don't push) content on reveal,
          // then auto-hide after a moment.
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setVisibilityAsync('hidden');
        }
      } catch {
        // Best effort on unsupported devices / OS versions.
      }
    };

    apply();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') apply();
    });

    return () => sub.remove();
  }, []);
}
