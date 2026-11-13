import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getRepositories } from '@/database';
import { AuthService } from '@/services/authService';

export function useSecurityLock() {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isLockEnabled, setIsLockEnabled] = useState<boolean>(false);
  const [isPinConfigured, setIsPinConfigured] = useState<boolean>(false);
  const [autoLockTimeoutMinutes, setAutoLockTimeoutMinutes] = useState<number>(5);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const lastActiveTimestamp = useRef<number>(Date.now());
  const isLockEnabledRef = useRef<boolean>(false);
  const timeoutMinutesRef = useRef<number>(5);

  isLockEnabledRef.current = isLockEnabled;
  timeoutMinutesRef.current = autoLockTimeoutMinutes;

  const refreshLockSettings = useCallback(async () => {
    try {
      const repos = await getRepositories();
      const settings = await repos.settings.getAllSettings();
      const hasPin = await AuthService.hasPin();

      const enabled = settings.biometricsEnabled || (settings.pinEnabled && hasPin);
      setIsLockEnabled(enabled);
      setIsPinConfigured(hasPin);
      setAutoLockTimeoutMinutes(settings.autoLockTimeoutMinutes);

      if (enabled) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.warn('[useSecurityLock] Error loading security settings:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshLockSettings();
  }, [refreshLockSettings]);

  // Monitor AppState for background/inactivity auto-lock
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastActiveTimestamp.current = Date.now();
      } else if (nextAppState === 'active') {
        if (!isLockEnabledRef.current) return;

        const timeoutMins = timeoutMinutesRef.current;
        if (timeoutMins < 0) {
          // Never auto-lock
          return;
        }

        const elapsedMs = Date.now() - lastActiveTimestamp.current;
        const timeoutMs = timeoutMins * 60 * 1000;

        if (elapsedMs >= timeoutMs) {
          setIsLocked(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    const success = await AuthService.promptBiometricAuth('Unlock your private Mindspace');
    if (success) {
      setIsLocked(false);
      lastActiveTimestamp.current = Date.now();
      return true;
    }
    return false;
  }, []);

  const unlockWithPin = useCallback(async (enteredPin: string): Promise<boolean> => {
    const valid = await AuthService.verifyPin(enteredPin);
    if (valid) {
      setIsLocked(false);
      lastActiveTimestamp.current = Date.now();
      return true;
    }
    return false;
  }, []);

  const lockImmediately = useCallback(() => {
    if (isLockEnabled) {
      setIsLocked(true);
    }
  }, [isLockEnabled]);

  return {
    isLocked,
    isLockEnabled,
    isPinConfigured,
    autoLockTimeoutMinutes,
    isCheckingAuth,
    unlockWithBiometrics,
    unlockWithPin,
    lockImmediately,
    refreshLockSettings,
  };
}

