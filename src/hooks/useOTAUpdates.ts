import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

/**
 * Minimum interval between OTA update checks (30 minutes).
 * Prevents excessive network requests when the app is frequently foregrounded.
 */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * useOTAUpdates
 *
 * Checks for over-the-air updates via Expo EAS Update.
 * - Checks on app mount and when the app returns to the foreground.
 * - Throttles checks to at most once every 30 minutes.
 * - Downloads updates in the background.
 * - Does NOT force-reload the app — updates apply on the next natural restart.
 * - Guards with __DEV__ so it's a no-op in development.
 * - Skips on web platform since expo-updates is native-only.
 *
 * This approach ensures:
 * - Users are never interrupted while writing journal entries.
 * - The app stays responsive — no blocking UI during update checks.
 * - Journal data (SQLite DB, SecureStore keys) is never affected by OTA updates.
 */
export function useOTAUpdates(): void {
  const lastCheckRef = useRef<number>(0);

  const checkForUpdate = useCallback(async () => {
    // Skip in development mode — expo-updates doesn't work in dev
    if (__DEV__) return;

    // Skip on web — expo-updates is native-only
    if (Platform.OS === 'web') return;

    // Throttle: skip if checked recently
    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL_MS) return;
    lastCheckRef.current = now;

    try {
      const Updates = await import('expo-updates');

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('[OTA] Update available, downloading in background...');

        await Updates.fetchUpdateAsync();

        console.log(
          '[OTA] Update downloaded. It will be applied on the next app restart.'
        );

        // NOTE: We intentionally do NOT call Updates.reloadAsync() here.
        // Reloading while the user is writing a journal entry could cause
        // data loss. The update will be applied naturally when the user
        // next opens the app.
      }
    } catch (error) {
      // Silently handle update errors — the app should continue working
      // even if update checks fail (e.g., no network, server issue).
      console.warn('[OTA] Update check failed:', error);
    }
  }, []);

  useEffect(() => {
    // Check on mount
    checkForUpdate();

    // Check when app returns to foreground
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkForUpdate();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [checkForUpdate]);
}

